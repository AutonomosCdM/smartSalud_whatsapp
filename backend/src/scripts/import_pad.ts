import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/CONSOLIDADO PLANTILLAS EXCEL 2/PLAN DE LOS PAD 2025.xlsx';

function cleanString(val: any): string {
    if (!val) return '';
    return String(val).trim();
}

function formatRut(rut: string): string {
    const cleaned = rut.replace(/\./g, '').trim();
    if (cleaned.includes('-')) return cleaned;
    // If no dash, assume last char is DV
    if (cleaned.length >= 2) {
        return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
    }
    return cleaned;
}

function formatPhone(phone: any): string {
    if (!phone) return '';
    const str = String(phone).replace(/[^0-9]/g, '');

    // Look for 9xxxxxxxx pattern
    const match = str.match(/9\d{8}/);
    if (match) {
        return `+56${match[0]}`;
    }

    // If it's already 9 digits starting with 9
    if (str.length === 9 && str.startsWith('9')) {
        return `+56${str}`;
    }

    return str ? `+56${str}` : '';
}

function parseExcelDate(serial: number): Date | null {
    if (!serial || isNaN(serial)) return null;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    return new Date(utc_value * 1000);
}

async function main() {
    console.log('=== Importing PLAN DE LOS PAD - ALL SHEETS (Localities) ===\n');

    const workbook = XLSX.readFile(filePath);

    let totalCount = 0;
    let totalWithPhone = 0;

    // Process each sheet (locality)
    for (const sheetName of workbook.SheetNames) {
        // Skip deceased and transfers sheets
        if (sheetName.includes('FALLECIDOS') || sheetName.includes('TRASLADOS')) {
            console.log(`⏭️  Skipping: ${sheetName}`);
            continue;
        }

        console.log(`\n📍 Processing locality: ${sheetName}`);

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1 }) as any[][];

        let count = 0;
        let withPhone = 0;

        for (const row of rows) {
            if (!row || row.length < 5) continue;

            const name = cleanString(row[1]);
            const rutRaw = cleanString(row[2]);
            // const address = cleanString(row[3]); // Not used yet
            const phoneRaw = row[4];
            const birthDateRaw = row[6];
            // const sex = cleanString(row[8]); // Not used yet

            if (!rutRaw || rutRaw.length < 3) continue;

            const rut = formatRut(rutRaw);
            const phone = formatPhone(phoneRaw);
            const birthDate = typeof birthDateRaw === 'number' ? parseExcelDate(birthDateRaw) : null;

            if (!name || name === 'NOMBRE USUARIO (A)') continue; // Skip header

            // Truncate fields to fit database constraints
            const sector = sheetName.substring(0, 50);
            const truncatedName = name.substring(0, 255);
            const truncatedPhone = phone ? phone.substring(0, 20) : '+56900000000';
            const truncatedRut = rut.substring(0, 12);

            await prisma.patient.upsert({
                where: { rut: truncatedRut },
                update: {
                    name: truncatedName,
                    phone: truncatedPhone,
                    birthDate: birthDate || undefined,
                    sector: sector
                },
                create: {
                    rut: truncatedRut,
                    name: truncatedName,
                    phone: truncatedPhone,
                    birthDate,
                    sector: sector
                }
            });

            count++;
            totalCount++;
            if (phone && phone !== '+56900000000') {
                withPhone++;
                totalWithPhone++;
            }
        }

        console.log(`   ✅ ${count} patients (${withPhone} with phone)`);
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`Total: ${totalCount} patients`);
    console.log(`With real phone: ${totalWithPhone} (${(totalWithPhone / totalCount * 100).toFixed(1)}%)`);

    await prisma.$disconnect();
}

main();
