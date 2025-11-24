// import.js – Vercel serverless function for importing contacts
import { readJSON, writeJSON } from './utils/db.js';

const CONTACTS_FILE = 'contacts.json';

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const { contacts } = req.body; // expecting an array of {email, name}
    if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'Contacts array required' });
    }
    // Load existing contacts
    const existing = await readJSON(CONTACTS_FILE);
    const merged = [...existing, ...contacts];
    await writeJSON(CONTACTS_FILE, merged);
    return res.status(200).json({ message: `${contacts.length} contacts imported`, total: merged.length });
};
