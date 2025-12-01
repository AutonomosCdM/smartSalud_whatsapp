const XLSX = require('xlsx');

// Create test appointment for Saldura Meia
// This will be scheduled for tomorrow early morning to be #1

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(8, 0, 0, 0); // 8:00 AM tomorrow

const day = String(tomorrow.getDate()).padStart(2, '0');
const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
const year = tomorrow.getFullYear();

const testAppointment = [{
    'RUT': '13146871-7',
    'Nombre': 'Saldura Meia',
    'Teléfono': '+56961797823',
    'Fecha Cita': `${day}/${month}/${year} 08:00`,
    'Especialidad': 'Medicina General',
    'Doctor': 'Dra. Ana Silva',
}];

console.log('📅 Creating test appointment for Saldura Meia...\n');
console.log(JSON.stringify(testAppointment[0], null, 2));

// Create workbook
const ws = XLSX.utils.json_to_sheet(testAppointment);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Citas');

// Write to file
const outputFile = '/Users/autonomos_dev/Projects/smartSalud_V5/backend/test_saldura_meia.xlsx';
XLSX.writeFile(wb, outputFile);

console.log(`\n✅ Created ${outputFile}`);
console.log('📊 Ready to import!');
