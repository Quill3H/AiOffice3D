const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const http = require('node:http');

// Network fixtures below are local HTTP test doubles; they do not run a real AI model.
const modules = ['tools', 'qc', 'providers'].map(name => {
  try { return require(`../src/${name}.js`); }
  catch (error) { if (error.code === 'MODULE_NOT_FOUND') return {}; throw error; }
});
const [{ executeTool }, { audit }, { LocalProvider }] = modules;
const hash = value => createHash('sha256').update(value).digest('hex');
const csv = '\uFEFF"Person, name",Revenue\r\n"Alice\nA",10\r\nBob,20\r\nCharlie,\r\n"Quote ""Q""",-5';
const file = (result, name) => result.files.find(item => item.name === name);
const analysis = result => JSON.parse(file(result, 'analysis.json').content);
const qc = (result, input = { csv }, kind = 'data_analysis') => audit({ kind, brief: 'Analyze supplied data', input, ...result });

// Removing real CSV parsing, worker cancellation or evidence validation must break these tests.
test('CSV tool computes quoted multiline data and missing numbers from supplied input', async () => {
  assert.equal(typeof executeTool, 'function', 'tools implementation is required');
  const result = await executeTool({ kind: 'data_analysis', input: { csv }, brief: 'Analyze supplied data' });
  const data = analysis(result);
  assert.equal(result.mode, 'DETERMINISTIC_TOOL');
  assert.equal(data.rowCount, 4);
  assert.equal(data.columnCount, 2);
  assert.equal(data.columns[0].name, 'Person, name');
  assert.deepEqual(data.columns[1], { name: 'Revenue', type: 'number', nonEmptyCount: 3, missingCount: 1, numericCount: 3, textCount: 0, sum: 25, min: -5, max: 20, mean: 25 / 3 });
  assert.equal(data.source.sha256, hash(csv));
  assert.equal(result.evidence.sourceHash, hash(csv));
  assert.match(file(result, 'report.md').content, /human review/i);
});

test('CSV tool rejects malformed, empty and oversized sources instead of fabricating data', async () => {
  for (const bad of ['', 'x,y\n1', 'x,y\n"unfinished,2', 'x,y\n1,2,3', 'x,x\n1,2', 'x\n1e309', 'x\n1e308\n1e308', 'x\n"a"b']) {
    await assert.rejects(() => executeTool({ kind: 'data_analysis', input: { csv: bad } }), /CSV|numeric|finite|empty|header|row|column|quote|overflow/i);
  }
  await assert.rejects(() => executeTool({ kind: 'data_analysis', input: { csv: 'x\n' + 'a'.repeat(512001) } }), /large|limit|500/i);
  await assert.rejects(() => executeTool({ kind: 'data_analysis', input: { csv: 'x\n' + Array(10001).fill('1').join('\n') } }), /row|10000/i);
});

test('CSV mixed types expose exclusions without converting nonnumeric text to zero', async () => {
  const result = await executeTool({ kind: 'data_analysis', input: { csv: 'amount,note\n5,ok\nno data,ok\n ,\n-2,ok' } });
  const col = analysis(result).columns[0];
  assert.equal(col.type, 'mixed');
  assert.equal(col.sum, 3);
  assert.equal(col.numericCount, 2);
  assert.equal(col.textCount, 1);
  assert.equal(col.missingCount, 1);
});

test('CSV worker respects abort signals and does not emit late artifacts', async () => {
  const controller = new AbortController();
  const promise = executeTool({ kind: 'data_analysis', input: { csv }, signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, error => error.name === 'AbortError');
});

test('independent CSV QC passes correct data but always requires approval', async () => {
  const result = await executeTool({ kind: 'data_analysis', input: { csv } });
  const review = await qc(result);
  assert.equal(review.verdict, 'PASS');
  assert.equal(review.requiresApproval, true);
  assert.equal(review.checks.find(item => item.dimension === 'data').status, 'PASS');
  assert.equal(review.checks.find(item => item.dimension === 'approval').status, 'UNVERIFIED');
  assert.equal(review.checks.find(item => item.dimension === 'aesthetic').status, 'UNVERIFIED');
  assert.equal('score' in review, false);
});

test('independent CSV QC rejects corrupted statistics, misleading report, missing source and blank output', async () => {
  const result = await executeTool({ kind: 'data_analysis', input: { csv } });
  const corrupt = structuredClone(result);
  const data = analysis(corrupt);
  data.columns[1].sum = 999;
  file(corrupt, 'analysis.json').content = JSON.stringify(data);
  assert.equal((await qc(corrupt)).verdict, 'NEEDS_REVISION');
  const report = structuredClone(result);
  file(report, 'report.md').content = '# Report\nRevenue: 999999';
  assert.equal((await qc(report)).verdict, 'NEEDS_REVISION');
  assert.equal((await qc(result, { csv: csv.replace('20', '21') })).verdict, 'NEEDS_REVISION');
  assert.equal((await qc({ ...result, files: [{ name: 'analysis.json', mime: 'application/json', content: '{}' }, { name: 'report.md', mime: 'text/markdown', content: '' }] })).verdict, 'NEEDS_REVISION');
});

test('HTML tool checks only supplied HTML and its bounded findings survive independent QC', async () => {
  const html = '<!doctype html><html><head><title>Example</title><meta name="description" content="A description"></head><body><h1>Heading</h1><a href="https://example.com">Link</a><a>Empty</a></body></html>';
  const result = await executeTool({ kind: 'html_audit', input: { html } });
  const data = JSON.parse(file(result, 'audit.json').content);
  assert.equal(data.title, 'Example');
  assert.equal(data.h1Count, 1);
  assert.equal(data.linkCount, 2);
  assert.equal(data.linksWithoutHref, 1);
  assert.match(file(result, 'report.md').content, /Core Web Vitals.*not|not.*Core Web Vitals/i);
  assert.equal((await qc(result, { html }, 'html_audit')).verdict, 'PASS');
  await assert.rejects(() => executeTool({ kind: 'html_audit', input: { url: 'https://example.com' } }), /HTML|required/i);
});

test('system check reports observed local Node runtime and explicit limits', async () => {
  const result = await executeTool({ kind: 'system_check', input: {} });
  const data = JSON.parse(file(result, 'system.json').content);
  assert.equal(data.nodeVersion, process.version);
  assert.equal(data.platform, process.platform);
  assert.ok(data.observedAt);
  assert.equal((await qc(result, {}, 'system_check')).verdict, 'PASS');
});

test('AI draft carries provider provenance while semantics and aesthetics remain unverified', async () => {
  const provider = { async generate({ brief, context }) { assert.equal(brief, 'Draft'); assert.equal(context, 'Facts'); return { text: 'A draft based on supplied facts.', provider: 'local-ai', model: 'fixture-model' }; } };
  const result = await executeTool({ kind: 'ai_draft', brief: 'Draft', input: { context: 'Facts' }, provider });
  assert.equal(result.mode, 'AI_PROVIDER');
  assert.equal(result.model, 'fixture-model');
  assert.equal(result.evidence.contextHash, hash('Facts'));
  const review = await audit({ kind: 'ai_draft', brief: 'Draft', input: { context: 'Facts' }, ...result });
  assert.equal(review.verdict, 'PASS');
  assert.equal(review.checks.find(item => item.dimension === 'content').status, 'UNVERIFIED');
  assert.equal(review.checks.find(item => item.dimension === 'aesthetic').status, 'UNVERIFIED');
  await assert.rejects(() => executeTool({ kind: 'ai_draft', brief: 'Draft', input: { context: 'Facts' } }), /provider|configured/i);
});

async function fixtureServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { baseUrl: `http://127.0.0.1:${server.address().port}/v1`, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}
function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }

test('local HTTP test double: provider requires explicit loopback config and successful model probe', async () => {
  assert.equal(typeof LocalProvider, 'function', 'local provider implementation is required');
  assert.equal(new LocalProvider({ baseUrl: '', model: '' }).status().status, 'NOT_CONFIGURED');
  for (const baseUrl of ['https://api.openai.com/v1', 'http://127.0.0.2/v1', 'http://localhost.example/v1', 'http://user:pass@localhost/v1', 'http://localhost/v1?x=1', 'http://localhost/anything', 'http://2130706433/v1', 'http://127.1/v1']) {
    assert.throws(() => new LocalProvider({ baseUrl, model: 'fixture-model' }), /loopback|URL|path|credential|configuration|literal/i);
  }
  let generations = 0;
  const server = await fixtureServer((req, res) => {
    if (req.url === '/v1/models') return json(res, { data: [{ id: 'fixture-model' }] });
    generations++; json(res, { model: 'fixture-model', choices: [{ message: { content: 'Generated by local HTTP test double.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 4, completion_tokens: 7 } });
  });
  try {
    const provider = new LocalProvider({ baseUrl: server.baseUrl, model: 'fixture-model' });
    await assert.rejects(() => provider.generate({ brief: 'Draft', context: 'Facts' }), /probe|connected/i);
    assert.equal((await provider.probe()).status, 'CONNECTED');
    assert.equal(generations, 0, 'probe must not generate content');
    const draft = await provider.generate({ brief: 'Draft', context: 'Facts' });
    assert.equal(draft.text, 'Generated by local HTTP test double.');
    assert.equal(draft.model, 'fixture-model');
    assert.equal(draft.usage.completion_tokens, 7);
  } finally { await server.close(); }
});

test('local HTTP test double: missing models, redirects and oversized responses never connect', async () => {
  for (const behavior of ['missing', 'redirect', 'huge']) {
    const server = await fixtureServer((req, res) => {
      if (behavior === 'missing') return json(res, { data: [{ id: 'other-model' }] });
      if (behavior === 'redirect') { res.writeHead(302, { Location: 'https://example.com' }); return res.end(); }
      res.writeHead(200); res.end('x'.repeat(1024 * 1024 + 1));
    });
    try {
      const provider = new LocalProvider({ baseUrl: server.baseUrl, model: 'fixture-model' });
      assert.equal((await provider.probe()).status, 'NOT_CONNECTED');
      await assert.rejects(() => provider.generate({ brief: 'Draft', context: 'Facts' }), /probe|connected/i);
    } finally { await server.close(); }
  }
});

test('local HTTP test double: generation honors caller cancellation', async () => {
  const server = await fixtureServer((req, res) => {
    if (req.url === '/v1/models') return json(res, { data: [{ id: 'fixture-model' }] });
    // Intentional pending response to exercise cancellation; server closes during cleanup.
  });
  try {
    const provider = new LocalProvider({ baseUrl: server.baseUrl, model: 'fixture-model' });
    await provider.probe();
    const controller = new AbortController();
    const promise = provider.generate({ brief: 'Draft', context: 'Facts', signal: controller.signal });
    controller.abort();
    await assert.rejects(promise, error => error.name === 'AbortError');
  } finally { await server.close(); }
});

test('provider rejects explicit cloud and hosted-only model identifiers before any request', () => {
  for (const model of ['qwen3-coder:480b-cloud', 'deepseek-v3.1:671b-cloud', 'model:cloud', 'gpt-4o', 'openai/gpt-5-mini', 'claude-sonnet-4', 'gemini-2.5-pro', 'o3-mini']) {
    assert.throws(() => new LocalProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model }), /cloud|hosted|local model/i);
  }
  const local = new LocalProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'gpt-oss:20b' });
  assert.equal(local.status().model, 'gpt-oss:20b');
});

test('provider expires unchecked connectivity and refuses generation until a fresh probe', async () => {
  let now = Date.parse('2026-11-08T00:00:00Z');
  let generations = 0;
  // Protocol fixture only: no real server or AI model is contacted.
  const provider = new LocalProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'fixture-model', nowMs: () => now, fetchImpl: async url => {
    if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'fixture-model' }] }), { status: 200 });
    generations++;
    return new Response(JSON.stringify({ model: 'fixture-model', choices: [{ message: { content: 'Protocol fixture draft.' }, finish_reason: 'stop' }] }), { status: 200 });
  } });
  assert.equal((await provider.probe()).status, 'CONNECTED');
  now += 60001;
  assert.equal(provider.status().status, 'NOT_CONNECTED');
  assert.equal(provider.status().lastChecked, '2026-11-08T00:00:00.000Z');
  assert.match(provider.status().error, /stale|expired|probe/i);
  await assert.rejects(() => provider.generate({ brief: 'Draft', context: 'Facts' }), /probe|stale|expired/i);
  assert.equal(generations, 0);
  assert.equal((await provider.probe()).status, 'CONNECTED');
  assert.equal(provider.status().lastChecked, '2026-11-08T00:01:00.001Z');
  assert.equal((await provider.generate({ brief: 'Draft', context: 'Facts' })).text, 'Protocol fixture draft.');
});


function responseFixtureProvider(result) {
  // OpenAI-compatible protocol fixture only: no actual model/server is called.
  return new LocalProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'fixture-model', fetchImpl: async url => new Response(JSON.stringify(url.endsWith('/models') ? { data: [{ id: 'fixture-model' }] } : result), { status: 200 }) });
}

test('provider refuses to attribute missing or mismatched response models to the probed model', async () => {
  for (const modelFields of [{}, { model: null }, { model: 'different-model' }]) {
    const provider = responseFixtureProvider({ ...modelFields, choices: [{ message: { content: 'Unverified attribution.' }, finish_reason: 'stop' }] });
    assert.equal((await provider.probe()).status, 'CONNECTED');
    await assert.rejects(() => provider.generate({ brief: 'Draft', context: 'Facts' }), /model|provenance/i);
    assert.equal(provider.status().status, 'NOT_CONNECTED');
    assert.match(provider.status().error, /model|provenance/i);
  }
});

test('provider refuses incomplete or tool-call completions as successful drafts', async () => {
  for (const finishFields of [{}, { finish_reason: null }, { finish_reason: 'length' }, { finish_reason: 'tool_calls' }]) {
    const provider = responseFixtureProvider({ model: 'fixture-model', choices: [{ message: { content: 'Partial or unfinished output.' }, ...finishFields }] });
    assert.equal((await provider.probe()).status, 'CONNECTED');
    await assert.rejects(() => provider.generate({ brief: 'Draft', context: 'Facts' }), /finish|complete|truncat/i);
    assert.equal(provider.status().status, 'NOT_CONNECTED');
    assert.match(provider.status().error, /finish|complete|truncat/i);
  }
});
