'use strict';
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const hash = text => createHash('sha256').update(text).digest('hex');

// QC intentionally does not import the producer parser or report builders.
// This scanner consumes one cell at a time rather than sharing producer state.
function recomputeCsv(source) {
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > 500 * 1024) throw new Error('CSV input missing or outside size limit');
  const sourceText = source.startsWith('\uFEFF') ? source.slice(1) : source;
  const records = [];
  let position = 0, record = [];
  while (position < sourceText.length) {
    let value = '';
    if (sourceText[position] === '"') {
      position++;
      let closed = false;
      while (position < sourceText.length) {
        const ch = sourceText[position++];
        if (ch !== '"') value += ch;
        else if (sourceText[position] === '"') { value += '"'; position++; }
        else { closed = true; break; }
      }
      if (!closed) throw new Error('CSV quote not closed');
      if (position < sourceText.length && !',\r\n'.includes(sourceText[position])) throw new Error('Invalid CSV quote suffix');
    } else {
      const start = position;
      while (position < sourceText.length && !',\r\n'.includes(sourceText[position])) position++;
      value = sourceText.slice(start, position);
      if (value.includes('"')) throw new Error('Invalid CSV quote');
    }
    record.push(value);
    if (record.length > 200) throw new Error('CSV column limit exceeded');
    const delimiter = sourceText[position++];
    if (delimiter === ',') {
      if (position === sourceText.length) { record.push(''); records.push(record); record = []; }
      continue;
    }
    if (delimiter === '\r' && sourceText[position] === '\n') position++;
    records.push(record); record = [];
    if (records.length > 10001) throw new Error('CSV row limit exceeded');
  }
  if (records.length < 2) throw new Error('CSV must contain data rows');
  const names = records[0].map(name => name.trim());
  if (names.some(name => !name) || names.length !== new Set(names).size) throw new Error('Invalid CSV headers');
  const rows = records.slice(1);
  if (rows.length > 10000 || rows.some(row => row.length !== names.length)) throw new Error('CSV row lengths or count invalid');
  const columns = names.map((name, index) => {
    const present = rows.map(row => row[index].trim()).filter(value => value.length > 0);
    const numericValues = present.filter(value => /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[Ee][+-]?[0-9]+)?$/.test(value)).map(value => Number(value));
    if (numericValues.some(value => !Number.isFinite(value))) throw new Error('CSV has nonfinite numeric values');
    const total = numericValues.reduce((sum, value) => { const next = sum + value; if (!Number.isFinite(next)) throw new Error('CSV sum is not finite'); return next; }, 0);
    const numericCount = numericValues.length;
    const textCount = present.length - numericCount;
    return { name, type: numericCount === 0 ? 'text' : textCount > 0 ? 'mixed' : 'number', nonEmptyCount: present.length, missingCount: rows.length - present.length, numericCount, textCount, sum: numericCount ? total : null, min: numericCount ? Math.min(...numericValues) : null, max: numericCount ? Math.max(...numericValues) : null, mean: numericCount ? total / numericCount : null };
  });
  return { schemaVersion: 1, kind: 'data_analysis', source: { sha256: hash(source), bytes: Buffer.byteLength(source) }, rowCount: rows.length, columnCount: names.length, columns };
}
function expectedCsvReport(data) {
  return '# CSV analysis\n\nComputed from the submitted CSV. Statistics below refer only to this source.\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\nLimitations: blank cells are missing, not zero. Nonnumeric cells are excluded from numeric statistics; mixed columns require review. Numbers use finite JavaScript floating-point arithmetic and may be rounded. No causal, financial or business advice is inferred.\n\nHuman review and CEO approval are required.\n';
}
function recomputeHtml(source) {
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > 500 * 1024) throw new Error('HTML input missing or outside size limit');
  const clean = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const tags = [...clean.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)];
  const attr = tag => {
    const values = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    return values;
  };
  const opening = name => tags.filter(tag => tag[1].toLowerCase() === name && !tag[0].startsWith('</'));
  const title = clean.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const description = opening('meta').map(tag => attr(tag[0])).find(meta => meta.name?.toLowerCase() === 'description');
  const links = opening('a').map(tag => attr(tag[0]));
  return { schemaVersion: 1, kind: 'html_audit', source: { sha256: hash(source), bytes: Buffer.byteLength(source) }, title: title ? title[1].replace(/<[^>]*>/g, '').trim() : '', description: description?.content || '', h1Count: opening('h1').length, linkCount: links.length, linksWithoutHref: links.filter(link => !link.href?.trim()).length };
}
function expectedHtmlReport(data) {
  return '# Supplied HTML checks\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\nLimitations: bounded pattern checks of supplied HTML only; no URL was fetched. This is not a full SEO audit. Core Web Vitals, rendering, accessibility, search ranking and live-page behavior were not tested. HTML entities are not decoded and malformed markup may be counted imperfectly.\n\nHuman review and CEO approval are required.\n';
}
function expectedSystemReport(data) {
  return '# Local runtime inventory\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\nLimitations: this inventory observes the current Node process only. It does not prove security, installed tools, AI availability, network access or overall machine health.\n\nHuman review and CEO approval are required.\n';
}
async function audit({ kind, brief = '', input = {}, files = [], evidence = {}, mode } = {}) {
  const checks = [], defects = [], limitations = [];
  const check = (dimension, status, detail) => { checks.push({ dimension, status, detail }); if (status === 'FAIL') defects.push(detail); };
  const expectedNames = kind === 'data_analysis' ? ['analysis.json', 'report.md'] : kind === 'html_audit' ? ['audit.json', 'report.md'] : kind === 'system_check' ? ['system.json', 'report.md'] : kind === 'ai_draft' ? ['draft.md'] : [];
  const validFiles = Array.isArray(files) && files.length === expectedNames.length && expectedNames.length > 0 && new Set(files.map(file => file?.name)).size === files.length && files.every(file => expectedNames.includes(file?.name) && (typeof file.content === 'string' || Buffer.isBuffer(file.content)) && Buffer.byteLength(file.content) > 0 && Buffer.byteLength(file.content) <= 2 * 1024 * 1024);
  const get = name => { const entry = Array.isArray(files) ? files.find(file => file?.name === name) : null; return Buffer.isBuffer(entry?.content) ? entry.content.toString('utf8') : entry?.content; };
  check('technical', validFiles ? 'PASS' : 'FAIL', validFiles ? 'Required bounded nonempty artifact contents were supplied for inspection.' : 'Missing, empty, duplicate, unexpected or oversized artifact contents.');
  let parsed = null;
  let format = validFiles;
  try {
    if (format) {
      for (const entry of files) {
        if (entry.mime !== (entry.name.endsWith('.json') ? 'application/json' : 'text/markdown')) throw new Error('Artifact MIME mismatch');
      }
      if (kind !== 'ai_draft') {
        parsed = JSON.parse(get(expectedNames[0]));
        if (!parsed || Array.isArray(parsed) || parsed.kind !== kind || parsed.schemaVersion !== 1) throw new Error('Invalid structured artifact');
      }
    }
  } catch { format = false; }
  check('format', format ? 'PASS' : 'FAIL', format ? 'Artifact encoding, MIME and structured format are valid.' : 'Artifact format or structured JSON is invalid.');
  let source = false, data = false, content = false;
  try {
    if (!format) throw new Error('Cannot inspect malformed artifacts');
    if (kind === 'data_analysis') {
      const expected = recomputeCsv(input.csv);
      source = mode === 'DETERMINISTIC_TOOL' && evidence.sourceHash === expected.source.sha256 && evidence.sourceBytes === expected.source.bytes && isDeepStrictEqual(parsed.source, expected.source);
      data = isDeepStrictEqual(parsed, expected);
      content = get('report.md') === expectedCsvReport(expected);
      limitations.push('CSV checks validate descriptive calculations only; data collection accuracy and business meaning require human review.');
    } else if (kind === 'html_audit') {
      const expected = recomputeHtml(input.html);
      source = mode === 'DETERMINISTIC_TOOL' && evidence.sourceHash === expected.source.sha256 && evidence.sourceBytes === expected.source.bytes && isDeepStrictEqual(parsed.source, expected.source);
      data = isDeepStrictEqual(parsed, expected);
      content = get('report.md') === expectedHtmlReport(expected);
      limitations.push('Only supplied HTML pattern checks were verified; no live page, DOM, full SEO or Core Web Vitals measurement.');
    } else if (kind === 'system_check') {
      const fields = ['architecture', 'kind', 'nodeVersion', 'observedAt', 'pid', 'platform', 'schemaVersion'];
      data = isDeepStrictEqual(Object.keys(parsed).sort(), fields) && /^v\d+\.\d+\.\d+/.test(parsed.nodeVersion) && typeof parsed.platform === 'string' && typeof parsed.architecture === 'string' && Number.isSafeInteger(parsed.pid) && parsed.pid > 0 && Number.isFinite(Date.parse(parsed.observedAt)) && Date.parse(parsed.observedAt) <= Date.now() + 300000;
      source = mode === 'DETERMINISTIC_TOOL' && evidence.snapshotHash === hash(JSON.stringify(parsed)) && evidence.observedAt === parsed.observedAt;
      content = get('report.md') === expectedSystemReport(parsed);
      limitations.push('System inventory is an internally consistent recorded snapshot, not an independent security or overall machine-health assessment.');
    } else if (kind === 'ai_draft') {
      source = mode === 'AI_PROVIDER' && typeof brief === 'string' && brief.trim().length > 0 && typeof input.context === 'string' && input.context.trim().length > 0 && evidence.briefHash === hash(brief) && evidence.contextHash === hash(input.context) && evidence.outputHash === hash(get('draft.md')) && typeof evidence.provider === 'string' && evidence.provider.length > 0 && typeof evidence.model === 'string' && evidence.model.length > 0;
      limitations.push('AI content semantics, factual accuracy, suitability and aesthetics remain unverified pending human review. Endpoint/model provenance is recorded, not independent proof of model quality or local execution.');
    }
  } catch (error) { limitations.push(error.message); }
  check('source', source ? 'PASS' : 'FAIL', source ? 'Source hashes and recorded provenance match the supplied inputs/artifacts.' : 'Source input, execution mode or provenance does not match the artifacts.');
  check('data', kind === 'ai_draft' && format ? 'UNVERIFIED' : data ? 'PASS' : 'FAIL', kind === 'ai_draft' ? 'AI statements and numbers require human source verification.' : data ? 'Structured results independently match the submitted data or bounded snapshot schema.' : 'Structured results are missing, inconsistent or do not match independent recomputation.');
  check('content', kind === 'ai_draft' && format ? 'UNVERIFIED' : content ? 'PASS' : 'FAIL', kind === 'ai_draft' ? 'Semantic correctness and fitness for the brief require human review.' : content ? 'The full report matches verified results and states scope limitations.' : 'The report does not match verified results and required scope limitations.');
  check('aesthetic', 'UNVERIFIED', 'Visual/content aesthetics require human review; no numeric quality score is asserted.');
  check('approval', 'UNVERIFIED', 'CEO approval is mandatory and must be recorded separately for this artifact version.');
  return { verdict: defects.length ? 'NEEDS_REVISION' : 'PASS', checks, defects, limitations, requiresApproval: true };
}
module.exports = { audit };
