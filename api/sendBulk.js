import { sendMail } from './utils/mailer.js';

// Helper to replace {{tags}} in string
function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { recipients, subjectTemplate, htmlTemplate, textTemplate } = req.body;
    // recipients: [{ email: '...', name: '...', invoice: '...' }, ...]

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients list is required' });
    }

    const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: []
    };

    // Process in serial to respect rate limits (simple throttling)
    // For production, this should be offloaded to a queue (e.g., Redis/Bull), 
    // but for Vercel serverless (10s timeout), we must limit batch size or use external trigger.
    // We'll assume small batches for this MVP.

    for (const recipient of recipients) {
        if (!recipient.email) continue;

        const subject = replaceTags(subjectTemplate || '', recipient);
        const html = replaceTags(htmlTemplate || '', recipient);
        const text = replaceTags(textTemplate || '', recipient);

        try {
            await sendMail({ to: recipient.email, subject, html, text });
            results.sent++;
            // Throttle: 1 second delay between emails to avoid hitting Gmail burst limits
            await delay(1000);
        } catch (err) {
            console.error(`Failed to send to ${recipient.email}:`, err.message);
            results.failed++;
            results.errors.push({ email: recipient.email, error: err.message });
        }
    }

    return res.status(200).json({
        message: 'Bulk sending completed',
        results
    });
};
