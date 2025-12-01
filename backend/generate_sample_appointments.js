const XLSX = require('xlsx');

/**
 * Generate sample appointments using production patient data
 * Creates 50 appointments with random patients from the database
 */

console.log('📅 Generating sample appointments...\n');

// Read production patients file
const patientsFile = '/Users/autonomos_dev/Projects/smartSalud_V5/backend/production_patients.xlsx';
const wb = XLSX.readFile(patientsFile);
const ws = wb.Sheets[wb.SheetNames[0]];
const patients = XLSX.utils.sheet_to_json(ws);

console.log(`✅ Loaded ${patients.length} patients`);

// Specialties and doctors
const specialties = [
    { name: 'Medicina General', doctors: ['Dra. Ana Silva', 'Dr. Carlos Rojas'] },
    { name: 'Cardiología', doctors: ['Dr. Roberto Díaz', 'Dra. Patricia Morales'] },
    { name: 'Dermatología', doctors: ['Dra. Isabel Torres', 'Dr. Manuel Vargas'] },
    { name: 'Oftalmología', doctors: ['Dr. Luis Fernández', 'Dra. Carmen López'] },
    { name: 'Psicología', doctors: ['Dra. Elena Ruiz', 'Dr. Jorge Soto'] },
    { name: 'Kinesiología', doctors: ['Dr. Pablo Muñoz', 'Dra. Laura Guzmán'] },
    { name: 'Nutrición', doctors: ['Dra. María González', 'Dr. Juan Pérez'] },
];

// Generate 50 appointments
const appointments = [];
const today = new Date();

for (let i = 0; i < 50; i++) {
    // Random patient
    const randomIndex = Math.floor(Math.random() * patients.length);
    const patient = patients[randomIndex];

    // Random specialty
    const specialty = specialties[Math.floor(Math.random() * specialties.length)];
    const doctor = specialty.doctors[Math.floor(Math.random() * specialty.doctors.length)];

    // Future date (1-14 days from now)
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + Math.floor(Math.random() * 14) + 1);

    // Random time (9:00 - 17:00)
    const hour = 9 + Math.floor(Math.random() * 9);
    const minute = Math.random() < 0.5 ? '00' : '30';

    // Format date as DD/MM/YYYY HH:MM
    const day = String(futureDate.getDate()).padStart(2, '0');
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const year = futureDate.getFullYear();
    const fechaCita = `${day}/${month}/${year} ${hour}:${minute}`;

    appointments.push({
        'RUT': patient.RUT,
        'Nombre': patient.Nombre,
        'Teléfono': patient.Teléfono,
        'Fecha Cita': fechaCita,
        'Especialidad': specialty.name,
        'Doctor': doctor,
    });
}

console.log(`✅ Generated ${appointments.length} sample appointments\n`);

// Show sample
console.log('📋 Sample appointments:');
console.log(JSON.stringify(appointments.slice(0, 3), null, 2));
console.log('');

// Create workbook
const wsNew = XLSX.utils.json_to_sheet(appointments);
const wbNew = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbNew, wsNew, 'Citas');

// Write to file
const outputFile = '/Users/autonomos_dev/Projects/smartSalud_V5/backend/sample_appointments.xlsx';
XLSX.writeFile(wbNew, outputFile);

console.log(`✅ Created ${outputFile}`);
console.log(`📊 Total appointments: ${appointments.length}`);
console.log('\n✨ Ready to import!\n');
