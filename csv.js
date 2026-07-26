/* ============================================================
   csv.js — Parser CSV mínimo (RFC4180-ish, sin librerías externas
   para que la PWA funcione offline desde la primera carga) +
   lógica de importación de vocabulario a IndexedDB.
   ============================================================ */

const CSV_EXPECTED_HEADERS = [
  'mot',
  'traduction',
  'categorie',
  'type',
  'niveau',
  'genre',
  'plural',
  'expression',
  'example',
  'present',
  'passeCompose',
];

/** Parsea un texto CSV completo en una matriz de filas (arrays de strings). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  // Normaliza saltos de línea
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  // última celda/fila pendiente
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Importa un texto CSV completo a IndexedDB.
 * Devuelve { imported, updated, skipped, errors }.
 */
async function importCsvString(csvText, replaceExisting = false) {
  const rows = parseCsv(csvText).filter(
    (r) => !(r.length === 1 && r[0].trim() === '')
  );

  if (rows.length === 0) {
    return { imported: 0, updated: 0, skipped: 0, errors: ['El archivo CSV está vacío.'] };
  }

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const headerIndex = {};
  for (const expected of CSV_EXPECTED_HEADERS) {
    const idx = headerRow.indexOf(expected.toLowerCase());
    if (idx !== -1) headerIndex[expected] = idx;
  }

  if (!('mot' in headerIndex) || !('traduction' in headerIndex)) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: ['El CSV debe tener al menos las columnas "mot" y "traduction".'],
    };
  }

  const cell = (row, key) => {
    const idx = headerIndex[key];
    if (idx === undefined || idx >= row.length) return null;
    const v = (row[idx] || '').trim();
    return v.length === 0 ? null : v;
  };

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => (c || '').trim() === '')) continue;

    const mot = cell(row, 'mot');
    const traduction = cell(row, 'traduction');

    if (!mot || !traduction) {
      skipped++;
      errors.push(`Fila ${i + 1}: falta "mot" o "traduction".`);
      continue;
    }

    try {
      const word = {
  mot,
  traduction,
  categorie: cell(row, 'categorie'),
  type: cell(row, 'type'),
  niveau: cell(row, 'niveau'),
  genre: cell(row, 'genre'),
  plural: cell(row, 'plural'),
  expression: cell(row, 'expression'),
  example: cell(row, 'example'),
  present: cell(row, 'present'),
  passeCompose: cell(row, 'passeCompose'),
};

      const { id, isNew } = await Db.upsertWord(word, replaceExisting);
      await Db.ensureReviewExists(id);

      if (isNew) {
        imported++;
      } else if (replaceExisting) {
        updated++;
      } else {
        skipped++;
      }
    } catch (e) {
      skipped++;
      errors.push(`Fila ${i + 1}: error al procesar (${e && e.message ? e.message : e}).`);
    }
  }

  return { imported, updated, skipped, errors };
}
