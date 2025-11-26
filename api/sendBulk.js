import SMTPPool from './utils/smtpPool.js';
import { calculateSmartDelay, generateOptimalHeaders } from './utils/deliverability.js';
import PDFDocument from 'pdfkit';

function replaceTags(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// Simple HTML to PDF converter
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

            // Simple conversion - strip tags and add to PDF
            const text = htmlContent.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n$1\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n$1\n')
                .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '');

            doc.fontSize(12).text(text.trim());
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

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
        deliverabilitySettings = {}
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients list is required' });
    }

    console.log('Starting bulk send with enhanced deliverability...');
    console.log('Recipients:', recipients.length);
    console.log('SMTP configs:', Array.isArray(smtpConfig) ? smtpConfig.length : 1);

    // Initialize SMTP pool
    const smtpPool = new SMTPPool(smtpConfig);

    const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [],
        skipped: [],
        smtpStats: {}
    };

    // Deliverability settings
    const {
        minDelay = 2000,
        maxDelay = 5000,
        warmupMode = false,
        randomizeDelays = true
    } = deliverabilitySettings;

    // Process recipients
    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const emailField = recipient.email || recipient.Email || recipient.EMAIL;

        if (!emailField || !emailField.includes('@')) {
            results.skipped.push(recipient);
            continue;
        }

        const subject = replaceTags(subjectTemplate || 'No Subject', recipient);
        const html = replaceTags(htmlTemplate || '', recipient);
        const text = replaceTags(textTemplate || '', recipient);

        // Generate PDF attachment if template provided
        const attachments = [];
        if (pdfHtmlTemplate && pdfHtmlTemplate.trim()) {
            try {
                const personalizedHtml = replaceTags(pdfHtmlTemplate, recipient);
                const fileBuffer = await renderToPdf(personalizedHtml);
                const baseName = recipient.invoice || recipient.Invoice || emailField.split('@')[0];
                const filename = (recipient.invoice || recipient.Invoice)
                    ? `Invoice_${baseName}.pdf`
                    : `Document_${baseName}.pdf`;

                attachments.push({
                    filename,
                    content: fileBuffer,
                    contentType: 'application/pdf'
                });

                console.log(`✓ Generated PDF: ${filename}`);
            } catch (pdfErr) {
                console.error(`PDF error for ${emailField}:`, pdfErr);
            }
        }

        // Prepare mail options
        const fromEmail = Array.isArray(smtpConfig) ? smtpConfig[0]?.user : smtpConfig?.user;
        const headers = generateOptimalHeaders(fromEmail || 'noreply@example.com', emailField);

        const mailOptions = {
            from: fromEmail,
            to: emailField,
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ''),
            headers,
            attachments
        };

        try {
            // Send via SMTP pool (automatic rotation & failover)
            const sendResult = await smtpPool.sendMail(mailOptions);
            console.log(`✓ Sent to ${emailField} via ${sendResult.smtpUsed}`);
            results.sent++;

            // Track SMTP usage
            if (!results.smtpStats[sendResult.smtpUsed]) {
                results.smtpStats[sendResult.smtpUsed] = 0;
            }
            results.smtpStats[sendResult.smtpUsed]++;

            // Smart delay
            const delayMs = calculateSmartDelay({
                minDelay,
                maxDelay,
                randomize: randomizeDelays,
                warmupMode
            });

            console.log(`Waiting ${delayMs}ms...`);
            await delay(delayMs);

        } catch (err) {
            console.error(`✗ Failed for ${emailField}:`, err.message);
            results.failed++;
            results.errors.push({ email: emailField, error: err.message });
        }
    }

    const poolStats = smtpPool.getStats();

    return res.status(200).json({
        message: 'Bulk sending completed',
        results,
        poolStats
    });
};
