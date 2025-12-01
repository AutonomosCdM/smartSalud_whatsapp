import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/CONSOLIDADO PLANTILLAS EXCEL 2/POBLACION BAJO CONTROL.xlsx';

function cleanString(val: any): string {
    if (!val) return '';
    return String(val).trim();
}

function cleanPhone(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9]/g, '');
    const match = clean.match(/9\d{8}/);
    if (match) {
        return `+56${match[0]}`;
    }
    return clean;
}

function parseExcelDate(serial: number): Date | null {
    if (!serial || isNaN(serial)) return null;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    return new Date(utc_value * 1000);
}

async function main() {
    console.log('=== Importing POBLACION BAJO CONTROL (Merge Mode) ===\n');

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1 }) as any[][];

    let count = 0;
    let programsCreated = 0;

    for (const row of rows) {
        if (!row || row.length < 5) continue;

        // Columns:
        // 0: PROGRAMA
        // 1: NOMBRE
        // 2: APELLIDO PATERNO
        // 3: APELLIDO MATERNO
        // 4: RUT
        // 5: F.NACIMIENTO
        // 6: EDAD
        // 7: NIVEL DE CONTROL
        // 8: SECTOR
        // 15: CONTACTO

        const programName = cleanString(row[0]);
        const firstName = cleanString(row[1]);
        const lastName1 = cleanString(row[2]);
        const lastName2 = cleanString(row[3]);
        const rut = cleanString(row[4]);
        const birthDateRaw = row[5];
        const controlLevel = cleanString(row[7]);
        const sector = cleanString(row[8]);
        const contactRaw = cleanString(row[15]);

        if (!rut || rut.length < 3) continue;
        if (!firstName || firstName === 'NOMBRE') continue; // Skip header

        const fullName = `${firstName} ${lastName1} ${lastName2}`.trim();
        const birthDate = typeof birthDateRaw === 'number' ? parseExcelDate(birthDateRaw) : null;
        const phone = cleanPhone(contactRaw) || undefined;

        console.log(`Processing: ${fullName} (${rut})`);

        // Upsert patient (merge mode - only update if field is empty)
        const patient = await prisma.patient.upsert({
            where: { rut },
            update: {
                birthDate: birthDate || undefined,
                sector: sector || undefined,
                // Only update phone if we have a better one
                ...(phone && { phone })
            },
            create: {
                rut,
                name: fullName,
                phone: phone || '+56900000000',
                birthDate,
                sector
            }
        });

        // Create chronic program entry
        if (programName) {
            await prisma.chronicProgram.create({
                data: {
                    patientId: patient.id,
                    name: programName,
                    controlLevel
                }
            });
            programsCreated++;
        }

        count++;
        if (count % 100 === 0) process.stdout.write('.');
    }

    console.log(`\n✅ Import Complete!`);
    console.log(`Patients processed: ${count}`);
    console.log(`Programs created: ${programsCreated}`);

    await prisma.$disconnect();
}

main();
