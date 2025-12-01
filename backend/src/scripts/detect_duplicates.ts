import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateInfo {
    patientId: string;
    patientName: string;
    patientRut: string;
    appointments: {
        id: string;
        date: Date;
        time: string;
    }[];
    duplicateType: 'SAME_DAY' | 'SAME_WEEK';
}

async function detectDuplicates() {
    console.log('=== Detectando Citas Duplicadas ===\n');

    const appointments = await prisma.appointment.findMany({
        include: { patient: true },
        orderBy: [
            { patientId: 'asc' },
            { appointmentDate: 'asc' }
        ]
    });

    const duplicates: DuplicateInfo[] = [];
    const patientAppointments = new Map<string, typeof appointments>();

    // Agrupar por paciente
    for (const apt of appointments) {
        if (!patientAppointments.has(apt.patientId)) {
            patientAppointments.set(apt.patientId, []);
        }
        patientAppointments.get(apt.patientId)!.push(apt);
    }

    // Detectar duplicados
    for (const [patientId, apts] of patientAppointments) {
        if (apts.length < 2) continue;

        for (let i = 0; i < apts.length; i++) {
            for (let j = i + 1; j < apts.length; j++) {
                const apt1 = apts[i];
                const apt2 = apts[j];

                const date1 = new Date(apt1.appointmentDate);
                const date2 = new Date(apt2.appointmentDate);

                // Mismo día
                if (date1.toDateString() === date2.toDateString()) {
                    duplicates.push({
                        patientId,
                        patientName: apt1.patient.name,
                        patientRut: apt1.patient.rut,
                        appointments: [
                            { id: apt1.id, date: date1, time: date1.toLocaleTimeString() },
                            { id: apt2.id, date: date2, time: date2.toLocaleTimeString() }
                        ],
                        duplicateType: 'SAME_DAY'
                    });
                }
                // Misma semana (7 días)
                else {
                    const diffTime = Math.abs(date2.getTime() - date1.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7) {
                        duplicates.push({
                            patientId,
                            patientName: apt1.patient.name,
                            patientRut: apt1.patient.rut,
                            appointments: [
                                { id: apt1.id, date: date1, time: date1.toLocaleTimeString() },
                                { id: apt2.id, date: date2, time: date2.toLocaleTimeString() }
                            ],
                            duplicateType: 'SAME_WEEK'
                        });
                    }
                }
            }
        }
    }

    // Mostrar resultados
    console.log(`\n📊 Resumen de Duplicados:\n`);
    console.log(`Total de pacientes con citas: ${patientAppointments.size}`);
    console.log(`Duplicados encontrados: ${duplicates.length}\n`);

    const sameDayCount = duplicates.filter(d => d.duplicateType === 'SAME_DAY').length;
    const sameWeekCount = duplicates.filter(d => d.duplicateType === 'SAME_WEEK').length;

    console.log(`- Mismo día: ${sameDayCount}`);
    console.log(`- Misma semana: ${sameWeekCount}\n`);

    if (duplicates.length > 0) {
        console.log('Ejemplos de duplicados:\n');
        duplicates.slice(0, 5).forEach((dup, idx) => {
            console.log(`${idx + 1}. ${dup.patientName} (${dup.patientRut}) - ${dup.duplicateType}`);
            dup.appointments.forEach(apt => {
                console.log(`   - ${apt.date.toLocaleDateString()} ${apt.time}`);
            });
            console.log('');
        });
    }

    await prisma.$disconnect();
    return duplicates;
}

detectDuplicates();
