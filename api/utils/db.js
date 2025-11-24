// utils/db.js – simple JSON file storage for development
import { promises as fs } from 'fs';
import path from 'path';

const dataDir = path.resolve(import.meta.url, '../../data');

export async function readJSON(filename) {
    const filePath = path.join(dataDir, filename);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

export async function writeJSON(filename, data) {
    const filePath = path.join(dataDir, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
