import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const STATUSES: AppointmentStatus[] = ['CONFIRMADO', 'CANCELADO', 'CONTACTAR', 'REAGENDADO', 'AGENDADO'];

async function assignSyntheticStatuses() {
    console.log('=== Asignando Estados Sintéticos ===\n');

    const appointments = await prisma.appointment.findMany();

    console.log(`Encontradas ${appointments.length} citas\n`);

    let count = 0;
    for (const apt of appointments) {
        // Assign random status
        const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];

        await prisma.appointment.update({
            where: { id: apt.id },
            data: { status: randomStatus }
        });

        count++;
        if (count % 100 === 0) {
            console.log(`Procesadas ${count} citas...`);
        }
    }

    console.log(`\n✅ Asignados estados a ${count} citas`);

    // Show distribution
    const distribution = await prisma.appointment.groupBy({
        by: ['status'],
        _count: true
    });

    console.log('\n📊 Distribución de estados:');
    distribution.forEach(d => {
        console.log(`  ${d.status}: ${d._count} citas`);
    });

    await prisma.$disconnect();
}

assignSyntheticStatuses();
