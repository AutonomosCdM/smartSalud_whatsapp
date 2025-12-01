const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Reset database - Delete all appointments and patients
 * WARNING: This is irreversible!
 */

async function resetDatabase() {
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!\n');

    try {
        // Delete all appointments first (foreign key constraint)
        console.log('🗑️  Deleting all appointments...');
        const deletedAppointments = await prisma.appointment.deleteMany({});
        console.log(`   ✅ Deleted ${deletedAppointments.count} appointments`);

        // Delete all patients
        console.log('🗑️  Deleting all patients...');
        const deletedPatients = await prisma.patient.deleteMany({});
        console.log(`   ✅ Deleted ${deletedPatients.count} patients`);

        console.log('\n✨ Database reset complete!\n');
        console.log('Next step: Import production_patients.xlsx via the application');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
