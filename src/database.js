const fs = require('fs');
const { DATA_DIR, DB_PATH } = require('./config');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function emptyDatabase() {
  return { sets: [], results: [], students: [], teachers: [] };
}

function readDB() {
  if (!fs.existsSync(DB_PATH)) return emptyDatabase();
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!Array.isArray(db.sets)) db.sets = [];
    if (!Array.isArray(db.results)) db.results = [];
    if (!Array.isArray(db.students)) db.students = [];
    if (!Array.isArray(db.teachers)) db.teachers = [];
    return db;
  } catch (error) {
    console.error('Failed to read database file, starting with an empty database.', error);
    return emptyDatabase();
  }
}

let writeChain = Promise.resolve();

function writeDB(db) {
  writeChain = writeChain.then(() => new Promise((resolve, reject) => {
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFile(tmpPath, JSON.stringify(db, null, 2), (error) => {
      if (error) return reject(error);
      fs.rename(tmpPath, DB_PATH, (renameError) => renameError ? reject(renameError) : resolve());
    });
  }));
  return writeChain;
}

module.exports = { readDB, writeDB };
