import { sendMail } from './utils/mailer.js';
import { verify } from './auth.js';

export default async (req, res) => {
  // 1. Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Verify JWT (optional)
  // const isAuthenticated = await verify(req, res);
  // if (!isAuthenticated) return;

  const { to, subject, html, text } = req.body;

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html/text' });
  }

  try {
    await sendMail({ to, subject, html, text });
    console.log(`Email sent to ${to} via Gmail`);
    return res.status(200).json({ message: 'Email sent successfully via Gmail' });
  } catch (error) {
    console.error('Gmail SMTP Error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
};
