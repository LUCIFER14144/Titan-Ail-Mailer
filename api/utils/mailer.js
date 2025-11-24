import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

let transporter = null;

if (GMAIL_USER && GMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS,
        },
    });
}

export async function sendMail({ to, subject, html, text }) {
    if (!transporter) {
        throw new Error('Mailer not configured: Missing Gmail credentials');
    }

    const mailOptions = {
        from: GMAIL_USER,
        to,
        subject,
        text: text || '',
        html: html || '',
    };

    return transporter.sendMail(mailOptions);
}
