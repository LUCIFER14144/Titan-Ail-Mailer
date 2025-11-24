// login.js – Vercel serverless function for user authentication
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readJSON } from './utils/db.js';

const USERS_FILE = 'users.json';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token });
};
