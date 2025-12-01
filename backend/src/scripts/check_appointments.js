const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAppointments() {
    const count = await prisma.appointment.count();
    console.log(`Total appointments: ${count}`);

    const appointments = await prisma.appointment.findMany({
        include: { patient: true },
        take: 30,
        orderBy: { appointmentDate: 'asc' }
    });

    console.log('\nAppointments:');
    appointments.forEach((apt, idx) => {
        console.log(`${idx + 1}. ${apt.patient.name} - ${apt.appointmentDate.toLocaleString()} - ${apt.status}`);
    });

    await prisma.$disconnect();
}

checkAppointments();
