/**
 * routes/registrations.js
 * POST /api/registrations — validate and store a new registration.
 */

const express            = require('express');
const { getDb, persist } = require('../database');

const router = express.Router();

// Allowed committee values — must match the frontend <select> option values exactly
const ALLOWED_COMMITTEES = ['unsc', 'unep', 'hcc', 'who', 'ipc', 'disec'];

// Basic email regex (covers the vast majority of real addresses)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid phone: digits, spaces, +, -, (, ) — must contain 7–15 digits when stripped
function isValidPhone(phone) {
  const digits = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(digits);
}

// Trim a string value; return undefined if the result is empty
function clean(val) {
  if (typeof val !== 'string') return undefined;
  return val.trim() || undefined;
}

router.post('/', (req, res) => {
  // ── Extract & sanitise ─────────────────────────────────────────
  const name                  = clean(req.body.name);
  const classVal              = clean(req.body.class);
  const section               = clean(req.body.section);
  const email                 = clean(req.body.email);
  const phone                 = clean(req.body.phone);
  const achievements_projects = typeof req.body.achievements_projects === 'string'
    ? req.body.achievements_projects.trim()
    : '';
  const committee_preference  = clean(req.body.committee_preference);

  // ── Required-field check ───────────────────────────────────────
  const missing = [];
  if (!name)                 missing.push('name');
  if (!classVal)             missing.push('class');
  if (!section)              missing.push('section');
  if (!email)                missing.push('email');
  if (!phone)                missing.push('phone');
  if (!committee_preference) missing.push('committee_preference');

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}.`,
    });
  }

  // ── Format validation ──────────────────────────────────────────
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid phone number (7–15 digits).',
    });
  }

  if (!ALLOWED_COMMITTEES.includes(committee_preference)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid committee selection.',
    });
  }

  // ── Insert (parameterised — no raw string interpolation) ───────
  try {
    const db = getDb();

    db.run(
      `INSERT INTO registrations
         (name, class, section, email, phone, achievements_projects, committee_preference, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [name, classVal, section, email, phone, achievements_projects, committee_preference]
    );

    // Flush to disk after every successful write
    persist();

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully.',
    });
  } catch (err) {
    // Log internally with enough context to diagnose; never send raw
    // error messages, SQL errors, or stack traces to the client.
    console.error('[DB] Insert failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again later.',
    });
  }
});

module.exports = router;
