import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSwappedNameRut() {
    console.log('=== Corrigiendo Nombres y RUTs Intercambiados ===\n');

    // Find patients where name looks like a RUT (format: 12345678-9)
    const patients = await prisma.patient.findMany();

    let swapped = 0;
    let correct = 0;

    for (const patient of patients) {
        // Check if name looks like a RUT (format: 12345678-9 or 1234567-K)
        const nameIsRut = /^\d{7,8}-[\dKk]$/.test(patient.name.trim());

        if (nameIsRut) {
            // Swap using a transaction with temporary value
            const tempRut = `TEMP_${patient.id}`;

            await prisma.$transaction(async (tx) => {
                // Step 1: Set RUT to temp value
                await tx.patient.update({
                    where: { id: patient.id },
                    data: { rut: tempRut }
                });

                // Step 2: Swap name and rut
                await tx.patient.update({
                    where: { id: patient.id },
                    data: {
                        name: patient.rut,
                        rut: patient.name
                    }
                });
            });

            swapped++;

            if (swapped <= 5) {
                console.log(`Intercambiado: "${patient.name}" ↔ "${patient.rut}"`);
            }
        } else {
            correct++;
        }
    }

    console.log(`\n✅ Procesados ${patients.length} pacientes`);
    console.log(`   - Intercambiados: ${swapped}`);
    console.log(`   - Correctos: ${correct}`);

    await prisma.$disconnect();
}

fixSwappedNameRut();
