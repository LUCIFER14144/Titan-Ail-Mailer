// csvParser.js – Parse CSV text into JSON array

export function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    // Extract headers
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
