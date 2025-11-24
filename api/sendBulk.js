import { sendMail } from './utils/mailer.js';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Helper to replace {{tags}} in string
function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Helper to render HTML using Puppeteer
async function renderHtmlWithPuppeteer(htmlContent, format = 'pdf') {
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    let buffer;
    if (format === 'pdf') {
        buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });
    } else if (format === 'jpg' || format === 'jpeg') {
        buffer = await page.screenshot({
            type: 'jpeg',
            quality: 90,
            fullPage: true,
        });
    } else if (format === 'png') {
        buffer = await page.screenshot({
            type: 'png',
            fullPage: true,
        });
    }

    await browser.close();
    return buffer;
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

                const fileBuffer = await renderHtmlWithPuppeteer(personalizedHtml, currentFormat);

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
