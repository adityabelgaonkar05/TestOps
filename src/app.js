const express = require('express');
const os = require('node:os');
const path = require('node:path');
const { analyzeText } = require('./analyze');

const APP_NAME = 'TextOps';
const MAX_CHARACTERS = 50_000;

function createApp() {
  const app = express();
  const hostname = os.hostname();

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.setHeader('X-Served-By', hostname);
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      process.stdout.write(`${JSON.stringify({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2))
      })}\n`);
    });
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/info', (req, res) => {
    res.json({
      applicationName: APP_NAME,
      version: require('../package.json').version,
      uptimeSeconds: Math.floor(process.uptime()),
      hostname
    });
  });

  app.post('/api/analyze', (req, res) => {
    const { text } = req.body || {};

    if (text === undefined) {
      return res.status(400).json({ error: { code: 'MISSING_TEXT', message: 'The text field is required.' } });
    }
    if (typeof text !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_TEXT', message: 'The text field must be a string.' } });
    }
    if (text.trim().length === 0) {
      return res.status(400).json({ error: { code: 'BLANK_TEXT', message: 'The text field must not be blank.' } });
    }
    if (Array.from(text).length > MAX_CHARACTERS) {
      return res.status(400).json({
        error: { code: 'TEXT_TOO_LONG', message: `The text field must be ${MAX_CHARACTERS} characters or fewer.` }
      });
    }

    return res.json(analyzeText(text));
  });

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' } });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });

  return app;
}

module.exports = { createApp };
