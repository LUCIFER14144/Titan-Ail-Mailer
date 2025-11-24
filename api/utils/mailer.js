import nodemailer from 'nodemailer';

// Create transporter with provided config or fall back to env vars
export function createTransporter(smtpConfig) {
    // If custom config provided, use it
    if (smtpConfig && smtpConfig.provider === 'custom') {
        return nodemailer.createTransport({
            host: smtpConfig.host,
            port: parseInt(smtpConfig.port) || 587,
            secure: smtpConfig.port == 465,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            },
            tls: smtpConfig.tls !== false
        });
    }

    // Gmail config (from UI or env vars)
    const user = smtpConfig?.user || process.env.GMAIL_USER;
    const pass = smtpConfig?.pass || process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        throw new Error('SMTP credentials not configured. Please configure in SMTP Config tab or set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
}

export async function sendMail({ to, subject, html, text, smtpConfig }) {
    const transporter = createTransporter(smtpConfig);

    const mailOptions = {
        from: smtpConfig?.user || process.env.GMAIL_USER,
        to,
        subject,
        text: text || '',
        html: html || '',
    };

    return transporter.sendMail(mailOptions);
}
