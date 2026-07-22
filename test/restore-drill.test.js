const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encryptBackup } = require('../src/backup');
const { validateRestoredBackup, createRestoreDrill } = require('../src/restore-drill');

function payload() {
  return { version: 2, exportedAt: '2026-07-18T10:00:00.000Z', database: { sets: [{ key: 'set-1' }], results: [], students: [], teachers: [], questionBank: [], drafts: [], auditLogs: [], settings: { academicCalendar: [] } } };
}

test('manual version 1 backups are accepted for full restore', () => {
  const backup=payload();backup.version=1;
  assert.equal(validateRestoredBackup(backup).sets,1);
});

test('restore drill decrypts and validates the latest backup without changing data', async t => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'restore-drill-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const secret = 'r'.repeat(32);
  const filename = 'exam-backup-2026-07-18T10-00-00.000Z.json.gz.enc';
  await fs.promises.writeFile(path.join(directory, filename), await encryptBackup(payload(), secret));
  const drill = createRestoreDrill({ enabled: true, backupDir: directory, encryptionKey: secret, logger: { error() {} } });
  const result = await drill.run();
  assert.equal(result.verified, true);
  assert.equal(result.counts.sets, 1);
  assert.equal(result.fingerprint.length, 16);
  assert.equal(drill.status().lastBackupFile, filename);
});

test('restore drill rejects duplicate row identities', () => {
  const backup = payload();
  backup.database.sets.push({ key: 'set-1' });
  assert.throws(() => validateRestoredBackup(backup), /Duplicate key/);
});

test('restore drill reports authenticated-decryption failure', async t => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'restore-drill-bad-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'exam-backup-2026-07-18T10-00-00.000Z.json.gz.enc');
  const encrypted = await encryptBackup(payload(), 'a'.repeat(32));
  encrypted[encrypted.length - 1] ^= 1;
  await fs.promises.writeFile(file, encrypted);
  const alerts = [];
  const drill = createRestoreDrill({ enabled: true, backupDir: directory, encryptionKey: 'a'.repeat(32), alertManager: { send: async alert => alerts.push(alert.type) }, logger: { error() {} } });
  assert.equal((await drill.run()).reason, 'failed');
  assert.deepEqual(alerts, ['restore_drill_failed']);
});
