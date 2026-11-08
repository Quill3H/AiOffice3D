'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const { createHash } = require('node:crypto');

// Producer parser: strict finite-state CSV parsing; QC has a separate implementation.
function analyzeCsv(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('CSV source is empty or missing');
  const bytes = Buffer.byteLength(source, 'utf8');
  if (bytes > 500 * 1024) throw new Error('CSV exceeds the 500 KB size limit');
  const text = source.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', state = 'plain';
  const endCell = () => { row.push(cell); cell = ''; state = 'plain'; if (row.length > 200) throw new Error('CSV exceeds the 200 column limit'); };
  const endRow = () => { endCell(); rows.push(row); row = []; if (rows.length > 10001) throw new Error('CSV exceeds 10000 data rows'); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (state === 'quoted') {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else state = 'closed';
    } else if (ch === ',' || ch === '\n' || ch === '\r') {
      if (ch === ',') endCell();
      else { endRow(); if (ch === '\r' && text[i + 1] === '\n') i++; }
    } else if (state === 'closed') throw new Error('CSV has characters after a closing quote');
    else if (ch === '"') {
      if (cell !== '') throw new Error('CSV quote must begin a cell');
      state = 'quoted';
    } else cell += ch;
  }
  if (state === 'quoted') throw new Error('CSV has an unterminated quote');
  if (cell !== '' || row.length || state === 'closed') endRow();
  if (rows.length < 2) throw new Error('CSV needs a header and at least one data row');
  const headers = rows.shift().map(value => value.trim());
  if (headers.some(value => !value) || new Set(headers).size !== headers.length) throw new Error('CSV headers must be nonempty and unique');
  for (let i = 0; i < rows.length; i++) if (rows[i].length !== headers.length) throw new Error(`CSV row ${i + 2} has ${rows[i].length} cells; expected ${headers.length}`);
  const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const columns = headers.map((name, index) => {
    let missingCount = 0, numericCount = 0, textCount = 0, sum = 0, min = null, max = null;
    for (const row of rows) {
      const value = row[index].trim();
      if (!value) { missingCount++; continue; }
      if (!number.test(value)) { textCount++; continue; }
      const valueNumber = Number(value);
      if (!Number.isFinite(valueNumber)) throw new Error('CSV numeric value is not finite');
      sum += valueNumber;
      if (!Number.isFinite(sum)) throw new Error('CSV numeric sum overflow');
      numericCount++;
      min = min === null ? valueNumber : Math.min(min, valueNumber);
      max = max === null ? valueNumber : Math.max(max, valueNumber);
    }
    return { name, type: numericCount ? (textCount ? 'mixed' : 'number') : 'text', nonEmptyCount: rows.length - missingCount, missingCount, numericCount, textCount, sum: numericCount ? sum : null, min, max, mean: numericCount ? sum / numericCount : null };
  });
  return { schemaVersion: 1, kind: 'data_analysis', source: { sha256: createHash('sha256').update(source).digest('hex'), bytes }, rowCount: rows.length, columnCount: headers.length, columns };
}

if (parentPort) {
  try { parentPort.postMessage({ result: analyzeCsv(workerData.csv) }); }
  catch (error) { parentPort.postMessage({ error: error.message }); }
}
module.exports = { analyzeCsv };
