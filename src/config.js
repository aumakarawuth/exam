const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  ROOT_DIR,
  DATA_DIR: path.join(ROOT_DIR, 'data'),
  SQLITE_PATH: path.join(ROOT_DIR, 'data', 'exam-system.sqlite'),
  LEGACY_DB_PATH: path.join(ROOT_DIR, 'data', 'db.json'),
  PUBLIC_DIR: path.join(ROOT_DIR, 'public'),
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  ADMIN_KEY: process.env.ADMIN_KEY || 'changeme123',
  EXAM_TYPES: ['กลางภาค', 'ปลายภาค']
};
