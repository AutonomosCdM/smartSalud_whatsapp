const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const baseDir = '/Users/autonomos_dev/Projects/smartSalud_V5';

// All Excel files to analyze
const files = {
    'CONSOLIDADO': [
        'CONSOLIDADO PLANTILLAS EXCEL 2/ECICEP Universal .xlsx',
        'CONSOLIDADO PLANTILLAS EXCEL 2/POBLACION BAJO CONTROL.xlsx',
        'CONSOLIDADO PLANTILLAS EXCEL 2/PACIENTES RECHAZO 2025.xlsx',
        'CONSOLIDADO PLANTILLAS EXCEL 2/PLAN DE LOS PAD 2025.xlsx',
        'CONSOLIDADO PLANTILLAS EXCEL 2/poblacion infantil inscrita validada 2025.xlsx'
    ],
    'DAILY_SHEETS': [
        'excel/hoja_diaria_modulo_17_11_2025.xls',
        'excel/hoja_diaria_modulo_19_11_2025.xls',
        'excel/hoja_diaria_modulo_27_11_2025.xls',
        'excel/hoja_diaria_modulo_28_11_2025.xlsx',
        'excel/hoja_diaria_modulo_29_11_2025.xls'
    ]
};

const report = {
    files: [],
    fieldMapping: {},
    summary: {}
};

function analyzeFile(relativePath, category) {
    const fullPath = path.join(baseDir, relativePath);
    const fileName = path.basename(relativePath);

    if (!fs.existsSync(fullPath)) {
        return { fileName, category, error: 'File not found' };
    }

    try {
        const workbook = XLSX.readFile(fullPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        // Find header row (first non-empty row)
        let headerRow = null;
        let headerIndex = 0;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            if (data[i] && data[i].length > 3) {
                headerRow = data[i];
                headerIndex = i;
                break;
            }
        }

        // Sample data rows
        const sampleRows = data.slice(headerIndex + 1, headerIndex + 6);

        // Detect fields
        const fields = headerRow ? headerRow.filter(h => h && h.toString().trim()) : [];

        // Count non-empty values per column
        const fieldCoverage = {};
        if (headerRow) {
            headerRow.forEach((header, idx) => {
                if (!header) return;
                const nonEmpty = sampleRows.filter(row => row[idx] && row[idx].toString().trim()).length;
                fieldCoverage[header] = `${nonEmpty}/${sampleRows.length}`;
            });
        }

        return {
            fileName,
            category,
            sheetName,
            totalRows: data.length,
            headerIndex,
            fields,
            fieldCoverage,
            sampleRows: sampleRows.slice(0, 2) // First 2 data rows
        };

    } catch (e) {
        return { fileName, category, error: e.message };
    }
}

console.log('=== Excel Files Data Audit ===\n');

// Analyze all files
Object.entries(files).forEach(([category, fileList]) => {
    console.log(`\n--- ${category} ---`);
    fileList.forEach(file => {
        const analysis = analyzeFile(file, category);
        report.files.push(analysis);

        if (analysis.error) {
            console.log(`❌ ${analysis.fileName}: ${analysis.error}`);
        } else {
            console.log(`✅ ${analysis.fileName}`);
            console.log(`   Rows: ${analysis.totalRows}, Fields: ${analysis.fields.length}`);
            console.log(`   Headers: ${analysis.fields.slice(0, 5).join(', ')}...`);
        }
    });
});

// Save detailed report
const reportPath = path.join(baseDir, 'backend/data_audit_detailed.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n✅ Detailed report saved to: ${reportPath}`);
