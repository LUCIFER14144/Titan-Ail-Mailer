import { sendMail } from './utils/mailer.js';
import PDFDocument from 'pdfkit';

// Helper to replace {{tags}} in string
function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Simple HTML parser that extracts text with basic formatting
function parseHtmlSimple(html) {
    const elements = [];

    // Replace HTML entities
    html = html.replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');

    // Process tags sequentially
    let position = 0;

    while (position < html.length) {
        // Find next opening tag
        const tagStart = html.indexOf('<', position);

        // If no more tags,add remaining text
        if (tagStart === -1) {
            const remainingText = html.substring(position).trim();
            if (remainingText) {
                elements.push({ type: 'text', content: remainingText });
            }
            break;
        }

        // Add any text before the tag
        if (tagStart > position) {
            const text = html.substring(position, tagStart).trim();
            if (text) {
                elements.push({ type: 'text', content: text });
            }
        }

        // Find tag end
        const tagEnd = html.indexOf('>', tagStart);
        if (tagEnd === -1) break;

        // Extract tag name
        const fullTag = html.substring(tagStart, tagEnd + 1);
        const tagMatch = fullTag.match(/<(\/?)(\\w+)/);

        if (!tagMatch) {
            position = tagEnd + 1;
            continue;
        }

        const isClosing = tagMatch[1] === '/';
        const tagName = tagMatch[2].toLowerCase();

        // Handle self-closing tags
        if (tagName === 'br' || fullTag.endsWith('/>')) {
            elements.push({ type: 'break' });
            position = tagEnd + 1;
            continue;
        }

        // Only process opening tags
        if (!isClosing) {
            // Find matching closing tag
            const closingTag = `</${tagName}>`;
            const closingIndex = html.indexOf(closingTag, tagEnd + 1);

            if (closingIndex !== -1) {
                // Extract content between tags
                const content = html.substring(tagEnd + 1, closingIndex).trim();

                // Remove any nested HTML tags from content
                const cleanContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

                if (cleanContent) {
                    // Map tag to element type
                    if (tagName === 'h1') {
                        elements.push({ type: 'h1', content: cleanContent });
                    } else if (tagName === 'h2') {
                        elements.push({ type: 'h2', content: cleanContent });
                    } else if (tagName === 'h3') {
                        elements.push({ type: 'h3', content: cleanContent });
                    } else if (tagName === 'p') {
                        elements.push({ type: 'p', content: cleanContent });
                    } else if (tagName === 'strong' || tagName === 'b') {
                        elements.push({ type: 'bold', content: cleanContent });
                    } else if (tagName === 'em' || tagName === 'i') {
                        elements.push({ type: 'italic', content: cleanContent });
                    } else if (tagName === 'div' || tagName === 'span') {
                        elements.push({ type: 'text', content: cleanContent });
                    }
                }

                position = closingIndex + closingTag.length;
            } else {
                position = tagEnd + 1;
            }
        } else {
            position = tagEnd + 1;
        }
    }

    return elements;
}

// Render HTML to PDF using PDFKit
async function renderToPdf(htmlContent) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Parse HTML
            const elements = parseHtmlSimple(htmlContent);

            console.log('Parsed elements:', JSON.stringify(elements, null, 2));

            // Render elements
            for (const element of elements) {
                if (element.type === 'h1') {
                    doc.fontSize(24).font('Helvetica-Bold').text(element.content, { lineGap: 10 });
                    doc.moveDown(0.5);
                } else if (element.type === 'h2') {
                    doc.fontSize(20).font('Helvetica-Bold').text(element.content, { lineGap: 8 });
                    doc.moveDown(0.3);
                } else if (element.type === 'h3') {
                    doc.fontSize(16).font('Helvetica-Bold').text(element.content, { lineGap: 6 });
                    doc.moveDown(0.3);
                } else if (element.type === 'p') {
                    doc.fontSize(12).font('Helvetica').text(element.content, { lineGap: 4, align: 'left' });
                    doc.moveDown(0.5);
                } else if (element.type === 'bold') {
                    doc.fontSize(12).font('Helvetica-Bold').text(element.content, { continued: false });
                } else if (element.type === 'italic') {
                    doc.fontSize(12).font('Helvetica-Oblique').text(element.content, { continued: false });
                } else if (element.type === 'text') {
                    doc.fontSize(12).font('Helvetica').text(element.content, { continued: false });
                } else if (element.type === 'break') {
                    doc.moveDown(0.2);
                }
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
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

    console.log('Starting bulk send process...');
    console.log('PDF HTML Template present:', !!pdfHtmlTemplate);
    console.log('First 100 chars of template:', pdfHtmlTemplate?.substring(0, 100));

    const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [],
        skipped: []
    };

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

        // If HTML template is provided, convert to PDF and attach
        if (pdfHtmlTemplate && pdfHtmlTemplate.trim()) {
            try {
                const personalizedHtml = replaceTags(pdfHtmlTemplate, recipient);

                console.log(`Rendering PDF for ${emailField}...`);
                console.log('Personalized HTML:', personalizedHtml.substring(0, 100));

                const fileBuffer = await renderToPdf(personalizedHtml);

                // Auto-generate filename
                let filename;
                const baseName = recipient.invoice || recipient.Invoice || emailField.split('@')[0];

                if (recipient.invoice || recipient.Invoice) {
                    filename = `Invoice_${baseName}.pdf`;
                } else {
                    filename = `Document_${baseName}.pdf`;
                }

                attachments.push({
                    filename: filename,
                    content: fileBuffer,
                    contentType: 'application/pdf'
                });

                console.log(`✓ Generated PDF attachment: ${filename} (${fileBuffer.length} bytes)`);
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
