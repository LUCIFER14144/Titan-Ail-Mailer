import nodemailer from 'nodemailer';
import { verify } from './auth.js';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

export default async (req, res) => {
  // 1. Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Verify JWT (optional: remove if you want public access, but recommended for security)
  // const isAuthenticated = await verify(req, res);
  // if (!isAuthenticated) return; // verify() handles the error response

  const { to, subject, html, text } = req.body;

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html/text' });
  }

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('Gmail credentials missing in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration: Missing Gmail Credentials' });
  }

  // Create Nodemailer transporter for Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: GMAIL_USER, // Gmail always overrides this to the authenticated user
    to,
    subject,
    text: text || '',
    html: html || '',
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} via Gmail`);
    return res.status(200).json({ message: 'Email sent successfully via Gmail' });
  } catch (error) {
    console.error('Gmail SMTP Error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
};
