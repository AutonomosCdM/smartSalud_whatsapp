const fs = require('fs');
const XLSX = require('xlsx');
const { parse } = require('node-html-parser');

/**
 * Convert HTML medical appointment files to XLSX format compatible with smartSalud import
 *
 * Input: HTML file with structure:
 * - Title: "HOJA DIARIA MÓDULO - DD/MM/YYYY"
 * - Tables with: N°, CTA, RUT, APELLIDOS Y NOMBRES, HORA, FONO CONTACTO
 * - Sections by ESPECIALIDAD and PROFESIONAL
 *
 * Output: XLSX with columns: RUT, Nombre, Teléfono, Fecha Cita, Especialidad, Doctor
 */

function convertHtmlToXlsx(inputPath, outputPath) {
  console.log(`\n📄 Converting ${inputPath}...`);

  // Read HTML file
  const html = fs.readFileSync(inputPath, 'utf-8');
  const root = parse(html);

  // Extract date from title
  const titleElement = root.querySelector('th[colspan]');
  const titleText = titleElement ? titleElement.text : '';
  const dateMatch = titleText.match(/(\d{2}\/\d{2}\/\d{4})/);
  const baseDate = dateMatch ? dateMatch[1] : null;

  if (!baseDate) {
    throw new Error('Could not extract date from title');
  }

  console.log(`📅 Date: ${baseDate}`);

  // Extract all appointments
  const appointments = [];
  const tables = root.querySelectorAll('table');

  let currentSpecialty = null;
  let currentDoctor = null;

  // Parse all rows
  const allRows = root.querySelectorAll('tr');

  for (const row of allRows) {
    const cells = row.querySelectorAll('td');

    // Check if this is a specialty row
    if (cells.length >= 2 && cells[0].text.includes('ESPECIALIDAD:')) {
      currentSpecialty = cells[1].text.trim();
      continue;
    }

    // Check if this is a doctor row
    if (cells.length >= 2 && cells[0].text.includes('PROFESIONAL:')) {
      const doctorText = cells[1].text.trim();
      // Extract name (remove RUT in parentheses)
      currentDoctor = doctorText.replace(/\s*\(\d+-[\dKk]\)/, '').trim();
      continue;
    }

    // Check if this is a data row (has RUT pattern)
    if (cells.length >= 9) {
      const rut = cells[2].text.trim();
      const name = cells[3].text.trim();
      const time = cells[7].text.trim();
      const phones = cells[8].text.trim();

      // Validate RUT format
      if (!/^\d{7,8}-[\dKk]$/.test(rut)) {
        continue;
      }

      // Extract first valid phone number
      const phoneNumbers = phones.split('-').map(p => p.trim()).filter(p => p.length >= 8);
      const phone = phoneNumbers[0] || '';

      if (!phone) {
        console.log(`⚠️  Skipping ${name} - no valid phone`);
        continue;
      }

      // Combine date and time
      const dateTime = `${baseDate} ${time}`;

      appointments.push({
        'RUT': rut,
        'Nombre': name,
        'Teléfono': phone,
        'Fecha Cita': dateTime,
        'Especialidad': currentSpecialty || '',
        'Doctor': currentDoctor || ''
      });
    }
  }

  console.log(`✅ Found ${appointments.length} appointments`);
  console.log(`📊 Specialties: ${[...new Set(appointments.map(a => a.Especialidad))].join(', ')}`);

  // Create XLSX
  const ws = XLSX.utils.json_to_sheet(appointments);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Citas');

  // Write file
  XLSX.writeFile(wb, outputPath);
  console.log(`💾 Saved to ${outputPath}`);

  return appointments.length;
}

// Process command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node convert_html_to_xlsx.js <input.xls> [output.xlsx]');
  console.log('\nExample:');
  console.log('  node convert_html_to_xlsx.js hoja_diaria_modulo_17_11_2025.xls');
  console.log('  node convert_html_to_xlsx.js hoja_diaria_modulo_17_11_2025.xls output_17.xlsx');
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1] || inputPath.replace(/\.xls$/, '.xlsx');

try {
  const count = convertHtmlToXlsx(inputPath, outputPath);
  console.log(`\n✅ Successfully converted ${count} appointments\n`);
} catch (error) {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
}
