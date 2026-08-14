/**
 * server.js
 * OlympiaMUN — Express backend entry point.
 *
 * Serves the static frontend and exposes the registration API.
 */

// Load .env file when present (development).
// In production, set environment variables directly on the host.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express          = require('express');
const path             = require('path');
const cors             = require('cors');
const rateLimit        = require('express-rate-limit');
const { initDatabase } = require('./database');
const registrations    = require('./routes/registrations');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Rate limiter — POST /api/registrations only ────────────────
// 5 submissions per 15 minutes per IP.
// Appropriate for a school registration form; prevents both accidental
// double-clicks and deliberate spam without blocking legitimate users.
const registrationLimiter = rateLimit({
  windowMs:          15 * 60 * 1000, // 15 minutes
  max:               5,
  standardHeaders:   true,           // Return RateLimit-* headers
  legacyHeaders:     false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please wait 15 minutes and try again.',
  },
  // Use req.ip (works behind a reverse proxy if trust proxy is set)
  keyGenerator: (req) => req.ip,
});

// ── Body parsing ───────────────────────────────────────────────
// 10 kb is more than enough for the 7-field registration form.
// Tightened from the previous 50 kb.
app.use(express.json({ limit: '10kb' }));

// ── Trust proxy ────────────────────────────────────────────────
// Required for req.ip to reflect the real client IP when behind
// a reverse proxy (nginx, Railway, Render, etc.).
// Set to 1 if there is exactly one proxy in front of this server.
if (IS_PROD) {
  app.set('trust proxy', 1);
}

// ── CORS ───────────────────────────────────────────────────────
// In production, FRONTEND_ORIGIN must be set to the actual domain.
// Falls back to localhost for local development.
const allowedOrigins = IS_PROD
  ? [process.env.FRONTEND_ORIGIN].filter(Boolean)
  : [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
}));

// ── API routes (rate limiter scoped to registrations only) ─────
app.use('/api/registrations', registrationLimiter, registrations);

// ── Serve static frontend ──────────────────────────────────────
// Deliberately points at public/ — never the project root.
// backend/, node_modules/, .env, and the SQLite database are
// outside this directory and cannot be reached via HTTP.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// ── 404 catch-all ─────────────────────────────────────────────
// Returns JSON 404 for anything not matched above.
// Never exposes filesystem paths, stack traces, or source code.
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ── Global error handler ───────────────────────────────────────
// Last-resort handler for any unhandled Express errors.
// Logs the full error internally; sends only a safe generic message
// to the client — no stack traces, no paths, no SQL errors.
// Preserves meaningful HTTP status codes (e.g. 413 from body-parser).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err);

  // Use the error's status if it's a sensible HTTP client error (4xx),
  // otherwise default to 500 so internal details are never inferred
  // from the status code alone.
  const status = (err.status >= 400 && err.status < 500) ? err.status : 500;

  res.status(status).json({
    success: false,
    message: status === 413
      ? 'Request body too large.'
      : 'An unexpected error occurred. Please try again later.',
  });
});

// ── Bootstrap ──────────────────────────────────────────────────
(async () => {
  try {
    await initDatabase();
    const dbPath = process.env.DB_PATH || 'backend/data/olympiamun.db';
    console.log(`Database initialised → ${dbPath}`);

    app.listen(PORT, () => {
      console.log(`OlympiaMUN server running → http://localhost:${PORT}`);
      console.log(`Environment: ${IS_PROD ? 'production' : 'development'}`);
    });
  } catch (err) {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  }
})();
