// generateContent.js – AI content generation (Mock/Placeholder for OpenAI)
// To enable real AI, set OPENAI_API_KEY in .env

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { topic, tone } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
    }

    // Mock response if no API key is present
    if (!apiKey) {
        console.warn('OPENAI_API_KEY missing, returning mock content');
        return res.status(200).json({
            subject: `[Draft] ${topic} - Special Offer`,
            text: `Hello,\n\nHere is a draft email about ${topic}. We hope you find this useful.\n\nBest,\nTitan-Ail-Mailer Team`,
            html: `<p>Hello,</p><p>Here is a draft email about <strong>${topic}</strong>. We hope you find this useful.</p><p>Best,<br>Titan-Ail-Mailer Team</p>`
        });
    }

    // Real OpenAI call (commented out until key is provided/package installed)
    /*
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user", 
            content: `Write a marketing email about "${topic}" with a ${tone || 'professional'} tone. Return JSON with keys: subject, text, html.`
          }]
        })
      });
      const data = await response.json();
      // Parse data.choices[0].message.content...
      // For now, falling back to mock to prevent crash
      return res.status(200).json({ message: "AI generation logic placeholder" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
    */

    return res.status(200).json({
        subject: `[AI Generated] ${topic}`,
        text: `This is a placeholder for AI generated content about ${topic}. Configure OPENAI_API_KEY to enable real generation.`,
        html: `<p>This is a placeholder for AI generated content about <strong>${topic}</strong>.</p>`
    });
};
