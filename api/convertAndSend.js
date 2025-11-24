import PDFDocument from 'pdfkit';
import { sendMail } from './utils/mailer.js';

// Helper to replace {{tags}} in text
function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Helper to convert HTML to PDF
function htmlToPdf(htmlContent) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Strip HTML tags for basic conversion
        const text = htmlContent.replace(/<[^>]*>/g, '\n');
        doc.fontSize(12).text(text.trim());
        doc.end();
    });
}

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { html, format, filename, recipients, smtpConfig } = req.body;

    if (!html || !format) {
        return res.status(400).json({ error: 'HTML and format required' });
    }

    if (!recipients || recipients.length === 0) {
        return res.status(400).json({ error: 'At least one recipient email required' });
    }

    try {
        const extension = format === 'pdf' ? 'pdf' : null;

        if (!extension) {
            return res.status(501).json({
                error: 'PNG/JPG conversion requires puppeteer library (not installed). Use PDF for now.'
            });
        }

        const results = {
            total: recipients.length,
            sent: 0,
            failed: 0,
            errors: []
        };

        // Process each recipient
        for (const recipient of recipients) {
            const email = recipient.email || recipient.Email || recipient.EMAIL || recipient;

            if (!email || !email.includes('@')) {
                results.failed++;
                results.errors.push({ email, error: 'Invalid email' });
                continue;
            }

            try {
                // Replace tags in HTML template
                const personalizedHtml = replaceTags(html, recipient);

                // Convert to PDF
                const fileBuffer = await htmlToPdf(personalizedHtml);
                const fullFilename = `${filename || 'document'}_${email.split('@')[0]}.${extension}`;

                // Send email with attachment
                await sendMail({
                    to: email,
                    subject: `Your converted file: ${fullFilename}`,
                    text: `Please find your converted ${format.toUpperCase()} file attached.`,
                    html: `<p>Your personalized HTML content has been converted to <strong>${format.toUpperCase()}</strong>.</p>`,
                    smtpConfig,
                    attachments: [{
                        filename: fullFilename,
                        content: fileBuffer,
                        contentType: 'application/pdf'
                    }]
                });

                results.sent++;
                await delay(1000); // Throttle
            } catch (err) {
                console.error(`Failed for ${email}:`, err.message);
                results.failed++;
                results.errors.push({ email, error: err.message });
            }
        }

        return res.status(200).json({
            message: 'Conversion and email sending completed',
            results
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
};
