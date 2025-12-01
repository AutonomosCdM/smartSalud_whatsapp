import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import {
  sendReminderWithButtons,
  sendWhatsAppMessage,
  sendWhatsAppWithButtons,
  createQuickReplyTemplate,
} from '../../services/twilioService';

const router = Router();
const prisma = new PrismaClient();

// Validar firma de Twilio
const validateTwilioSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body;
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';

  // Skip validation in development (ngrok URL mismatch causes signature failure)
  if (process.env.NODE_ENV === 'development') {
    console.log('[WhatsApp] Skipping signature validation in development');
    return next();
  }

  if (!twilio.validateRequest(authToken, signature, url, params)) {
    console.error('[WhatsApp] Invalid Twilio signature');
    return res.status(401).json({ error: 'Invalid Twilio signature' });
  }

  next();
};

// Formatear fecha para mensaje (completo)
function formatDateForMessage(date: Date): string {
  const weekday = date.toLocaleDateString('es-CL', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('es-CL', { month: 'long' });
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const minutesStr = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ':00';

  return `${weekday} ${day} de ${month} a las ${hour12}${minutesStr} ${period}`;
}

// Formatear fecha corta para botones (max 20 chars)
function formatShortDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString('es-CL', { month: 'short' });
  const hour = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${hour}:${minutes}`;
}

// Obtener slots disponibles
async function getAvailableSlots(specialty?: string | null) {
  const slotPatient = await prisma.patient.findFirst({
    where: { name: 'SLOT DISPONIBLE' }
  });

  if (!slotPatient) return [];

  const now = new Date();
  return prisma.appointment.findMany({
    where: {
      patientId: slotPatient.id,
      status: 'AGENDADO',
      appointmentDate: { gte: now },
      ...(specialty && { specialty })
    },
    orderBy: { appointmentDate: 'asc' },
    take: 2
  });
}

// Normalizar teléfono (asegurar formato +56XXXXXXXXX)
function normalizePhone(rawPhone: string): string {
  // Remover prefijo whatsapp: y espacios
  let phone = rawPhone.replace('whatsapp:', '').trim();

  // Asegurar que empiece con +
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  return phone;
}

// Webhook principal
router.post('/', validateTwilioSignature, async (req, res) => {
  try {
    const { From, Body, ButtonText, ButtonPayload } = req.body;
    const phone = normalizePhone(From);

    // Priorizar ButtonPayload (respuesta de botón) sobre Body
    const buttonId = ButtonPayload?.toLowerCase() || '';
    const message = ButtonText?.trim().toLowerCase() || Body?.trim().toLowerCase() || '';

    console.log(`[WhatsApp] Mensaje de ${phone}: "${Body}" | Button: ${ButtonPayload || 'none'}`);

    // Si es respuesta de botón, mapear a comandos
    let normalizedMessage = message;
    if (buttonId === 'confirm' || buttonId === 'slot_1' || buttonId === 'slot_2') {
      normalizedMessage = buttonId === 'confirm' ? 'si' : buttonId === 'slot_1' ? '1' : '2';
    } else if (buttonId === 'reschedule') {
      normalizedMessage = 'no';
    } else if (buttonId === 'cancel') {
      normalizedMessage = 'cancelar';
    }

    // Buscar paciente por teléfono
    const patient = await prisma.patient.findFirst({ where: { phone } });

    if (!patient) {
      console.log(`[WhatsApp] Paciente no encontrado: ${phone}`);
      return sendResponse(res, 'No encontramos tu número en nuestro sistema. Por favor contacta al CESFAM.');
    }

    // Buscar conversación activa
    let conversation = await prisma.conversation.findFirst({
      where: {
        phone,
        step: { not: 'COMPLETED' }
      },
      orderBy: { createdAt: 'desc' }
    });

    // CAMBIO 2: Obtener appointmentId de la conversación si existe
    let appointmentId: string | undefined;
    if (conversation && conversation.conversationData) {
      const convData = conversation.conversationData as any;
      appointmentId = convData.appointmentId;
    }

    // Buscar la cita ESPECÍFICA del contexto
    let appointment = null;
    if (appointmentId) {
      appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      // Verificar que pertenece al paciente
      if (appointment && appointment.patientId !== patient.id) {
        appointment = null;
      }
    }

    // Fallback: si no hay contexto, buscar AGENDADO
    if (!appointment) {
      appointment = await prisma.appointment.findFirst({
        where: {
          patientId: patient.id,
          appointmentDate: { gte: new Date() },
          status: 'AGENDADO'
        },
        orderBy: { appointmentDate: 'asc' }
      });
    }

    // Si aún no hay, buscar cualquier cita futura para info
    if (!appointment) {
      appointment = await prisma.appointment.findFirst({
        where: {
          patientId: patient.id,
          appointmentDate: { gte: new Date() }
        },
        orderBy: { appointmentDate: 'asc' }
      });
    }

    // Si no hay conversación activa, manejar respuesta inicial
    if (!conversation) {
      if (!appointment) {
        return sendResponse(res, 'No tienes citas pendientes. Si necesitas agendar una cita, contacta al CESFAM.');
      }

      // Respuesta inicial: SI, NO, CANCELAR
      return await handleInitialResponse(res, normalizedMessage, patient, appointment);
    }

    // Si hay conversación esperando selección de slot
    if (conversation.step === 'WAITING_SLOT_SELECTION') {
      return await handleSlotSelection(res, normalizedMessage, patient, appointment, conversation);
    }

    // Fallback: manejar como respuesta inicial
    if (appointment) {
      return await handleInitialResponse(res, normalizedMessage, patient, appointment);
    }

    return sendResponse(res, 'No entendí tu mensaje. Responde SI para confirmar, NO para reagendar, o CANCELAR.');

  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return sendResponse(res, 'Ocurrió un error. Por favor intenta nuevamente o contacta al CESFAM.');
  }
});

// Manejar respuesta inicial (SI/NO/CANCELAR)
async function handleInitialResponse(
  res: any,
  message: string,
  patient: any,
  appointment: any
) {
  const appointmentDate = formatDateForMessage(new Date(appointment.appointmentDate));

  // VALIDACIÓN: Si la cita ya fue procesada, no permitir más acciones
  if (appointment.status !== 'AGENDADO') {
    const statusMessages: Record<string, string> = {
      CONFIRMADO: `✅ Tu cita ya está confirmada.\n\n📅 ${appointmentDate}\n🏥 ${appointment.specialty || 'Consulta'}\n\n¡Te esperamos! Recuerda llegar 15 minutos antes.`,
      CANCELADO: `❌ Tu cita fue cancelada.\n\nSi necesitas agendar una nueva cita, contacta al CESFAM.\n📞 Teléfono: (2) 2XXX XXXX`,
      REAGENDADO: `📅 Tu cita ya fue reagendada.\n\nSi necesitas más cambios, contacta al CESFAM.\n📞 Teléfono: (2) 2XXX XXXX`
    };

    console.log(`[WhatsApp] Cita ${appointment.id} ya procesada (${appointment.status}), ignorando acción`);
    return sendResponse(res, statusMessages[appointment.status] || 'Tu cita ya fue procesada.');
  }

  // SI - Confirmar cita
  if (message === 'si' || message === 'sí' || message === '1' || message.includes('confirmo') || message.includes('confirmar')) {
    // CAMBIO 3: Completar la conversación
    const activeConv = await prisma.conversation.findFirst({
      where: {
        phone: patient.phone,
        step: { not: 'COMPLETED' }
      }
    });
    if (activeConv) {
      await prisma.conversation.update({
        where: { id: activeConv.id },
        data: { step: 'COMPLETED', completedAt: new Date() }
      });
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CONFIRMADO',
        statusUpdatedAt: new Date()
      }
    });

    await logStateChange(appointment.id, 'AGENDADO', 'CONFIRMADO', 'WHATSAPP', 'Confirmado por paciente vía WhatsApp');

    console.log(`[WhatsApp] Cita ${appointment.id} CONFIRMADA`);

    return sendResponse(res,
      `✅ *Cita Confirmada*\n\n` +
      `Paciente: ${patient.name}\n` +
      `Fecha: ${appointmentDate}\n` +
      `Especialidad: ${appointment.specialty || 'Consulta'}\n\n` +
      `¡Te esperamos! Recuerda llegar 15 minutos antes.`
    );
  }

  // CANCELAR - Cancelar cita
  if (message === 'cancelar' || message === 'cancelo' || message.includes('cancelar')) {
    // CAMBIO 3: Completar la conversación
    const activeConv = await prisma.conversation.findFirst({
      where: {
        phone: patient.phone,
        step: { not: 'COMPLETED' }
      }
    });
    if (activeConv) {
      await prisma.conversation.update({
        where: { id: activeConv.id },
        data: { step: 'COMPLETED', completedAt: new Date() }
      });
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELADO',
        statusUpdatedAt: new Date()
      }
    });

    await logStateChange(appointment.id, 'AGENDADO', 'CANCELADO', 'WHATSAPP', 'Cancelado por paciente vía WhatsApp');

    console.log(`[WhatsApp] Cita ${appointment.id} CANCELADA`);

    return sendResponse(res,
      `❌ *Cita Cancelada*\n\n` +
      `Tu cita del ${appointmentDate} ha sido cancelada.\n\n` +
      `Si necesitas reagendar, contacta al CESFAM.`
    );
  }

  // NO - Mostrar alternativas para reagendar
  if (message === 'no' || message === '2' || message.includes('reagendar') || message.includes('cambiar')) {
    const slots = await getAvailableSlots(appointment.specialty);

    if (slots.length === 0) {
      return sendResponse(res,
        `No hay horarios disponibles en este momento.\n\n` +
        `Por favor contacta al CESFAM para reagendar tu cita.\n` +
        `📞 Teléfono: (2) 2XXX XXXX`
      );
    }

    // Crear conversación esperando selección
    await prisma.conversation.create({
      data: {
        phone: patient.phone,
        patientId: patient.id,
        step: 'WAITING_SLOT_SELECTION',
        conversationData: {
          appointmentId: appointment.id,
          availableSlots: slots.map(s => ({ id: s.id, date: s.appointmentDate }))
        }
      }
    });

    const slot1Date = formatDateForMessage(new Date(slots[0].appointmentDate));
    const slot2Date = slots[1] ? formatDateForMessage(new Date(slots[1].appointmentDate)) : null;

    // Crear texto corto para botones (max 20 chars)
    const slot1Short = formatShortDate(new Date(slots[0].appointmentDate));
    const slot2Short = slots[1] ? formatShortDate(new Date(slots[1].appointmentDate)) : null;

    console.log(`[WhatsApp] Mostrando ${slots.length} slots a ${patient.name}`);

    // Intentar enviar con botones, fallback a texto
    try {
      const buttons = [
        { id: 'slot_1', title: slot1Short },
      ];
      if (slot2Short) {
        buttons.push({ id: 'slot_2', title: slot2Short });
      }

      const template = await createQuickReplyTemplate(
        `smartsalud_slots_${Date.now()}`,
        '📅 *Horarios Disponibles*\n\nSelecciona tu nueva cita:',
        buttons
      );

      await sendWhatsAppWithButtons(patient.phone, template.sid);

      // Enviar respuesta vacía (el mensaje ya se envió)
      return sendEmptyResponse(res);
    } catch (buttonError) {
      console.warn('[WhatsApp] Error enviando slots con botones, usando texto');

      let responseMsg = `📅 *Horarios Disponibles*\n\n`;
      responseMsg += `*1.* ${slot1Date}\n`;
      if (slot2Date) {
        responseMsg += `*2.* ${slot2Date}\n`;
      }
      responseMsg += `\nResponde *1* o *2* para seleccionar, o *CANCELAR* para cancelar tu cita.`;

      return sendResponse(res, responseMsg);
    }
  }

  // No entendido - mostrar opciones
  return sendResponse(res,
    `Hola ${patient.name.split(' ')[0]}! 👋\n\n` +
    `Tienes una cita agendada:\n` +
    `📅 ${appointmentDate}\n` +
    `🏥 ${appointment.specialty || 'Consulta'}\n\n` +
    `Responde:\n` +
    `• *SI* para confirmar\n` +
    `• *NO* para reagendar\n` +
    `• *CANCELAR* para cancelar`
  );
}

// Manejar selección de slot
async function handleSlotSelection(
  res: any,
  message: string,
  patient: any,
  appointment: any,
  conversation: any
) {
  const convData = conversation.conversationData as any;
  const slots = convData?.availableSlots || [];

  // CANCELAR durante selección
  if (message === 'cancelar' || message.includes('cancelar')) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { step: 'COMPLETED' }
    });

    if (appointment) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELADO',
          statusUpdatedAt: new Date()
        }
      });

      await logStateChange(appointment.id, 'AGENDADO', 'CANCELADO', 'WHATSAPP', 'Cancelado por paciente vía WhatsApp');
    }

    return sendResponse(res, `❌ Tu cita ha sido cancelada.`);
  }

  // Selección de slot
  const selection = parseInt(message);

  if ((selection === 1 || selection === 2) && slots[selection - 1]) {
    const selectedSlot = slots[selection - 1];

    // Obtener el slot real de la base de datos
    const slotAppointment = await prisma.appointment.findUnique({
      where: { id: selectedSlot.id }
    });

    if (!slotAppointment || slotAppointment.status !== 'AGENDADO') {
      return sendResponse(res, 'Este horario ya no está disponible. Por favor contacta al CESFAM.');
    }

    // Realizar reagendamiento en transacción
    await prisma.$transaction(async (tx) => {
      // Marcar cita original como REAGENDADO
      if (appointment) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'REAGENDADO',
            statusUpdatedAt: new Date()
          }
        });
      }

      // Asignar slot al paciente
      await tx.appointment.update({
        where: { id: selectedSlot.id },
        data: {
          patientId: patient.id,
          specialty: appointment?.specialty,
          doctorName: appointment?.doctorName,
          rescheduledFromId: appointment?.id
        }
      });

      // Completar conversación
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { step: 'COMPLETED' }
      });
    });

    await logStateChange(
      appointment?.id || selectedSlot.id,
      'AGENDADO',
      'REAGENDADO',
      'WHATSAPP',
      `Reagendado por paciente vía WhatsApp a ${selectedSlot.date}`
    );

    const newDate = formatDateForMessage(new Date(selectedSlot.date));

    console.log(`[WhatsApp] Cita reagendada para ${patient.name}: ${newDate}`);

    return sendResponse(res,
      `✅ *Cita Reagendada*\n\n` +
      `Tu nueva cita:\n` +
      `📅 ${newDate}\n` +
      `🏥 ${appointment?.specialty || 'Consulta'}\n\n` +
      `¡Te esperamos! Recuerda llegar 15 minutos antes.`
    );
  }

  // Opción inválida
  return sendResponse(res,
    `Por favor responde:\n` +
    `• *1* para el primer horario\n` +
    `• *2* para el segundo horario\n` +
    `• *CANCELAR* para cancelar tu cita`
  );
}

// Registrar cambio de estado
async function logStateChange(
  appointmentId: string,
  fromStatus: string,
  toStatus: string,
  changedBy: string,
  reason: string
) {
  try {
    await prisma.appointmentStateChange.create({
      data: {
        appointmentId,
        fromStatus: fromStatus as any,
        toStatus: toStatus as any,
        changedBy,
        reason
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Error logging state change:', error);
  }
}

// Enviar respuesta TwiML con mensaje
function sendResponse(res: any, message: string) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  res.type('text/xml');
  res.send(twiml.toString());
}

// Enviar respuesta TwiML vacía (cuando ya enviamos mensaje vía API)
function sendEmptyResponse(res: any) {
  const twiml = new twilio.twiml.MessagingResponse();
  res.type('text/xml');
  res.send(twiml.toString());
}

// Endpoint para enviar mensaje inicial con botones (usado por el sistema)
router.post('/send-reminder', async (req, res): Promise<void> => {
  try {
    const { appointmentId, useButtons = true } = req.body;

    if (!appointmentId) {
      res.status(400).json({ error: 'appointmentId requerido' });
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true }
    });

    if (!appointment || !appointment.patient) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    const appointmentDate = formatDateForMessage(new Date(appointment.appointmentDate));

    // Cerrar conversaciones existentes para limpiar estado previo
    const existingConv = await prisma.conversation.findFirst({
      where: {
        phone: appointment.patient.phone,
        step: { not: 'COMPLETED' }
      }
    });

    if (existingConv) {
      await prisma.conversation.update({
        where: { id: existingConv.id },
        data: { step: 'COMPLETED', completedAt: new Date() }
      });
    }

    // NO crear conversación aquí - se crea solo cuando usuario elige "Reagendar"
    // appointmentId se obtiene del fallback (línea 153-162) buscando cita AGENDADO del paciente

    let messageSid: string;

    if (useButtons) {
      // Enviar con botones interactivos
      try {
        messageSid = await sendReminderWithButtons(
          appointment.patient.phone,
          appointment.patient.name.split(' ')[0],
          appointmentDate,
          appointment.doctorName || 'Profesional de salud',
          appointment.specialty || 'Consulta'
        );
        console.log(`[WhatsApp] Recordatorio con botones enviado: ${messageSid}`);
      } catch (buttonError: any) {
        console.warn(`[WhatsApp] Error con botones, usando texto: ${buttonError.message}`);
        // Fallback a mensaje de texto
        messageSid = await sendWhatsAppMessage(
          appointment.patient.phone,
          `🏥 *Recordatorio de Cita - CESFAM*\n\n` +
          `Hola ${appointment.patient.name.split(' ')[0]}!\n\n` +
          `Tienes una cita agendada:\n` +
          `📅 ${appointmentDate}\n` +
          `👨‍⚕️ ${appointment.doctorName || 'Profesional de salud'}\n` +
          `🏥 ${appointment.specialty || 'Consulta'}\n\n` +
          `Responde:\n` +
          `• *SI* para confirmar\n` +
          `• *NO* para reagendar\n` +
          `• *CANCELAR* para cancelar`
        );
      }
    } else {
      // Enviar mensaje de texto simple
      messageSid = await sendWhatsAppMessage(
        appointment.patient.phone,
        `🏥 *Recordatorio de Cita - CESFAM*\n\n` +
        `Hola ${appointment.patient.name.split(' ')[0]}!\n\n` +
        `Tienes una cita agendada:\n` +
        `📅 ${appointmentDate}\n` +
        `👨‍⚕️ ${appointment.doctorName || 'Profesional de salud'}\n` +
        `🏥 ${appointment.specialty || 'Consulta'}\n\n` +
        `Responde:\n` +
        `• *SI* para confirmar\n` +
        `• *NO* para reagendar\n` +
        `• *CANCELAR* para cancelar`
      );
    }

    console.log(`[WhatsApp] Recordatorio enviado a ${appointment.patient.phone}: ${messageSid}`);

    res.json({
      success: true,
      messageSid,
      phone: appointment.patient.phone,
      withButtons: useButtons
    });

  } catch (error: any) {
    console.error('[WhatsApp] Error enviando recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
