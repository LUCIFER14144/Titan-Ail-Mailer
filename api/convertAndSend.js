import PDFDocument from 'pdfkit';
import { sendMail } from './utils/mailer.js';

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

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { html, format, filename, email, smtpConfig } = req.body;

    if (!html || !format) {
        return res.status(400).json({ error: 'HTML and format required' });
    }

    try {
        let fileBuffer;
        let contentType;
        let extension;

        if (format === 'pdf') {
            fileBuffer = await htmlToPdf(html);
            contentType = 'application/pdf';
            extension = 'pdf';
        } else {
            return res.status(501).json({
                error: 'PNG/JPG conversion requires puppeteer library (not installed). Use PDF for now.'
            });
        }

        const fullFilename = `${filename || 'document'}.${extension}`;

        // If email provided, send as attachment
        if (email) {
            await sendMail({
                to: email,
                subject: `Your converted file: ${fullFilename}`,
                text: `Please find your converted ${format.toUpperCase()} file attached.`,
                html: `<p>Your HTML content has been converted to <strong>${format.toUpperCase()}</strong>.</p>`,
                smtpConfig,
                attachments: [{
                    filename: fullFilename,
                    content: fileBuffer,
                    contentType
                }]
            });

            return res.status(200).json({
                message: `File converted and emailed to ${email} successfully!`,
                filename: fullFilename
            });
        }

        // Otherwise return error (browser can't download from serverless function)
        return res.status(400).json({
            error: 'Email address required. Direct download not supported in serverless environment.'
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
};
