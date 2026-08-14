/**
 * database.js
 * Initialises the SQLite database using sql.js (pure JS, no native build needed).
 *
 * DB_PATH is resolved in this order:
 *   1. DB_PATH environment variable (set this in production)
 *   2. backend/data/olympiamun.db  (local development default)
 *
 * The containing directory is created automatically if it does not exist.
 */

const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');

// ── Resolve database path ──────────────────────────────────────
// DB_PATH env var may be absolute or relative to the project root.
// Default keeps data inside backend/data/ which is outside the
// public/ static directory and therefore not reachable via HTTP.
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'data', 'olympiamun.db');

const DATA_DIR = path.dirname(DB_PATH);

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db; // holds the sql.js Database instance after initDatabase()

/**
 * Initialise (or load from disk) the SQLite database.
 * Must be called once at startup before any route uses getDb().
 * @returns {Promise<Object>} the sql.js Database instance
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database file or create a fresh in-memory database
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create registrations table if it does not already exist.
  // Schema is additive-only so that future migrations can extend it.
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT    NOT NULL,
      class                 TEXT    NOT NULL,
      section               TEXT    NOT NULL,
      email                 TEXT    NOT NULL,
      phone                 TEXT    NOT NULL,
      achievements_projects TEXT,
      committee_preference  TEXT    NOT NULL,
      status                TEXT    NOT NULL DEFAULT 'pending',
      created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  // Flush the initial schema to disk immediately
  persist();

  return db;
}

/**
 * Write the in-memory database to disk atomically.
 *
 * sql.js keeps the database in memory; this must be called after
 * every write operation to ensure durability.
 *
 * Uses a write-to-temp-then-rename pattern so the file on disk is
 * never left in a partially-written state.
 */
function persist() {
  if (!db) return;

  const data    = db.export();              // Uint8Array snapshot
  const tmpPath = DB_PATH + '.tmp';

  fs.writeFileSync(tmpPath, Buffer.from(data));
  fs.renameSync(tmpPath, DB_PATH);          // atomic replace
}

/**
 * Return the live database instance.
 * Throws if called before initDatabase() completes.
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialised. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDb, persist };
