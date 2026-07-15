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
  SUPABASE_URL: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  // New Supabase secret keys replace legacy service-role keys. Keep the fallback for older projects.
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'exam-assets',
  EXAM_TYPES: ['กลางภาค', 'ปลายภาค']
};
