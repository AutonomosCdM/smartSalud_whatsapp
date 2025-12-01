import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const excelDir = '/Users/autonomos_dev/Projects/smartSalud_V5/excel';

function cleanContent(val: any): string {
    if (!val) return '';
    return String(val).replace(/\s+/g, ' ').trim();
}

function extractRut(row: string[]): { rut: string; index: number } | null {
    for (let i = 0; i < row.length; i++) {
        const cell = cleanContent(row[i]);
        const rutMatch = cell.match(/(\d{7,8})-?([0-9Kk])/);
        if (rutMatch) {
            return { rut: `${rutMatch[1]}-${rutMatch[2].toUpperCase()}`, index: i };
        }
    }
    return null;
}

function extractTime(row: string[], startIdx: number): string | null {
    for (let i = startIdx; i < row.length; i++) {
        const cell = cleanContent(row[i]);
        const timeMatch = cell.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) return cell;
    }
    return null;
}

function extractPhone(row: string[], startIdx: number): string | null {
    for (let i = startIdx; i < row.length; i++) {
        const cell = cleanContent(row[i]);
        const phoneMatch = cell.match(/9\d{8}/);
        if (phoneMatch) return `+56${phoneMatch[0]}`;
    }
    return null;
}

async function upsertPatient(rut: string, name: string, phone: string | null) {
    return await prisma.patient.upsert({
        where: { rut },
        update: {
            name,
            ...(phone && { phone })
        },
        create: {
            rut,
            name,
            phone: phone || '+56900000000'
        }
    });
}

async function createAppointment(patientId: string, time: string, baseDate: Date) {
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDate = new Date(baseDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const existing = await prisma.appointment.findFirst({
        where: {
            patientId,
            appointmentDate
        }
    });

    if (existing) return false;

    await prisma.appointment.create({
        data: {
            patientId,
            appointmentDate,
            status: 'AGENDADO'
        }
    });
    return true;
}

async function importDailySheet(filePath: string) {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Importing: ${fileName}`);

    // Extract date from filename (e.g., hoja_diaria_modulo_28_11_2025.xlsx)
    const dateMatch = fileName.match(/(\d{2})_(\d{2})_(\d{4})/);
    const baseDate = dateMatch
        ? new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]))
        : new Date(2025, 10, 28); // Default: 28 Nov 2025

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' }) as any[][];

    let appointmentsCount = 0;
    let patientsCount = 0;

    for (const row of rows) {
        if (!row || row.length === 0) continue;

        const cleanRow = row.map(cell => cleanContent(cell));
        const rutData = extractRut(cleanRow);

        if (rutData) {
            const { rut, index: rutIndex } = rutData;
            const name = cleanRow[rutIndex + 1];

            if (name && name.length > 2) {
                const time = extractTime(cleanRow, rutIndex);
                const phoneStartIndex = cleanRow.findIndex(c => c === time) > -1
                    ? cleanRow.findIndex(c => c === time)
                    : rutIndex;
                const phone = extractPhone(cleanRow, phoneStartIndex);

                const patient = await upsertPatient(rut, name, phone);
                patientsCount++;

                if (time) {
                    const created = await createAppointment(patient.id, time, baseDate);
                    if (created) appointmentsCount++;
                }
            }
        }
    }

    console.log(`   ✅ ${patientsCount} patients, ${appointmentsCount} appointments`);
    return { patients: patientsCount, appointments: appointmentsCount };
}

async function main() {
    console.log('=== Importing All Daily Sheets ===\n');

    const files = fs.readdirSync(excelDir)
        .filter(f => f.startsWith('hoja_diaria') && (f.endsWith('.xls') || f.endsWith('.xlsx')))
        .map(f => path.join(excelDir, f));

    console.log(`Found ${files.length} daily sheets\n`);

    let totalPatients = 0;
    let totalAppointments = 0;

    for (const file of files) {
        const result = await importDailySheet(file);
        totalPatients += result.patients;
        totalAppointments += result.appointments;
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`Total patients processed: ${totalPatients}`);
    console.log(`Total appointments created: ${totalAppointments}`);

    await prisma.$disconnect();
}

main();
