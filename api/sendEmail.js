import sgMail from '@sendgrid/mail';
import { verify } from './auth.js';

const API_KEY = process.env.SENDGRID_API_KEY;

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

  if (!API_KEY) {
    console.error('SENDGRID_API_KEY is missing in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration: Missing Email Provider Key' });
  }

  sgMail.setApiKey(API_KEY);

  const msg = {
    to,
    from: process.env.SEND_FROM_EMAIL || 'noreply@example.com', // Change this to your verified sender
    subject,
    text: text || '',
    html: html || '',
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('SendGrid Error:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
};
