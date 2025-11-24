// csvParser.js – Parse CSV text or simple email list into JSON array

export function parseCSV(csvText) {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Check if it's a simple email list (no commas, just emails)
    const firstLine = lines[0].trim();
    const isSimpleList = !firstLine.includes(',') && firstLine.includes('@');

    if (isSimpleList) {
        // Simple email list: one email per line
        return lines.map(email => ({ email: email.trim() }));
    }

    // Proper CSV with headers
    const headers = lines[0].split(',').map(h => h.trim());

    // Parse rows
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        result.push(obj);
    }

    return result;
}
