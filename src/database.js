const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR, SQLITE_PATH, LEGACY_DB_PATH } = require('./config');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new DatabaseSync(SQLITE_PATH);
sqlite.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS exam_sets (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    class_room TEXT,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    question_key TEXT NOT NULL,
    submitted_at TEXT,
    published INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    UNIQUE (student_id, question_key)
  );
  CREATE INDEX IF NOT EXISTS idx_students_class_room ON students(class_room);
  CREATE INDEX IF NOT EXISTS idx_results_question_key ON results(question_key);
  CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
`);

function emptyDatabase() {
  return { sets: [], results: [], students: [], teachers: [] };
}

function parseRows(statement) {
  return statement.all().map(row => JSON.parse(row.data));
}

function isEmpty() {
  return sqlite.prepare(`
    SELECT
      (SELECT COUNT(*) FROM exam_sets) +
      (SELECT COUNT(*) FROM results) +
      (SELECT COUNT(*) FROM students) +
      (SELECT COUNT(*) FROM teachers) AS count
  `).get().count === 0;
}

function migrateLegacyJson() {
  if (!isEmpty() || !fs.existsSync(LEGACY_DB_PATH)) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_DB_PATH, 'utf8'));
    replaceDatabase({
      sets: Array.isArray(legacy.sets) ? legacy.sets : [],
      results: Array.isArray(legacy.results) ? legacy.results : [],
      students: Array.isArray(legacy.students) ? legacy.students : [],
      teachers: Array.isArray(legacy.teachers) ? legacy.teachers : []
    });
    console.log(`Migrated legacy JSON data to SQLite: ${SQLITE_PATH}`);
  } catch (error) {
    console.error('Failed to migrate legacy JSON database to SQLite.', error);
  }
}

function readDB() {
  try {
    return {
      sets: parseRows(sqlite.prepare('SELECT data FROM exam_sets ORDER BY rowid')),
      results: parseRows(sqlite.prepare('SELECT data FROM results ORDER BY rowid')),
      students: parseRows(sqlite.prepare('SELECT data FROM students ORDER BY rowid')),
      teachers: parseRows(sqlite.prepare('SELECT data FROM teachers ORDER BY rowid'))
    };
  } catch (error) {
    console.error('Failed to read SQLite database, returning an empty database.', error);
    return emptyDatabase();
  }
}

function replaceDatabase(db) {
  const insertSet = sqlite.prepare('INSERT INTO exam_sets (key, data) VALUES (?, ?)');
  const insertStudent = sqlite.prepare('INSERT INTO students (student_id, class_room, data) VALUES (?, ?, ?)');
  const insertTeacher = sqlite.prepare('INSERT INTO teachers (id, username, data) VALUES (?, ?, ?)');
  const insertResult = sqlite.prepare('INSERT INTO results (id, student_id, question_key, submitted_at, published, data) VALUES (?, ?, ?, ?, ?, ?)');

  sqlite.exec('BEGIN IMMEDIATE');
  try {
    sqlite.exec('DELETE FROM results; DELETE FROM exam_sets; DELETE FROM students; DELETE FROM teachers;');
    for (const set of Array.isArray(db.sets) ? db.sets : []) insertSet.run(set.key, JSON.stringify(set));
    for (const student of Array.isArray(db.students) ? db.students : []) insertStudent.run(student.studentId, student.classRoom || null, JSON.stringify(student));
    for (const teacher of Array.isArray(db.teachers) ? db.teachers : []) insertTeacher.run(teacher.id, teacher.username, JSON.stringify(teacher));
    for (const result of Array.isArray(db.results) ? db.results : []) {
      insertResult.run(result.id, result.studentId, result.questionKey, result.submittedAt || null, result.published ? 1 : 0, JSON.stringify(result));
    }
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function writeDB(db) {
  replaceDatabase(db);
  return Promise.resolve();
}

migrateLegacyJson();

module.exports = { readDB, writeDB, SQLITE_PATH };
