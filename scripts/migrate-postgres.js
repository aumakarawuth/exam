require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL to the PostgreSQL connection string before running this command.');
  process.exitCode = 1;
} else {
  const { databaseReady, readDB } = require('../src/database');
  databaseReady
    .then(() => {
      const db = readDB();
      console.log(`PostgreSQL is ready (${db.sets.length} sets, ${db.students.length} students, ${db.results.length} results, ${db.teachers.length} teachers).`);
    })
    .catch(error => {
      console.error('PostgreSQL migration failed.', error);
      process.exitCode = 1;
    });
}
