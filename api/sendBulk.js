import { sendMail } from './utils/mailer.js';
import htmlPdf from 'html-pdf-node';
import sharp from 'sharp';

// Helper to replace {{tags}} in string
function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Helper to render HTML to PDF or Image
async function renderHtml(htmlContent, format = 'pdf') {
    try {
        if (format === 'pdf') {
            // Generate PDF
            const options = { format: 'A4', printBackground: true };
            const file = { content: htmlContent };
            const pdfBuffer = await htmlPdf.generatePdf(file, options);
            return pdfBuffer;
        } else {
            // For images, first convert to PDF then to image using sharp
            const options = { format: 'A4', printBackground: true };
            const file = { content: htmlContent };
            const pdfBuffer = await htmlPdf.generatePdf(file, options);

            // Convert PDF to image using sharp
            // Note: This is a simplified approach - we'll use a basic HTML rendering
            // For now, we'll use a text-based fallback for images
            const textContent = htmlContent.replace(/<[^>]*>/g, '\n').trim();

            // Create a simple SVG with the text
            const svg = `
        <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="1000" fill="white"/>
          <text x="20" y="40" font-family="Arial" font-size="16" fill="black">
            ${textContent.split('\n').slice(0, 50).map((line, i) =>
                `<tspan x="20" dy="${i === 0 ? 0 : 20}">${line}</tspan>`
            ).join('')}
          </text>
        </svg>
      `;

            const imageBuffer = await sharp(Buffer.from(svg))
                .toFormat(format === 'jpg' ? 'jpeg' : 'png')
                .toBuffer();

            return imageBuffer;
        }
    } catch (error) {
        console.error('Error rendering HTML:', error);
        throw new Error(`Failed to render HTML as ${format}: ${error.message}`);
    }
}

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const {
        recipients,
        subjectTemplate,
        htmlTemplate,
        textTemplate,
        smtpConfig,
        pdfHtmlTemplate,
        attachmentFormat = 'pdf',
        rotateFormats = false
    } = req.body;

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

    // Define format rotation order
    const formatOrder = ['pdf', 'jpg', 'png'];

    // Process in serial to respect rate limits
    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

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

        // If HTML template is provided, convert and attach
        if (pdfHtmlTemplate && pdfHtmlTemplate.trim()) {
            try {
                const personalizedHtml = replaceTags(pdfHtmlTemplate, recipient);

                // Determine format (rotate if enabled)
                let currentFormat = attachmentFormat;
                if (rotateFormats) {
                    currentFormat = formatOrder[i % formatOrder.length];
                }

                console.log(`Rendering ${currentFormat.toUpperCase()} for ${emailField}...`);
                const fileBuffer = await renderHtml(personalizedHtml, currentFormat);

                // Auto-generate filename
                let filename;
                const baseName = recipient.invoice || recipient.Invoice || emailField.split('@')[0];

                if (recipient.invoice || recipient.Invoice) {
                    filename = `Invoice_${baseName}.${currentFormat === 'jpg' ? 'jpg' : currentFormat}`;
                } else {
                    filename = `Document_${baseName}.${currentFormat === 'jpg' ? 'jpg' : currentFormat}`;
                }

                const contentType = currentFormat === 'pdf' ? 'application/pdf' : `image/${currentFormat === 'jpg' ? 'jpeg' : currentFormat}`;

                attachments.push({
                    filename: filename,
                    content: fileBuffer,
                    contentType: contentType
                });

                console.log(`✓ Generated ${currentFormat.toUpperCase()} attachment for ${emailField}: ${filename}`);
            } catch (pdfErr) {
                console.error(`Failed to generate attachment for ${emailField}:`, pdfErr);
                results.errors.push({ email: emailField, error: 'Attachment Generation Failed: ' + pdfErr.message });
                // Continue without attachment
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
