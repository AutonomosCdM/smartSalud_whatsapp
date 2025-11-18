import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function detectIntent(message: string): Promise<'CONFIRM' | 'CANCEL' | 'CHANGE_APPOINTMENT' | 'UNKNOWN'> {
  try {
    const prompt = `Clasifica el siguiente mensaje de WhatsApp en una de estas categorías: CONFIRM, CANCEL, CHANGE_APPOINTMENT, UNKNOWN.

Mensaje: "${message}"

Responde SOLO con la categoría (una palabra).`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const response = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'UNKNOWN';

    if (['CONFIRM', 'CANCEL', 'CHANGE_APPOINTMENT'].includes(response)) {
      return response as 'CONFIRM' | 'CANCEL' | 'CHANGE_APPOINTMENT';
    }

    return 'UNKNOWN';
  } catch (error) {
    console.error('Groq intent detection error:', error);
    return 'UNKNOWN';
  }
}
