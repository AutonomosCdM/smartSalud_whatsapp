import * as XLSX from 'xlsx';
import { parse } from 'node-html-parser';

const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/excel/hoja_diaria_modulo_28_11_2025.xlsx';

function cleanContent(text: any): string {
    if (!text) return '';
    const str = text.toString();
    if (str.includes('<')) {
        const root = parse(str);
        return root.textContent?.trim() || '';
    }
    return str.trim();
}

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log('Total rows:', data.length);

    // Print first 20 rows cleaned
    for (let i = 0; i < 20; i++) {
        const cleaned = data[i]?.map(cell => cleanContent(cell));
        console.log(`Row ${i}:`, JSON.stringify(cleaned));
    }

} catch (error) {
    console.error('Error reading Excel:', error);
}
