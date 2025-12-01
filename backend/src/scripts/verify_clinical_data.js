const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
    console.log('=== Database Verification Report ===\n');

    // Count patients with risk levels
    const patientsWithRisk = await prisma.patient.count({
        where: {
            riskLevel: { not: null }
        }
    });

    const riskDistribution = await prisma.patient.groupBy({
        by: ['riskLevel'],
        _count: true
    });

    console.log(`Patients with Risk Level: ${patientsWithRisk}`);
    console.log('Risk Distribution:');
    riskDistribution.forEach(r => {
        console.log(`  ${r.riskLevel || 'NULL'}: ${r._count} patients`);
    });

    // Count chronic programs
    const totalPrograms = await prisma.chronicProgram.count();
    const programDistribution = await prisma.chronicProgram.groupBy({
        by: ['name'],
        _count: true
    });

    console.log(`\nTotal Chronic Programs: ${totalPrograms}`);
    console.log('Program Distribution:');
    programDistribution.forEach(p => {
        console.log(`  ${p.name}: ${p._count} entries`);
    });

    // Sample patient with full data
    const samplePatient = await prisma.patient.findFirst({
        where: {
            riskLevel: 'G3'
        },
        include: {
            programs: true
        }
    });

    if (samplePatient) {
        console.log('\n=== Sample G3 Patient ===');
        console.log(JSON.stringify(samplePatient, null, 2));
    }

    await prisma.$disconnect();
}

verifyData();
