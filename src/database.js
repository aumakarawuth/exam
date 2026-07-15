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

const DATABASE_URL = process.env.NODE_ENV === 'test' ? '' : process.env.DATABASE_URL;
let pool = null;
let currentDatabase = DATABASE_URL ? emptyDatabase() : readSqliteDatabase();
let writeChain = Promise.resolve();

function hasData(db) {
  return db.sets.length || db.results.length || db.students.length || db.teachers.length || db.questionBank.length;
}

async function readPostgresDatabase() {
  const [sets, results, students, teachers, questionBank] = await Promise.all([
    pool.query('SELECT data FROM exam_sets ORDER BY created_at, key'),
    pool.query('SELECT data FROM results ORDER BY submitted_at, id'),
    pool.query('SELECT data FROM students ORDER BY class_room, student_id'),
    pool.query('SELECT data FROM teachers ORDER BY username'),
    pool.query('SELECT data FROM question_bank ORDER BY created_at, id')
  ]);
  return normalizeDatabase({
    sets: sets.rows.map(row => row.data), results: results.rows.map(row => row.data),
    students: students.rows.map(row => row.data), teachers: teachers.rows.map(row => row.data),
    questionBank: questionBank.rows.map(row => row.data)
  });
}

async function persistPostgres(db) {
  const clean = normalizeDatabase(db);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM results; DELETE FROM question_bank; DELETE FROM exam_sets; DELETE FROM students; DELETE FROM teachers;');
    for (const set of clean.sets) await client.query(
      'INSERT INTO exam_sets (key, title, teacher_id, delivery, available_from, available_until, created_at, updated_at, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',
      [set.key, set.title || '', set.teacherId || null, set.delivery || null, set.availableFrom || null, set.availableUntil || null, set.createdAt || null, set.updatedAt || null, JSON.stringify(set)]
    );
    for (const student of clean.students) await client.query(
      'INSERT INTO students (student_id, first_name, last_name, class_room, created_at, data) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',
      [student.studentId, student.firstName || '', student.lastName || '', student.classRoom || null, student.createdAt || null, JSON.stringify(student)]
    );
    for (const teacher of clean.teachers) await client.query(
      'INSERT INTO teachers (id, username, first_name, last_name, created_at, data) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',
      [teacher.id, teacher.username, teacher.firstName || '', teacher.lastName || '', teacher.createdAt || null, JSON.stringify(teacher)]
    );
    for (const question of clean.questionBank) await client.query(
      'INSERT INTO question_bank (id, owner_id, course_name, created_at, data) VALUES ($1,$2,$3,$4,$5::jsonb)',
      [question.id, question.ownerId || null, question.courseName || '', question.createdAt || null, JSON.stringify(question)]
    );
    for (const result of clean.results) await client.query(
      'INSERT INTO results (id, student_id, question_key, submitted_at, published, overall_score_20, data) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)',
      [result.id, result.studentId, result.questionKey, result.submittedAt || null, !!result.published, result.overallScore20 ?? null, JSON.stringify(result)]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function initializePostgres() {
  pool = new Pool({
    connectionString: DATABASE_URL,
    // Neon requires TLS. Set DATABASE_SSL=false only for a local PostgreSQL server without TLS.
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_sets (
      key TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', teacher_id TEXT, delivery TEXT,
      available_from TIMESTAMPTZ, available_until TIMESTAMPTZ, created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ, data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      student_id TEXT PRIMARY KEY, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '',
      class_room TEXT, created_at TIMESTAMPTZ, data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ, data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS question_bank (
      id TEXT PRIMARY KEY, owner_id TEXT, course_name TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ, data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL, question_key TEXT NOT NULL, submitted_at TIMESTAMPTZ,
      published BOOLEAN NOT NULL DEFAULT FALSE, overall_score_20 DOUBLE PRECISION, data JSONB NOT NULL,
      UNIQUE (student_id, question_key)
    );
    CREATE INDEX IF NOT EXISTS idx_exam_sets_teacher_id ON exam_sets(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_exam_sets_available_from ON exam_sets(available_from);
    CREATE INDEX IF NOT EXISTS idx_students_class_room ON students(class_room);
    CREATE INDEX IF NOT EXISTS idx_results_question_key ON results(question_key);
    CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
    CREATE INDEX IF NOT EXISTS idx_question_bank_owner_id ON question_bank(owner_id);
    CREATE TABLE IF NOT EXISTS exam_system_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const normalized = await readPostgresDatabase();
  if (hasData(normalized)) {
    currentDatabase = normalized;
    return;
  }

  const state = await pool.query('SELECT data FROM exam_system_state WHERE id = 1');
  if (state.rowCount && hasData(normalizeDatabase(state.rows[0].data))) {
    currentDatabase = normalizeDatabase(state.rows[0].data);
    await persistPostgres(currentDatabase);
    console.log('Migrated PostgreSQL legacy state into normalized tables.');
    return;
  }

  const sqliteData = readSqliteDatabase();
  if (hasData(sqliteData)) {
    currentDatabase = normalizeDatabase(sqliteData);
    await persistPostgres(currentDatabase);
    console.log('Migrated local SQLite data to PostgreSQL tables.');
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
