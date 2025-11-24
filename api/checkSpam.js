// checkSpam.js – Simple spam score checker
// Analyzes content for common spam trigger words

const SPAM_TRIGGERS = [
    'free', 'guarantee', 'winner', 'won', 'cash', 'prize', 'urgent',
    'click here', 'buy now', 'limited time', 'risk-free', '100%',
    '$$$', 'credit card', 'billing', 'verify', 'account suspended'
];

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { subject, text, html } = req.body;
    const content = `${subject || ''} ${text || ''} ${html || ''}`.toLowerCase();

    let score = 0; // 0 = clean, 10 = spammy
    const foundTriggers = [];

    SPAM_TRIGGERS.forEach(word => {
        if (content.includes(word)) {
            score += 1;
            foundTriggers.push(word);
        }
    });

    // Check for all caps in subject
    if (subject && subject === subject.toUpperCase() && subject.length > 5) {
        score += 3;
        foundTriggers.push('ALL CAPS SUBJECT');
    }

    // Cap score at 10
    score = Math.min(score, 10);

    let status = 'Good';
    if (score >= 3) status = 'Warning';
    if (score >= 6) status = 'High Risk';

    return res.status(200).json({
        score,
        status,
        triggers: foundTriggers,
        message: score === 0 ? 'No spam triggers found.' : `Found ${foundTriggers.length} potential spam triggers.`
    });
};
