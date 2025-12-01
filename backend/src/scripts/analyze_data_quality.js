const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeDataQuality() {
    console.log('=== Data Quality Analysis ===\n');

    // Total patients
    const total = await prisma.patient.count();
    console.log(`Total Patients: ${total}\n`);

    // Patients by source
    const withRisk = await prisma.patient.count({ where: { riskLevel: { not: null } } });
    const withoutRisk = total - withRisk;
    console.log('By Source:');
    console.log(`  From ECICEP (with risk): ${withRisk}`);
    console.log(`  From Daily Sheets (appointments only): ${withoutRisk}\n`);

    // Field completeness
    const withEmail = await prisma.patient.count({ where: { email: { not: null, not: '' } } });
    const withBirthDate = await prisma.patient.count({ where: { birthDate: { not: null } } });
    const withSector = await prisma.patient.count({ where: { sector: { not: null } } });
    const withDoctor = await prisma.patient.count({ where: { careTeamDoctor: { not: null } } });
    const withPlaceholderPhone = await prisma.patient.count({ where: { phone: '+56900000000' } });
    const withRealPhone = total - withPlaceholderPhone;

    console.log('Field Completeness:');
    console.log(`  Email: ${withEmail}/${total} (${(withEmail / total * 100).toFixed(1)}%)`);
    console.log(`  BirthDate: ${withBirthDate}/${total} (${(withBirthDate / total * 100).toFixed(1)}%)`);
    console.log(`  Sector: ${withSector}/${total} (${(withSector / total * 100).toFixed(1)}%)`);
    console.log(`  Care Team Doctor: ${withDoctor}/${total} (${(withDoctor / total * 100).toFixed(1)}%)`);
    console.log(`  Real Phone: ${withRealPhone}/${total} (${(withRealPhone / total * 100).toFixed(1)}%)`);
    console.log(`  Placeholder Phone: ${withPlaceholderPhone}/${total} (${(withPlaceholderPhone / total * 100).toFixed(1)}%)\n`);

    // Sample patients from ECICEP
    console.log('=== Sample ECICEP Patients (with full data) ===');
    const ecicepSamples = await prisma.patient.findMany({
        where: { riskLevel: { not: null } },
        take: 3
    });
    ecicepSamples.forEach(p => {
        console.log(`${p.name} (${p.rut})`);
        console.log(`  Risk: ${p.riskLevel}, Sector: ${p.sector}, Doctor: ${p.careTeamDoctor}`);
        console.log(`  Phone: ${p.phone}, Email: ${p.email || 'NULL'}, BirthDate: ${p.birthDate || 'NULL'}\n`);
    });

    // Sample patients from Daily Sheets
    console.log('=== Sample Daily Sheet Patients (minimal data) ===');
    const dailySamples = await prisma.patient.findMany({
        where: { riskLevel: null },
        take: 3
    });
    dailySamples.forEach(p => {
        console.log(`${p.name} (${p.rut})`);
        console.log(`  Risk: NULL, Sector: ${p.sector || 'NULL'}, Doctor: ${p.careTeamDoctor || 'NULL'}`);
        console.log(`  Phone: ${p.phone}, Email: ${p.email || 'NULL'}, BirthDate: ${p.birthDate || 'NULL'}\n`);
    });

    await prisma.$disconnect();
}

analyzeDataQuality();
