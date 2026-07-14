const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const { DATA_DIR, SQLITE_PATH, LEGACY_DB_PATH } = require('./config');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function emptyDatabase() {
  return { sets: [], results: [], students: [], teachers: [], questionBank: [] };
}

function normalizeDatabase(db) {
  return {
    sets: Array.isArray(db?.sets) ? db.sets : [],
    results: Array.isArray(db?.results) ? db.results : [],
    students: Array.isArray(db?.students) ? db.students : [],
    teachers: Array.isArray(db?.teachers) ? db.teachers : [],
    questionBank: Array.isArray(db?.questionBank) ? db.questionBank : []
  };
}

/* SQLite remains available for local development and as the migration source. */
const sqlite = new DatabaseSync(SQLITE_PATH);
sqlite.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS exam_sets (key TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS students (student_id TEXT PRIMARY KEY, class_room TEXT, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS question_bank (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY, student_id TEXT NOT NULL, question_key TEXT NOT NULL,
    submitted_at TEXT, published INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL,
    UNIQUE (student_id, question_key)
  );
  CREATE INDEX IF NOT EXISTS idx_students_class_room ON students(class_room);
  CREATE INDEX IF NOT EXISTS idx_results_question_key ON results(question_key);
  CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
`);

function parseSqliteRows(statement) {
  return statement.all().map(row => JSON.parse(row.data));
}

function readSqliteDatabase() {
  try {
    return {
      sets: parseSqliteRows(sqlite.prepare('SELECT data FROM exam_sets ORDER BY rowid')),
      results: parseSqliteRows(sqlite.prepare('SELECT data FROM results ORDER BY rowid')),
      students: parseSqliteRows(sqlite.prepare('SELECT data FROM students ORDER BY rowid')),
      teachers: parseSqliteRows(sqlite.prepare('SELECT data FROM teachers ORDER BY rowid')),
      questionBank: parseSqliteRows(sqlite.prepare('SELECT data FROM question_bank ORDER BY rowid'))
    };
  } catch (error) {
    console.error('Failed to read SQLite database, returning an empty database.', error);
    return emptyDatabase();
  }
}

function replaceSqliteDatabase(db) {
  const insertSet = sqlite.prepare('INSERT INTO exam_sets (key, data) VALUES (?, ?)');
  const insertStudent = sqlite.prepare('INSERT INTO students (student_id, class_room, data) VALUES (?, ?, ?)');
  const insertTeacher = sqlite.prepare('INSERT INTO teachers (id, username, data) VALUES (?, ?, ?)');
  const insertResult = sqlite.prepare('INSERT INTO results (id, student_id, question_key, submitted_at, published, data) VALUES (?, ?, ?, ?, ?, ?)');
  const insertBankQuestion = sqlite.prepare('INSERT INTO question_bank (id, data) VALUES (?, ?)');
  const clean = normalizeDatabase(db);

  sqlite.exec('BEGIN IMMEDIATE');
  try {
    sqlite.exec('DELETE FROM results; DELETE FROM exam_sets; DELETE FROM students; DELETE FROM teachers; DELETE FROM question_bank;');
    for (const set of clean.sets) insertSet.run(set.key, JSON.stringify(set));
    for (const student of clean.students) insertStudent.run(student.studentId, student.classRoom || null, JSON.stringify(student));
    for (const teacher of clean.teachers) insertTeacher.run(teacher.id, teacher.username, JSON.stringify(teacher));
    for (const result of clean.results) insertResult.run(result.id, result.studentId, result.questionKey, result.submittedAt || null, result.published ? 1 : 0, JSON.stringify(result));
    for (const question of clean.questionBank) insertBankQuestion.run(question.id, JSON.stringify(question));
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function migrateLegacyJsonToSqlite() {
  const sqliteData = readSqliteDatabase();
  if (sqliteData.sets.length || sqliteData.results.length || sqliteData.students.length || sqliteData.teachers.length || sqliteData.questionBank.length || !fs.existsSync(LEGACY_DB_PATH)) return;
  try {
    replaceSqliteDatabase(JSON.parse(fs.readFileSync(LEGACY_DB_PATH, 'utf8')));
    console.log(`Migrated legacy JSON data to SQLite: ${SQLITE_PATH}`);
  } catch (error) {
    console.error('Failed to migrate legacy JSON database to SQLite.', error);
  }
}

migrateLegacyJsonToSqlite();

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let currentDatabase = DATABASE_URL ? emptyDatabase() : readSqliteDatabase();
let writeChain = Promise.resolve();

function hasData(db) {
  return db.sets.length || db.results.length || db.students.length || db.teachers.length || db.questionBank.length;
}

async function persistPostgres(db) {
  await pool.query(
    `INSERT INTO exam_system_state (id, data, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(db)]
  );
}

async function initializePostgres() {
  pool = new Pool({
    connectionString: DATABASE_URL,
    // Neon requires TLS. Set DATABASE_SSL=false only for a local PostgreSQL server without TLS.
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_system_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const state = await pool.query('SELECT data FROM exam_system_state WHERE id = 1');
  if (state.rowCount) {
    currentDatabase = normalizeDatabase(state.rows[0].data);
    return;
  }

  const sqliteData = readSqliteDatabase();
  if (hasData(sqliteData)) {
    currentDatabase = normalizeDatabase(sqliteData);
    await persistPostgres(currentDatabase);
    console.log('Migrated local SQLite data to PostgreSQL.');
  }
}

const databaseReady = DATABASE_URL ? initializePostgres() : Promise.resolve();

function readDB() {
  return structuredClone(currentDatabase);
}

function writeDB(db) {
  const snapshot = normalizeDatabase(structuredClone(db));
  currentDatabase = snapshot;
  if (!DATABASE_URL) {
    replaceSqliteDatabase(currentDatabase);
    return Promise.resolve();
  }
  writeChain = writeChain.then(() => persistPostgres(snapshot));
  return writeChain;
}

module.exports = { readDB, writeDB, databaseReady, SQLITE_PATH };
