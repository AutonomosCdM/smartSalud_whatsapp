import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Content Template SIDs (se crean una vez y se reusan)
let reminderTemplateSid: string | null = null;

interface QuickReplyButton {
  id: string;
  title: string;
}

interface ContentTemplate {
  sid: string;
  friendlyName: string;
}

/**
 * Crear Content Template con Quick Reply buttons
 */
export async function createQuickReplyTemplate(
  friendlyName: string,
  bodyText: string,
  buttons: QuickReplyButton[],
  variables?: Record<string, string>
): Promise<ContentTemplate> {
  try {
    // TypeScript types for Twilio Content API are incomplete, use any cast
    const content = await (client.content.v1.contents.create as any)({
      friendlyName,
      language: 'es',
      variables: variables || {},
      types: {
        'twilio/quick-reply': {
          body: bodyText,
          actions: buttons,
        },
      },
    });

    console.log(`[Twilio] Template created: ${content.sid} (${friendlyName})`);
    return { sid: content.sid, friendlyName };
  } catch (error: any) {
    console.error(`[Twilio] Error creating template:`, error.message);
    throw error;
  }
}

/**
 * Obtener o crear template de recordatorio con botones
 */
export async function getOrCreateReminderTemplate(): Promise<string> {
  if (reminderTemplateSid) {
    return reminderTemplateSid;
  }

  // Buscar template existente
  try {
    const templates = await (client.content.v1.contents.list as any)({ limit: 50 });
    const existing = templates.find((t: any) => t.friendlyName === 'smartsalud_reminder_v1');

    if (existing) {
      reminderTemplateSid = existing.sid;
      console.log(`[Twilio] Using existing template: ${reminderTemplateSid}`);
      return reminderTemplateSid!;
    }
  } catch (error) {
    console.log('[Twilio] Could not list templates, creating new one');
  }

  // Crear nuevo template
  const template = await createQuickReplyTemplate(
    'smartsalud_reminder_v1',
    '🏥 *Recordatorio de Cita - CESFAM*\n\nHola {{1}}!\n\nTienes una cita agendada:\n📅 {{2}}\n👨‍⚕️ {{3}}\n🏥 {{4}}\n\n¿Qué deseas hacer?',
    [
      { id: 'confirm', title: '✅ Confirmar' },
      { id: 'reschedule', title: '📅 Reagendar' },
      { id: 'cancel', title: '❌ Cancelar' },
    ],
    { '1': 'Paciente', '2': 'Fecha', '3': 'Doctor', '4': 'Especialidad' }
  );

  reminderTemplateSid = template.sid;
  return reminderTemplateSid;
}

/**
 * Crear template dinámico para selección de slots
 */
export async function createSlotSelectionTemplate(
  slot1Text: string,
  slot2Text: string
): Promise<string> {
  const uniqueName = `smartsalud_slots_${Date.now()}`;

  const template = await createQuickReplyTemplate(
    uniqueName,
    '📅 *Horarios Disponibles*\n\nSelecciona tu nueva cita:',
    [
      { id: 'slot_1', title: slot1Text.substring(0, 20) },
      { id: 'slot_2', title: slot2Text.substring(0, 20) },
    ]
  );

  return template.sid;
}

/**
 * Enviar mensaje WhatsApp con Content Template (botones)
 */
export async function sendWhatsAppWithButtons(
  to: string,
  contentSid: string,
  variables?: Record<string, string>
): Promise<string> {
  const params: any = {
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    contentSid,
  };

  if (variables) {
    params.contentVariables = JSON.stringify(variables);
  }

  const result = await client.messages.create(params);
  console.log(`[Twilio] Message sent with buttons: ${result.sid}`);
  return result.sid;
}

/**
 * Enviar mensaje WhatsApp simple (texto)
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<string> {
  const result = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body: message,
  });

  return result.sid;
}

/**
 * Enviar recordatorio con botones
 */
export async function sendReminderWithButtons(
  to: string,
  patientName: string,
  dateTime: string,
  doctor: string,
  specialty: string
): Promise<string> {
  const templateSid = await getOrCreateReminderTemplate();

  return sendWhatsAppWithButtons(to, templateSid, {
    '1': patientName,
    '2': dateTime,
    '3': doctor,
    '4': specialty,
  });
}
