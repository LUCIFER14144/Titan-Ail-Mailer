// signup.js – Vercel serverless function for user registration
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readJSON, writeJSON } from './utils/db.js';

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
    // Load existing users
    const users = await readJSON(USERS_FILE);
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), email, password: hashed };
    users.push(newUser);
    await writeJSON(USERS_FILE, users);
    const token = jwt.sign({ sub: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token });
};
