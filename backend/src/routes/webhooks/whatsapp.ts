import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import { detectIntent } from '../../services/groqService';

const router = Router();
const prisma = new PrismaClient();

const validateTwilioSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body;

  const authToken = process.env.TWILIO_AUTH_TOKEN || '';

  if (!twilio.validateRequest(authToken, signature, url, params)) {
    return res.status(401).json({ error: 'Invalid Twilio signature' });
  }

  next();
};

router.post('/', validateTwilioSignature, async (req, res) => {
  try {
    const { From, Body } = req.body;

    // Extract phone number (remove whatsapp: prefix)
    const phone = From.replace('whatsapp:', '');

    // Detect intent
    const intent = await detectIntent(Body);

    // Store conversation
    await prisma.conversation.create({
      data: {
        phone,
        step: 'INTENT_DETECTED',
        conversationData: {
          messageHistory: [{
            role: 'user',
            content: Body,
            timestamp: new Date().toISOString(),
          }],
          detectedIntent: intent,
        },
      },
    });

    // Handle intents
    let response = '¡Gracias por tu mensaje! 🏥';

    if (intent === 'CONFIRM' || Body.toLowerCase().includes('sí') || Body.toLowerCase().includes('si')) {
      // Find appointment by phone
      const patient = await prisma.patient.findFirst({ where: { phone } });
      if (patient) {
        const appointment = await prisma.appointment.findFirst({
          where: {
            patientId: patient.id,
            status: 'AGENDADO',
          },
          orderBy: { appointmentDate: 'asc' },
        });

        if (appointment) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CONFIRMADO', statusUpdatedAt: new Date() },
          });
          response = '✅ Tu cita ha sido confirmada. ¡Nos vemos pronto!';
        }
      }
    } else if (intent === 'CANCEL' || Body.toLowerCase().includes('no') || Body.toLowerCase().includes('cancelar')) {
      const patient = await prisma.patient.findFirst({ where: { phone } });
      if (patient) {
        const appointment = await prisma.appointment.findFirst({
          where: {
            patientId: patient.id,
            status: 'AGENDADO',
          },
          orderBy: { appointmentDate: 'asc' },
        });

        if (appointment) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CANCELADO', statusUpdatedAt: new Date() },
          });
          response = '❌ Tu cita ha sido cancelada.';
        }
      }
    }

    // Return TwiML
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(response);

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    // Return 200 even on error (Twilio retries otherwise)
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Lo sentimos, ocurrió un error. Intenta nuevamente.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

export default router;
