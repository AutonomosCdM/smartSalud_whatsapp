import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';


const prisma = new PrismaClient();

// File Paths
const ECICEP_FILE = '/Users/autonomos_dev/Projects/smartSalud_V5/CONSOLIDADO PLANTILLAS EXCEL 2/ECICEP Universal .xlsx';
const CHRONIC_FILE = '/Users/autonomos_dev/Projects/smartSalud_V5/CONSOLIDADO PLANTILLAS EXCEL 2/POBLACION BAJO CONTROL.xlsx';

// Helper to clean strings
function cleanString(val: any): string {
    if (!val) return '';
    return String(val).trim();
}

// Helper to format RUT
function formatRut(rut: any, dv: any = ''): string {
    const r = cleanString(rut).replace(/\./g, '');
    const d = cleanString(dv);
    if (!r) return '';
    if (r.includes('-')) return r; // Already formatted
    return `${r}-${d}`;
}

// Helper to parse Excel date
function parseExcelDate(serial: number): Date | null {
    if (!serial || isNaN(serial)) return null;
    // Excel base date is Dec 30 1899
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
}

async function importEcicep() {
    console.log('--- Importing ECICEP (Risk Profiles) ---');
    const workbook = XLSX.readFile(ECICEP_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2 }) as any[][]; // Start from row 2 (data)

    let count = 0;
    for (const row of rows) {
        if (!row || row.length < 5) continue;

        // Based on inspection:
        // Col 0: Sector
        // Col 1: Risk (G3 + CPU, etc.)
        // Col 2: State (NO INGRESADO, FALLECIDO)
        // Col 4: RUT Body
        // Col 5: DV
        // Col 6: Name
        // Col 7: Last Name 1
        // Col 8: Last Name 2
        // Col 10: Care Team Doctor

        const sector = cleanString(row[0]);
        const riskRaw = cleanString(row[1]);
        const state = cleanString(row[2]);
        const rutBody = row[4];
        const dv = row[5];
        const name = cleanString(row[6]);
        const lastName1 = cleanString(row[7]);
        const lastName2 = cleanString(row[8]);
        const doctor = cleanString(row[10]);

        const rut = formatRut(rutBody, dv);
        if (!rut || rut.length < 3) continue;

        const fullName = `${name} ${lastName1} ${lastName2}`.trim();

        // Extract Risk Level (G1, G2, G3)
        let riskLevel = 'G1'; // Default
        if (riskRaw.includes('G3')) riskLevel = 'G3';
        else if (riskRaw.includes('G2')) riskLevel = 'G2';

        const deceased = state.toUpperCase().includes('FALLECIDO');

        // Upsert Patient
        await prisma.patient.upsert({
            where: { rut },
            update: {
                sector,
                riskLevel,
                careTeamDoctor: doctor,
                deceased
            },
            create: {
                rut,
                name: fullName,
                phone: '+56900000000', // Placeholder if not exists
                sector,
                riskLevel,
                careTeamDoctor: doctor,
                deceased
            }
        });
        count++;
        if (count % 100 === 0) process.stdout.write('.');
    }
    console.log(`\nProcessed ${count} patients from ECICEP.`);
}

async function importChronic() {
    console.log('--- Importing Chronic Programs ---');
    const workbook = XLSX.readFile(CHRONIC_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1 }) as any[][]; // Start from row 1 (data)

    let count = 0;
    for (const row of rows) {
        if (!row || row.length < 5) continue;

        // Based on inspection:
        // Col 0: PROGRAMA
        // Col 4: RUT
        // Col 5: F.NACIMIENTO
        // Col 7: NIVEL DE CONTROL
        // Col 8: SECTOR

        const programName = cleanString(row[0]);
        const rut = cleanString(row[4]);
        const birthDateRaw = row[5];
        const controlLevel = cleanString(row[7]);
        const sector = cleanString(row[8]);

        if (!rut || rut.length < 3) continue;

        const birthDate = typeof birthDateRaw === 'number' ? parseExcelDate(birthDateRaw) : null;

        // Update Patient (BirthDate & Sector if missing)
        const patient = await prisma.patient.upsert({
            where: { rut },
            update: {
                birthDate: birthDate || undefined,
                sector: sector || undefined
            },
            create: {
                rut,
                name: 'UNKNOWN', // Should have been created by ECICEP or other source
                phone: '+56900000000',
                birthDate,
                sector
            }
        });

        // Create Chronic Program Entry
        await prisma.chronicProgram.create({
            data: {
                patientId: patient.id,
                name: programName,
                controlLevel,
                // nextControl: ... (parse if available)
            }
        });

        count++;
        if (count % 100 === 0) process.stdout.write('.');
    }
    console.log(`\nProcessed ${count} chronic program entries.`);
}

async function main() {
    try {
        await importEcicep();
        await importChronic();
        console.log('Clinical Data Import Completed Successfully! ✅');
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
