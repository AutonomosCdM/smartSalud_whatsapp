
import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const searchTerm = 'Cesar';
    console.log(`🔍 Searching for patients with name containing "${searchTerm}"...`);

    const patients = await prisma.patient.findMany({
        where: {
            name: {
                contains: searchTerm,
                mode: 'insensitive',
            },
        },
    });

    console.log(`Found ${patients.length} patients.`);
    patients.forEach(p => console.log(`- ${p.name} (${p.rut})`));

    let targetPatient = patients.find(p =>
        p.name.toLowerCase().includes('duran') ||
        p.name.toLowerCase().includes('durán')
    );

    if (!targetPatient) {
        console.log('⚠️ Patient "Cesar Duran" not found. Creating him...');
        targetPatient = await prisma.patient.create({
            data: {
                rut: '13146871-7', // Using RUT from history if available, or a dummy one
                name: 'Cesar Alejandro Duran Mella',
                phone: '+56961797823',
                email: 'cesar.duran@example.com',
                riskLevel: 'G1',
                sector: 'Centro',
            }
        });
        console.log(`✅ Created patient: ${targetPatient.name}`);
    } else {
        console.log(`✅ Found target patient: ${targetPatient.name}`);
    }

    // Set appointment for tomorrow at 08:00 AM (to be first)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    // Check if he already has an appointment
    const existingAppointment = await prisma.appointment.findFirst({
        where: { patientId: targetPatient.id }
    });

    if (existingAppointment) {
        console.log('🔄 Updating existing appointment to be first...');
        await prisma.appointment.update({
            where: { id: existingAppointment.id },
            data: {
                appointmentDate: tomorrow,
                status: AppointmentStatus.AGENDADO,
                specialty: 'Medicina General',
                doctorName: 'Dr. Principal',
            }
        });
    } else {
        console.log('➕ Creating new appointment to be first...');
        await prisma.appointment.create({
            data: {
                patientId: targetPatient.id,
                appointmentDate: tomorrow,
                status: AppointmentStatus.AGENDADO,
                specialty: 'Medicina General',
                doctorName: 'Dr. Principal',
            }
        });
    }

    console.log(`✅ Cesar Duran is now scheduled for ${tomorrow.toLocaleString()} (should be #1)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
