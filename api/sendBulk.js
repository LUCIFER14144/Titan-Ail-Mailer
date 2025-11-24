import { sendMail } from './utils/mailer.js';
import PDFDocument from 'pdfkit';

// Helper to replace {{tags}} in string
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

    const { recipients, subjectTemplate, htmlTemplate, textTemplate, smtpConfig, pdfHtmlTemplate } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients list is required' });
    }

    const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [],
        skipped: []
    };

    // Process in serial to respect rate limits
    for (const recipient of recipients) {
        // Find email field (case-insensitive)
        const emailField = recipient.email || recipient.Email || recipient.EMAIL ||
            recipient['e-mail'] || recipient['E-mail'];

        if (!emailField || !emailField.includes('@')) {
            console.log('Skipping invalid recipient (no email):', recipient);
            results.skipped.push(recipient);
            continue;
        }

        const subject = replaceTags(subjectTemplate || 'No Subject', recipient);
        const html = replaceTags(htmlTemplate || '', recipient);
        const text = replaceTags(textTemplate || '', recipient);

        // Prepare attachments
        const attachments = [];

        // If PDF HTML is provided, convert and attach
        if (pdfHtmlTemplate && pdfHtmlTemplate.trim()) {
            try {
                const personalizedPdfHtml = replaceTags(pdfHtmlTemplate, recipient);
                const pdfBuffer = await htmlToPdf(personalizedPdfHtml);

                // Auto-generate filename: Invoice_{invoice}.pdf or Document_{email}.pdf
                let filename;
                if (recipient.invoice) {
                    filename = `Invoice_${recipient.invoice}.pdf`;
                } else if (recipient.Invoice) {
                    filename = `Invoice_${recipient.Invoice}.pdf`;
                } else {
                    filename = `Document_${emailField.split('@')[0]}.pdf`;
                }

                attachments.push({
                    filename: filename,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                });
            } catch (pdfErr) {
                console.error(`Failed to generate PDF for ${emailField}:`, pdfErr);
                results.errors.push({ email: emailField, error: 'PDF Generation Failed: ' + pdfErr.message });
            }
        }

        try {
            await sendMail({ to: emailField, subject, html, text, smtpConfig, attachments });
            console.log(`✓ Email sent to ${emailField}`);
            results.sent++;
            await delay(1000); // Throttle
        } catch (err) {
            console.error(`✗ Failed to send to ${emailField}:`, err.message);
            results.failed++;
            results.errors.push({ email: emailField, error: err.message });
        }
    }

    return res.status(200).json({
        message: 'Bulk sending completed',
        results
    });
};
