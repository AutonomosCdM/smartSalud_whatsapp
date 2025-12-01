const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const baseDir = '/Users/autonomos_dev/Projects/smartSalud_V5';
const filesToInspect = [
    'CONSOLIDADO PLANTILLAS EXCEL 2/ECICEP Universal .xlsx',
    'CONSOLIDADO PLANTILLAS EXCEL 2/POBLACION BAJO CONTROL.xlsx',
    'excel/hoja_diaria_modulo_28_11_2025.xlsx'
];

const reportPath = path.join(baseDir, 'backend/headers_report.txt');
let reportContent = '';

filesToInspect.forEach(relativePath => {
    const fullPath = path.join(baseDir, relativePath);
    reportContent += `\n--- Inspecting: ${relativePath} ---\n`;

    try {
        if (fs.existsSync(fullPath)) {
            const workbook = XLSX.readFile(fullPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });

            reportContent += 'First 5 rows preview:\n';
            data.slice(0, 5).forEach((row, i) => {
                reportContent += `Row ${i}: ${JSON.stringify(row)}\n`;
            });

        } else {
            reportContent += 'File not found\n';
        }
    } catch (e) {
        reportContent += `Error reading file: ${e.message}\n`;
    }
});

fs.writeFileSync(reportPath, reportContent);
console.log('Report generated at ' + reportPath);
