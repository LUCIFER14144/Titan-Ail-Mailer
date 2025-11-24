import { sendMail } from './utils/mailer.js';
import PDFDocument from 'pdfkit';
import { JSDOM } from 'jsdom';
import { createCanvas } from 'canvas';

// Helper to replace {{tags}} in string
function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Helper to parse HTML and extract text with basic formatting
function parseBasicHtml(htmlContent) {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const elements = [];

    // Process text nodes and basic tags
    const walk = (node) => {
        if (node.nodeType === 3) { // Text node
            const text = node.textContent.trim();
            if (text) {
                elements.push({ type: 'text', content: text });
            }
        } else if (node.nodeType === 1) { // Element node
            const tagName = node.tagName.toLowerCase();

            if (tagName === 'h1') {
                elements.push({ type: 'h1', content: node.textContent.trim() });
            } else if (tagName === 'h2') {
                elements.push({ type: 'h2', content: node.textContent.trim() });
            } else if (tagName === 'h3') {
                elements.push({ type: 'h3', content: node.textContent.trim() });
            } else if (tagName === 'p') {
                elements.push({ type: 'p', content: node.textContent.trim() });
            } else if (tagName === 'br') {
                elements.push({ type: 'break' });
            } else if (tagName === 'strong' || tagName === 'b') {
                elements.push({ type: 'bold', content: node.textContent.trim() });
            } else if (tagName === 'em' || tagName === 'i') {
                elements.push({ type: 'italic', content: node.textContent.trim() });
            } else {
                // For other tags, process children
                for (const child of node.childNodes) {
                    walk(child);
                }
            }
        }
    };

    walk(document.body);
    return elements;
}

// Helper to render HTML to PDF
async function renderToPdf(htmlContent) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Parse HTML
            const elements = parseBasicHtml(htmlContent);

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

// Helper to render HTML to Image
async function renderToImage(htmlContent, format) {
    try {
        // First generate PDF
        const pdfBuffer = await renderToPdf(htmlContent);

        // For images, we'll create a simple canvas representation
        const canvas = createCanvas(800, 1000);
        const ctx = canvas.getContext('2d');

        // Fill white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 800, 1000);

        // Parse and render text
        const elements = parseBasicHtml(htmlContent);
        let y = 50;

        ctx.fillStyle = 'black';
        for (const element of elements) {
            if (element.type === 'h1') {
                ctx.font = 'bold 32px Arial';
                ctx.fillText(element.content, 50, y);
                y += 50;
            } else if (element.type === 'h2') {
                ctx.font = 'bold 24px Arial';
                ctx.fillText(element.content, 50, y);
                y += 40;
            } else if (element.type === 'h3') {
                ctx.font = 'bold 20px Arial';
                ctx.fillText(element.content, 50, y);
                y += 35;
            } else if (element.type === 'p' || element.type === 'text') {
                ctx.font = '16px Arial';
                // Wrap text
                const words = element.content.split(' ');
                let line = '';
                for (const word of words) {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > 700) {
                        ctx.fillText(line, 50, y);
                        line = word + ' ';
                        y += 25;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, 50, y);
                y += 30;
            }

            if (y > 950) break; // Stop if we run out of space
        }

        // Convert to buffer
        const buffer = canvas.toBuffer(format === 'jpg' ? 'image/jpeg' : 'image/png', { quality: 0.9 });
        return buffer;
    } catch (error) {
        console.error('Error rendering to image:', error);
        throw error;
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

    console.log('Starting bulk send process...');
    console.log('PDF HTML Template present:', !!pdfHtmlTemplate);
    console.log('Attachment format:', attachmentFormat);
    console.log('Rotate formats:', rotateFormats);

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

                let fileBuffer;
                if (currentFormat === 'pdf') {
                    fileBuffer = await renderToPdf(personalizedHtml);
                } else {
                    fileBuffer = await renderToImage(personalizedHtml, currentFormat);
                }

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

                console.log(`✓ Generated ${currentFormat.toUpperCase()} attachment: ${filename} (${fileBuffer.length} bytes)`);
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
