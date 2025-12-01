import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYNTHETIC_DOCTORS = [
    'Dr. Roberto Martínez',
    'Dra. Catalina Pardo',
    'Dr. Fabián Sepúlveda',
    'Dra. María González',
    'Dr. Juan Pérez',
    'Dra. Ana Silva',
    'Dr. Carlos Rojas',
    'Dra. Patricia Muñoz'
];

async function assignDoctors() {
    console.log('=== Asignando Doctores Sintéticos ===\n');

    const appointments = await prisma.appointment.findMany({
        where: {
            OR: [
                { doctorName: null },
                { doctorName: '' }
            ]
        }
    });

    console.log(`Encontradas ${appointments.length} citas sin doctor asignado\n`);

    let count = 0;
    for (const apt of appointments) {
        const randomDoctor = SYNTHETIC_DOCTORS[Math.floor(Math.random() * SYNTHETIC_DOCTORS.length)];
        const gender = randomDoctor.startsWith('Dra.') ? 'F' : 'M';

        await prisma.appointment.update({
            where: { id: apt.id },
            data: {
                doctorName: randomDoctor,
                doctorGender: gender,
                specialty: 'Medicina General'
            }
        });

        count++;
        if (count % 100 === 0) {
            console.log(`Procesadas ${count} citas...`);
        }
    }

    console.log(`\n✅ Asignados doctores a ${count} citas`);
    await prisma.$disconnect();
}

assignDoctors();
