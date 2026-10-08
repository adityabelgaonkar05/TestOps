const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(run) {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function postAnalyze(baseUrl, body) {
  return fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('analyzes text and reports case-insensitive frequencies with deterministic ties', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalyze(baseUrl, { text: 'Apple apple banana. Banana! CAN\'T can\'t.' });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('x-served-by'));
    assert.deepEqual(await response.json(), {
      characterCount: 40,
      wordCount: 6,
      sentenceCount: 3,
      estimatedReadingTimeMinutes: 1,
      topWords: [
        { word: 'apple', count: 2 },
        { word: 'banana', count: 2 },
        { word: "can't", count: 2 }
      ]
    });
  });
});

test('counts Unicode letters and numbers and caps frequency results at ten words', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalyze(baseUrl, { text: 'Été 42 東京 alpha beta gamma delta epsilon zeta eta theta iota kappa lambda' });
    const result = await response.json();
    assert.equal(result.wordCount, 14);
    assert.equal(result.topWords.length, 10);
    assert.deepEqual(result.topWords.map(({ word }) => word), ['42', 'alpha', 'beta', 'delta', 'epsilon', 'eta', 'gamma', 'iota', 'kappa', 'lambda']);
  });
});

test('rejects missing, non-string, blank, and over-limit text with JSON errors', async () => {
  await withServer(async (baseUrl) => {
    const cases = [
      [{}, 'MISSING_TEXT'],
      [{ text: 17 }, 'INVALID_TEXT'],
      [{ text: ' \n\t ' }, 'BLANK_TEXT'],
      [{ text: 'x'.repeat(50_001) }, 'TEXT_TOO_LONG']
    ];
    for (const [body, code] of cases) {
      const response = await postAnalyze(baseUrl, body);
      assert.equal(response.status, 400);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.equal((await response.json()).error.code, code);
    }
  });
});

test('health, info, malformed JSON, and unknown routes return the documented shapes', async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const info = await fetch(`${baseUrl}/api/info`);
    const infoBody = await info.json();
    assert.equal(infoBody.applicationName, 'TextOps');
    assert.equal(infoBody.version, '1.0.0');
    assert.equal(typeof infoBody.uptimeSeconds, 'number');
    assert.ok(infoBody.hostname);

    const invalid = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{'
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_JSON');

    const missing = await fetch(`${baseUrl}/missing`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  });
});
