
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting real data import...');

    // 1. Read Excel file
    const excelPath = path.join(__dirname, '../production_patients.xlsx');
    console.log(`📖 Reading file: ${excelPath}`);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const patientsData = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`✅ Found ${patientsData.length} patients in Excel`);

    // 2. Import Patients (Batching to avoid memory issues)
    console.log('📥 Importing patients...');

    let importedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < patientsData.length; i += batchSize) {
        const batch = patientsData.slice(i, i + batchSize);

        await Promise.all(batch.map(async (p) => {
            try {
                await prisma.patient.upsert({
                    where: { rut: p.RUT },
                    update: {
                        name: p.Nombre,
                        phone: p['Teléfono'] || '+56900000000',
                        email: p.Email || null,
                    },
                    create: {
                        rut: p.RUT,
                        name: p.Nombre,
                        phone: p['Teléfono'] || '+56900000000',
                        email: p.Email || null,
                    },
                });
            } catch (e) {
                console.error(`❌ Error importing patient ${p.RUT}:`, e);
            }
        }));

        importedCount += batch.length;
        if (importedCount % 1000 === 0) {
            console.log(`   Processed ${importedCount}/${patientsData.length} patients...`);
        }
    }

    console.log('✅ Patients import complete!');

    // 3. Generate Random Appointments for Real Patients
    console.log('📅 Generating random appointments for real patients...');

    // Get all patients from DB to ensure we have IDs
    const allPatients = await prisma.patient.findMany({
        select: { id: true, name: true }
    });

    // Pick 50 random patients
    const randomPatients = allPatients
        .sort(() => 0.5 - Math.random())
        .slice(0, 50);

    const doctors = ['Dr. Silva', 'Dra. Rojas', 'Dr. Soto', 'Dra. Vega', 'Dr. Muñoz'];
    const specialties = ['Medicina General', 'Cardiología', 'Dermatología', 'Traumatología', 'Pediatría'];
    const statuses = Object.values(AppointmentStatus);

    for (const patient of randomPatients) {
        // Random date within next 14 days
        const daysAhead = Math.floor(Math.random() * 14) + 1;
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + daysAhead);
        appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0); // 9 AM to 5 PM

        await prisma.appointment.create({
            data: {
                patientId: patient.id,
                appointmentDate: appointmentDate,
                specialty: specialties[Math.floor(Math.random() * specialties.length)],
                doctorName: doctors[Math.floor(Math.random() * doctors.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
            }
        });
    }

    console.log(`✅ Generated 50 appointments for real patients`);
    console.log('✨ Import process finished successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
