const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt' });

  try {
    const { transcript, summaryType } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Kein Transkript übergeben' });

    const MAX_LEN = 30000;
    const trimmed = transcript.length > MAX_LEN
      ? transcript.substring(0, MAX_LEN) + '\n\n[... gekürzt ...]'
      : transcript;

    let prompt, maxTokens;

    if (summaryType === 'short') {
      prompt = `Fasse dieses YouTube-Video in 3-4 Sätzen zusammen. Maximal 500 Zeichen. Kein Markdown.\n\n${trimmed}`;
      maxTokens = 300;
    } else {
      prompt = `Fasse dieses YouTube-Video strukturiert zusammen (max 1800 Zeichen, 4 Absätze):\n1. Hauptthema\n2. Kernpunkte\n3. Praktische Erkenntnisse\n4. Fazit\n\nKein Markdown, nur Fließtext mit Absätzen.\n\n${trimmed}`;
      maxTokens = 1000;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.5
    });

    res.status(200).json({ summary: completion.choices[0].message.content });

  } catch (err) {
    console.error('OpenAI Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
