const XLSX = require('xlsx');

const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/CONSOLIDADO PLANTILLAS EXCEL 2/PLAN DE LOS PAD 2025.xlsx';

const workbook = XLSX.readFile(filePath);

console.log('=== PLAN DE LOS PAD - All Sheets ===\n');
console.log(`Total sheets: ${workbook.SheetNames.length}\n`);

workbook.SheetNames.forEach((sheetName, idx) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rows.filter(r => r && r.length > 0);

    console.log(`${idx + 1}. ${sheetName}`);
    console.log(`   Rows: ${dataRows.length}`);

    // Try to find header row
    const headerRow = dataRows.find(r =>
        r.some(cell => String(cell).includes('NOMBRE') || String(cell).includes('RUT'))
    );

    if (headerRow) {
        const rutIdx = headerRow.findIndex(c => String(c).includes('RUT'));
        const nameIdx = headerRow.findIndex(c => String(c).includes('NOMBRE'));
        const phoneIdx = headerRow.findIndex(c => String(c).includes('TELEFONO'));

        console.log(`   Has RUT: ${rutIdx !== -1}, Name: ${nameIdx !== -1}, Phone: ${phoneIdx !== -1}`);
    }
    console.log('');
});

console.log('\n✅ Analysis complete');
