// auth.js – JWT verification middleware for Vercel serverless functions
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import path from 'path';

// Load secret from environment (Vercel will inject env vars)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * Middleware to protect API routes.
 * Usage in a Vercel function: `export default async (req, res) => { await verify(req, res); ... }`
 */
export async function verify(req, res) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
        res.status(401).json({ error: 'Missing token' });
        return false;
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // Attach user info to request for downstream handlers
        req.user = payload;
        return true;
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
        return false;
    }
}
