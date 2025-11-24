import PDFDocument from 'pdfkit';

// Helper to convert HTML to PDF buffer
export function htmlToPdfBuffer(htmlContent, title = 'Document') {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add title
        doc.fontSize(16).text(title, { align: 'center' });
        doc.moveDown();

        // Strip HTML tags for basic conversion (PDFKit doesn't render HTML)
        const plainText = htmlContent.replace(/<[^>]*>/g, '');
        doc.fontSize(12).text(plainText);

        doc.end();
    });
}
