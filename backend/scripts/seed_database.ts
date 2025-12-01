
import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Patients
    const patients = [
        {
            rut: '11111111-1',
            name: 'Juan Pérez',
            phone: '+56912345678',
            email: 'juan.perez@example.com',
            riskLevel: 'G1',
            sector: 'Norte',
        },
        {
            rut: '22222222-2',
            name: 'María González',
            phone: '+56987654321',
            email: 'maria.gonzalez@example.com',
            riskLevel: 'G2',
            sector: 'Sur',
        },
        {
            rut: '33333333-3',
            name: 'Carlos López',
            phone: '+56911223344',
            email: 'carlos.lopez@example.com',
            riskLevel: 'G3',
            sector: 'Centro',
        },
    ];

    for (const p of patients) {
        await prisma.patient.upsert({
            where: { rut: p.rut },
            update: {},
            create: p,
        });
    }

    console.log('✅ Patients created');

    // Get patients to link appointments
    const dbPatients = await prisma.patient.findMany();

    // Create Appointments
    const appointments = [
        {
            patientId: dbPatients[0].id,
            appointmentDate: new Date(Date.now() + 86400000 * 1), // Tomorrow
            specialty: 'Medicina General',
            doctorName: 'Dr. Silva',
            status: AppointmentStatus.AGENDADO,
        },
        {
            patientId: dbPatients[0].id,
            appointmentDate: new Date(Date.now() + 86400000 * 3), // In 3 days
            specialty: 'Cardiología',
            doctorName: 'Dra. Rojas',
            status: AppointmentStatus.CONFIRMADO,
        },
        {
            patientId: dbPatients[1].id,
            appointmentDate: new Date(Date.now() + 86400000 * 2), // In 2 days
            specialty: 'Dermatología',
            doctorName: 'Dr. Soto',
            status: AppointmentStatus.PENDIENTE_LLAMADA,
        },
        {
            patientId: dbPatients[2].id,
            appointmentDate: new Date(Date.now() + 86400000 * 5), // In 5 days
            specialty: 'Traumatología',
            doctorName: 'Dra. Vega',
            status: AppointmentStatus.AGENDADO,
        },
    ];

    for (const a of appointments) {
        await prisma.appointment.create({
            data: a,
        });
    }

    console.log(`✅ ${appointments.length} Appointments created`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
