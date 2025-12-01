import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const filePath = '/Users/autonomos_dev/Projects/smartSalud_V5/CONSOLIDADO PLANTILLAS EXCEL 2/ECICEP Universal .xlsx';

function cleanString(val: any): string {
    if (!val) return '';
    return String(val).trim();
}

function formatRut(rut: any, dv: any = ''): string {
    const r = cleanString(rut).replace(/\./g, '');
    const d = cleanString(dv);
    if (!r) return '';
    if (r.includes('-')) return r;
    return `${r}-${d}`;
}

async function main() {
    console.log('=== Importing ECICEP (Enrich Mode - NO phone overwrite) ===\n');

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2 }) as any[][];

    let count = 0;
    let enriched = 0;

    for (const row of rows) {
        if (!row || row.length < 5) continue;

        // Columns:
        // 0: Sector info
        // 1: ESTRATIFICACION_RIESGO_ACTUAL
        // 2: ESTADO
        // 4: RUT
        // 5: DV
        // 6: NOMBRE
        // 7: PRIMER_APELLIDO
        // 8: SEGUNDO_APELLIDO
        // 10: MEDICO CABECERA

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
        if (!fullName || fullName.length < 3) continue;

        // Extract Risk Level
        let riskLevel = 'G1';
        if (riskRaw.includes('G3')) riskLevel = 'G3';
        else if (riskRaw.includes('G2')) riskLevel = 'G2';

        const deceased = state.toUpperCase().includes('FALLECIDO');

        console.log(`Enriching: ${fullName} (${rut}) - Risk: ${riskLevel}`);

        // ENRICH MODE: Only update risk/doctor/sector, NEVER touch phone
        const existing = await prisma.patient.findUnique({ where: { rut } });

        if (existing) {
            await prisma.patient.update({
                where: { rut },
                data: {
                    sector: sector || undefined,
                    riskLevel,
                    careTeamDoctor: doctor || undefined,
                    deceased
                }
            });
            enriched++;
        } else {
            // Create new patient (shouldn't happen if we imported PAD/POBLACION first)
            await prisma.patient.create({
                data: {
                    rut,
                    name: fullName,
                    phone: '+56900000000', // Placeholder
                    sector,
                    riskLevel,
                    careTeamDoctor: doctor,
                    deceased
                }
            });
        }

        count++;
        if (count % 100 === 0) process.stdout.write('.');
    }

    console.log(`\n✅ Import Complete!`);
    console.log(`Total processed: ${count}`);
    console.log(`Existing patients enriched: ${enriched}`);
    console.log(`New patients created: ${count - enriched}`);

    await prisma.$disconnect();
}

main();
