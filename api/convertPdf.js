// convertPdf.js – Convert text/HTML to PDF attachment
import PDFDocument from 'pdfkit';

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { content, title } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const doc = new PDFDocument();
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${title || 'document'}.pdf"`);
            res.status(200).send(pdfData);
        });

        if (title) {
            doc.fontSize(20).text(title, { align: 'center' });
            doc.moveDown();
        }

        doc.fontSize(12).text(content);
        doc.end();

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};
