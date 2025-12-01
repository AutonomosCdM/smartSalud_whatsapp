import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { parse } from 'node-html-parser';

const prisma = new PrismaClient();
const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/excel/hoja_diaria_modulo_28_11_2025.xlsx';

// --- Helper Functions ---

function cleanContent(text: any): string {
    if (!text) return '';
    const str = text.toString();
    // Remove initial ">" if present (artifact of the file)
    let cleaned = str.startsWith('>') ? str.substring(1) : str;

    if (cleaned.includes('<')) {
        const root = parse(cleaned);
        cleaned = root.textContent?.trim() || '';
    }
    return cleaned.trim();
}

function cleanPhone(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9]/g, '');
    // Look for 9xxxxxxxx pattern (Chilean mobile)
    const match = clean.match(/9\d{8}/);
    if (match) {
        return `+56${match[0]}`;
    }
    return clean;
}

function extractRut(row: string[]): { rut: string; index: number } | null {
    // Regex for RUT: 12345678-9 or 1234567-K
    const index = row.findIndex(cell => /^\d{7,8}-[\dkK]$/.test(cell));
    return index !== -1 ? { rut: row[index], index } : null;
}

function extractTime(row: string[], startIndex: number): string | null {
    // Search for Time (HH:MM) after the given index
    const index = row.findIndex((cell, idx) => idx > startIndex && /^\d{1,2}:\d{2}$/.test(cell));
    return index !== -1 ? row[index] : null;
}

function extractPhone(row: string[], startIndex: number): string {
    // Search for Phone after the given index
    const index = row.findIndex((cell, idx) => idx > startIndex && /\d{8,}/.test(cell));
    const rawPhone = index !== -1 ? row[index] : '';
    return cleanPhone(rawPhone) || '+56900000000';
}

async function upsertPatient(rut: string, name: string, phone: string) {
    return prisma.patient.upsert({
        where: { rut },
        update: { name, phone },
        create: {
            rut,
            name,
            phone,
            email: `${rut}@placeholder.com`
        }
    });
}

async function createAppointment(patientId: string, time: string, baseDate: Date) {
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDate = new Date(baseDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Check for duplicates
    const existing = await prisma.appointment.findFirst({
        where: {
            patientId,
            appointmentDate
        }
    });

    if (!existing) {
        await prisma.appointment.create({
            data: {
                patientId,
                appointmentDate,
                status: 'AGENDADO',
                specialty: 'GENERAL',
                doctorName: 'STAFF'
            }
        });
        return true; // Created
    }
    return false; // Skipped
}

// --- Main Logic ---

async function main() {
    console.log('Starting heuristic import (Refactored)...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        let appointmentsCount = 0;
        let patientsCount = 0;
        const baseDate = new Date(2025, 10, 28); // 28 Nov 2025

        for (const row of rows) {
            if (!row || row.length === 0) continue;

            const cleanRow = row.map(cell => cleanContent(cell));
            const rutData = extractRut(cleanRow);

            if (rutData) {
                const { rut, index: rutIndex } = rutData;
                const name = cleanRow[rutIndex + 1]; // Name is usually right after RUT

                if (name && name.length > 2) {
                    const time = extractTime(cleanRow, rutIndex);
                    // Phone is usually after time, or after name if no time
                    const phoneStartIndex = cleanRow.findIndex(c => c === time) > -1
                        ? cleanRow.findIndex(c => c === time)
                        : rutIndex;
                    const phone = extractPhone(cleanRow, phoneStartIndex);

                    console.log(`Found: ${name} (${rut}) - Time: ${time} - Phone: ${phone}`);

                    const patient = await upsertPatient(rut, name, phone);
                    patientsCount++;

                    if (time) {
                        const created = await createAppointment(patient.id, time, baseDate);
                        if (created) appointmentsCount++;
                    }
                }
            }
        }

        console.log(`Import completed!`);
        console.log(`Patients processed: ${patientsCount}`);
        console.log(`Appointments created: ${appointmentsCount}`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
