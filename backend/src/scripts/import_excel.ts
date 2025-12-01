import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { parse } from 'node-html-parser';

const prisma = new PrismaClient();
const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/excel/hoja_diaria_modulo_28_11_2025.xlsx';

// Helper to clean HTML content
function cleanContent(text: string): string {
    if (!text) return '';
    // If text contains HTML tags, parse and extract text
    if (text.includes('<')) {
        const root = parse(text);
        return root.textContent?.trim() || '';
    }
    return text.toString().trim();
}

// Helper to clean phone number
function cleanPhone(phone: string): string {
    if (!phone) return '';
    // Extract first sequence of digits, handle multiple phones separated by - or /
    const clean = phone.replace(/[^0-9\-\/]/g, '');
    const firstPhone = clean.split(/[\-\/]/)[0];

    // Add +569 if it looks like a mobile number (9 digits starting with 9)
    if (firstPhone.length === 9 && firstPhone.startsWith('9')) {
        return `+56${firstPhone}`;
    }
    // Add +56 if 8 digits (landline) - though less likely for SMS/WhatsApp
    if (firstPhone.length === 8) {
        return `+56${firstPhone}`;
    }

    return firstPhone;
}

async function main() {
    console.log('Starting import...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        let appointmentsCount = 0;
        let patientsCount = 0;

        // Date from filename: 28_11_2025
        const baseDate = new Date(2025, 10, 28); // Month is 0-indexed: 10 = November

        // Find header row index
        // The file has multiple sections, so we need to scan for headers repeatedly

        // Indices map based on the header row we saw in inspection
        // N°, CTA, RUT, APELLIDOS Y NOMBRES, NOMBRE SOCIAL, EDAD, FICHA, HORA, FONO CONTACTO...
        // We'll look for "RUT" and "APELLIDOS Y NOMBRES" to identify header rows

        let currentSpecialty = '';
        let currentProfessional = '';

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i].map(cell => cleanContent(cell));

            // Check for metadata
            if (row[0]?.includes('ESPECIALIDAD:')) currentSpecialty = row[1];
            if (row[0]?.includes('PROFESIONAL:')) currentProfessional = row[1];

            // Check if this is a header row
            if (row.includes('RUT') && row.includes('APELLIDOS Y NOMBRES')) {
                // Found a header, process subsequent rows until empty or new header
                const rutIdx = row.indexOf('RUT');
                const nameIdx = row.indexOf('APELLIDOS Y NOMBRES');
                const phoneIdx = row.indexOf('FONO CONTACTO');
                const timeIdx = row.indexOf('HORA');

                // Process data rows
                let j = i + 1;
                while (j < rows.length) {
                    const dataRow = rows[j].map(cell => cleanContent(cell));

                    // Stop if row is empty or looks like a new header/metadata
                    if (!dataRow[rutIdx] || dataRow[0]?.includes('ESPECIALIDAD') || dataRow.includes('RUT')) {
                        break;
                    }

                    const rut = dataRow[rutIdx];
                    const name = dataRow[nameIdx];
                    const rawPhone = dataRow[phoneIdx];
                    const time = dataRow[timeIdx];

                    if (rut && name) {
                        const phone = cleanPhone(rawPhone);

                        // Create/Update Patient
                        const patient = await prisma.patient.upsert({
                            where: { rut },
                            update: {
                                name,
                                phone: phone || undefined // Only update phone if we have a valid one
                            },
                            create: {
                                rut,
                                name,
                                phone: phone || '+56900000000', // Fallback if no phone
                                email: `${rut}@placeholder.com` // Placeholder email
                            }
                        });
                        patientsCount++;

                        // Create Appointment
                        if (time) {
                            const [hours, minutes] = time.split(':').map(Number);
                            const appointmentDate = new Date(baseDate);
                            appointmentDate.setHours(hours, minutes, 0, 0);

                            await prisma.appointment.create({
                                data: {
                                    patientId: patient.id,
                                    date: appointmentDate,
                                    status: 'SCHEDULED',
                                    type: currentSpecialty || 'GENERAL',
                                    professional: currentProfessional || 'STAFF'
                                }
                            });
                            appointmentsCount++;
                        }
                    }
                    j++;
                }
                i = j - 1; // Skip processed rows
            }
        }

        console.log(`Import completed successfully!`);
        console.log(`Processed ${patientsCount} patients (upserted)`);
        console.log(`Created ${appointmentsCount} appointments`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
