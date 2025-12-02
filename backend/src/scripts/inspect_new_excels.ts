import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const baseDir = '/Users/autonomos_dev/Projects/smartSalud_V5';
const filesToInspect = [
    'CONSOLIDADO PLANTILLAS EXCEL 2/ECICEP Universal .xlsx',
    'CONSOLIDADO PLANTILLAS EXCEL 2/POBLACION BAJO CONTROL.xlsx',
    'excel/hoja_diaria_modulo_28_11_2025.xlsx'
];

filesToInspect.forEach(relativePath => {
    const fullPath = path.join(baseDir, relativePath);
    console.log(`\n--- Inspecting: ${relativePath} ---`);

    try {
        if (fs.existsSync(fullPath)) {
            const workbook = XLSX.readFile(fullPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Read first few rows to find headers (sometimes they are not in row 1)
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

            // Print first 5 rows to identify where headers are
            console.log('First 5 rows preview:');
            data.slice(0, 5).forEach((row, i) => {
                console.log(`Row ${i}:`, JSON.stringify(row));
            });

        } else {
            console.log('File not found');
        }
    } catch (e) {
        console.error('Error reading file:', e instanceof Error ? e.message : String(e));
    }
});
