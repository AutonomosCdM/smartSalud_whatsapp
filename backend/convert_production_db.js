const XLSX = require('xlsx');

/**
 * Convert production patient database to import-compatible format
 * 
 * Input: Base de datos.xls (18,050 patient records)
 * Output: production_patients.xlsx (patients only, no appointments)
 */

console.log('📊 Converting production database...\n');

// Read source file
const sourceFile = '/Users/autonomos_dev/Projects/smartSalud_V5/Base de datos.xls';
const wb = XLSX.readFile(sourceFile);
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log(`✅ Read ${rawData.length} patient records from source file`);

// Calculate RUT check digit
function calculateRutCheckDigit(rut) {
    const rutStr = rut.toString();
    let sum = 0;
    let multiplier = 2;

    for (let i = rutStr.length - 1; i >= 0; i--) {
        sum += parseInt(rutStr[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const checkDigit = 11 - remainder;

    if (checkDigit === 11) return '0';
    if (checkDigit === 10) return 'K';
    return checkDigit.toString();
}

// Transform data
const transformedPatients = [];
const transformedAppointments = [];

rawData.forEach((row, index) => {
    // Combine name parts
    const nombres = (row['NOMBRES'] || '').toString().trim();
    const apellidoPaterno = (row['APELLIDO PATERNO'] || '').toString().trim();
    const apellidoMaterno = (row['APELLIDO MATERNO'] || '').toString().trim();

    const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();

    // Format RUT
    const rutBase = (row['RUT '] || row['RUT'] || '').toString().trim();
    const dv = (row['DV'] || '').toString().trim();

    // If DV is missing, calculate it
    const dvFinal = dv || calculateRutCheckDigit(rutBase);
    const rutCompleto = `${rutBase}-${dvFinal}`;

    // Format phone
    let telefono = (row['TELEFONO '] || row['TELEFONO'] || '').toString().trim();

    // Remove any non-digit characters
    telefono = telefono.replace(/\D/g, '');

    // Add +56 prefix if missing
    if (telefono && !telefono.startsWith('56')) {
        // If it's 9 digits, it's a mobile number
        if (telefono.length === 9) {
            telefono = `+56${telefono}`;
        }
        // If it's 8 digits, might be missing the 9
        else if (telefono.length === 8) {
            telefono = `+569${telefono}`;
        }
        // Otherwise, just add +56
        else {
            telefono = `+56${telefono}`;
        }
    } else if (telefono && telefono.startsWith('56')) {
        telefono = `+${telefono}`;
    }

    // Get email
    const correo = (row['CORREO '] || row['CORREO'] || '').toString().trim();

    // Add patient data
    transformedPatients.push({
        'RUT': rutCompleto,
        'Nombre': nombreCompleto,
        'Teléfono': telefono || '+56900000000', // Default if missing
        'Email': correo || undefined,
    });

    // Add sample appointment data for the first 100 patients
    if (index < 100) {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + 7 + index); // Appointment 7 days + index in the future

        transformedAppointments.push({
            'RUT Paciente': rutCompleto,
            'Fecha': futureDate.toISOString().split('T')[0], // YYYY-MM-DD
            'Hora': '10:00',
            'Tipo de Cita': 'Consulta General',
            'Estado': 'Pendiente',
            'Notas': `Cita de seguimiento para ${nombreCompleto}`,
        });
    }

    // Progress indicator
    if ((index + 1) % 1000 === 0) {
        console.log(`  Processed ${index + 1}/${rawData.length} records...`);
    }
});

console.log(`✅ Transformed ${transformedPatients.length} patient records`);
console.log(`✅ Generated ${transformedAppointments.length} sample appointment records\n`);

// Show sample
console.log('📋 Sample records:');
console.log(JSON.stringify(transformedPatients.slice(0, 3), null, 2));
console.log('');

// Create new workbook with patients only
const wsNew = XLSX.utils.json_to_sheet(transformedPatients);
const wbNew = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbNew, wsNew, 'Pacientes');

// Write to file
const outputFile = '/Users/autonomos_dev/Projects/smartSalud_V5/backend/production_patients.xlsx';
XLSX.writeFile(wbNew, outputFile);

console.log(`✅ Created ${outputFile}`);
console.log(`📊 Total patients: ${transformedPatients.length}`);
console.log('\n✨ Conversion complete!\n');
console.log('Next steps:');
console.log('1. Run reset_database.js to clear existing data');
console.log('2. Import production_patients.xlsx via the application');
