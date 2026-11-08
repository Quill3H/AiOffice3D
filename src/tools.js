'use strict';
const { Worker } = require('node:worker_threads');
const { createHash } = require('node:crypto');
const path = require('node:path');

const hash = text => createHash('sha256').update(text).digest('hex');
const jsonFile = (name, data) => ({ name, mime: 'application/json', content: JSON.stringify(data, null, 2) + '\n' });
const markdownFile = content => ({ name: 'report.md', mime: 'text/markdown', content });
const abortError = () => Object.assign(new Error('Tool execution aborted'), { name: 'AbortError' });
function checkSignal(signal) { if (signal?.aborted) throw abortError(); }
function boundedText(value, label, bytes = 500 * 1024) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} source is required and cannot be empty`);
  if (Buffer.byteLength(value) > bytes) throw new Error(`${label} source exceeds ${bytes} byte size limit`);
  return value;
}
function csvWorker(csv, signal) {
  checkSignal(signal);
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'tool-worker.js'), { workerData: { csv }, resourceLimits: { maxOldGenerationSizeMb: 64 } });
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error); else resolve(value);
    };
    const onAbort = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error('CSV processing timed out')), 15000);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    worker.once('message', message => finish(message.error ? new Error(message.error) : null, message.result));
    worker.once('error', error => finish(error));
    worker.once('exit', code => { if (!settled) finish(new Error(`CSV worker exited before completion (${code})`)); });
  });
}
function csvReport(data) {
  return '# CSV analysis\n\nComputed from the submitted CSV. Statistics below refer only to this source.\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\nLimitations: blank cells are missing, not zero. Nonnumeric cells are excluded from numeric statistics; mixed columns require review. Numbers use finite JavaScript floating-point arithmetic and may be rounded. No causal, financial or business advice is inferred.\n\nHuman review and CEO approval are required.\n';
}
function htmlFindings(html) {
  const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]));
  const titleMatch = text.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const metas = [...text.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0]));
  const links = [...text.matchAll(/<a\b[^>]*>/gi)].map(m => attrs(m[0]));
  return { schemaVersion: 1, kind: 'html_audit', source: { sha256: hash(html), bytes: Buffer.byteLength(html) }, title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '', description: metas.find(m => m.name?.toLowerCase() === 'description')?.content || '', h1Count: [...text.matchAll(/<h1\b[^>]*>/gi)].length, linkCount: links.length, linksWithoutHref: links.filter(link => !link.href?.trim()).length };
}
function htmlReport(data) {
  return '# Supplied HTML checks\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\nLimitations: bounded pattern checks of supplied HTML only; no URL was fetched. This is not a full SEO audit. Core Web Vitals, rendering, accessibility, search ranking and live-page behavior were not tested. HTML entities are not decoded and malformed markup may be counted imperfectly.\n\nHuman review and CEO approval are required.\n';
}
function systemReport(data) {
  return '# Local runtime inventory\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\nLimitations: this inventory observes the current Node process only. It does not prove security, installed tools, AI availability, network access or overall machine health.\n\nHuman review and CEO approval are required.\n';
}
async function executeTool({ kind, brief = '', input = {}, provider, signal, onEvent } = {}) {
  checkSignal(signal);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Tool input must be an object');
  if (onEvent) onEvent({ type: 'tool_started', message: `Executing ${kind}` });
  let result;
  if (kind === 'data_analysis') {
    const csv = boundedText(input.csv, 'CSV');
    const data = await csvWorker(csv, signal);
    result = { files: [jsonFile('analysis.json', data), markdownFile(csvReport(data))], evidence: { tool: 'csv-statistics-v1', sourceHash: data.source.sha256, sourceBytes: data.source.bytes, rowCount: data.rowCount, columnCount: data.columnCount, limitations: ['Finite floating-point arithmetic', 'Descriptive statistics only; missing and nonnumeric values excluded'] } };
  } else if (kind === 'html_audit') {
    const data = htmlFindings(boundedText(input.html, 'HTML'));
    result = { files: [jsonFile('audit.json', data), markdownFile(htmlReport(data))], evidence: { tool: 'supplied-html-checks-v1', sourceHash: data.source.sha256, sourceBytes: data.source.bytes, limitations: ['Pattern checks of supplied HTML only; no fetching, DOM, full SEO or Core Web Vitals'] } };
  } else if (kind === 'system_check') {
    const data = { schemaVersion: 1, kind: 'system_check', observedAt: new Date().toISOString(), nodeVersion: process.version, platform: process.platform, architecture: process.arch, pid: process.pid };
    result = { files: [jsonFile('system.json', data), markdownFile(systemReport(data))], evidence: { tool: 'local-node-inventory-v1', snapshotHash: hash(JSON.stringify(data)), observedAt: data.observedAt, limitations: ['Current process inventory only; no overall health or security conclusion'] } };
  } else if (kind === 'ai_draft') {
    boundedText(brief, 'Brief', 10000);
    const context = boundedText(input.context, 'Context', 100000);
    if (!provider || typeof provider.generate !== 'function') throw new Error('An explicitly configured and probed local AI provider is required');
    const generated = await provider.generate({ brief, context, signal });
    checkSignal(signal);
    const text = boundedText(generated.text, 'Generated draft', 65536);
    if (!generated.provider || !generated.model) throw new Error('AI provider omitted model provenance');
    return { files: [{ name: 'draft.md', mime: 'text/markdown', content: text }], mode: 'AI_PROVIDER', provider: generated.provider, model: generated.model, ...(generated.usage ? { usage: generated.usage } : {}), evidence: { tool: 'local-ai-draft-v1', provider: generated.provider, model: generated.model, briefHash: hash(brief), contextHash: hash(context), outputHash: hash(text), limitations: ['AI-generated content; factual accuracy, content suitability and aesthetics require human review', 'A loopback endpoint does not independently prove how the configured server runs its model'] } };
  } else throw new Error(`Unsupported tool kind: ${kind}`);
  checkSignal(signal);
  return { ...result, mode: 'DETERMINISTIC_TOOL', provider: 'builtin', model: null };
}
module.exports = { executeTool };
