const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt' });
  if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const { transcript, summaryType } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Kein Transkript übergeben' });

    const MAX_LEN = 30000;
    const trimmed = transcript.length > MAX_LEN
      ? transcript.substring(0, MAX_LEN) + '\n\n[... gekürzt ...]'
      : transcript;

    let prompt, maxTokens;

    if (summaryType === 'short') {
      prompt = `Du bist Experte für präzise Zusammenfassungen. Fasse dieses YouTube-Video in maximal 3-4 Sätzen zusammen:

WICHTIG: Halte die Zusammenfassung unter 500 Zeichen. Sei extrem prägnant aber informativ.

Fokussiere auf:
- Das Hauptthema in einem Satz
- Die 2-3 wichtigsten Erkenntnisse
- Eine kurze Schlussfolgerung

Formatiere als einfachen Text ohne Markdown:\n${trimmed}`;
      maxTokens = 300;
    } else {
      prompt = `Du bist Experte für Wissensextraktion. Deine Aufgabe: Fasse das Video so zusammen, dass der Nutzer es nicht mehr schauen muss und trotzdem das vollständige Wissen daraus mitnimmt.

WICHTIG: Halte die Zusammenfassung unter 1800 Zeichen.

Gliedere in genau 3 Abschnitte mit Markdown:

1. Worum geht es? (2-3 Sätze)
Hauptthema, Kontext und was das Video verspricht.

2. Konkrete Techniken & Methoden
Liste jede im Video genannte Technik, Methode oder Strategie als Bullet Point auf. Keine vagen Umschreibungen — nenne die exakten Namen, Schritte oder Frameworks. Wenn Zahlen, Dosierungen, Zeitangaben oder Parameter genannt werden, übernimm sie.

3. Kernerkenntnisse — Was muss man wissen?
Die wichtigsten Einsichten, die über bloße Tipps hinausgehen. Was ist die zentrale Erkenntnis, die man sonst erst durch Anschauen des Videos verstanden hätte? Wenn das Video Fehler oder Mythen anspricht, benenne sie konkret.

Regeln:

Sei spezifisch, nicht generisch. "Man sollte mehr trainieren" ist wertlos. "3x pro Woche Ganzkörpertraining mit progressiver Überlast von 2.5kg pro Woche" ist nützlich.
Wenn das Video keine konkreten Techniken enthält, sag das ehrlich.
Formatiere ohne Markdown.\n${trimmed}`;
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
