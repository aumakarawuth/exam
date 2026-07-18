const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encryptBackup, decryptBackup, createBackupService } = require('../src/backup');

test('encrypted backups round-trip and do not expose plaintext', async () => {
  const value = { students: [{ studentId: 'secret-student' }] };
  const secret = 'a'.repeat(32);
  const encrypted = await encryptBackup(value, secret);
  assert.equal(encrypted.includes(Buffer.from('secret-student')), false);
  assert.deepEqual(await decryptBackup(encrypted, secret), value);
  await assert.rejects(() => decryptBackup(encrypted, 'b'.repeat(32)));
});

test('automatic backup writes an encrypted atomic file', async t => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'exam-backup-test-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const service = createBackupService({ enabled: true, backupDir: directory, encryptionKey: 'x'.repeat(32), readDB: () => ({ results: [{ score: 20 }] }), logger: { error() {} } });
  const result = await service.run();
  assert.equal(result.created, true);
  const files = await fs.promises.readdir(directory);
  assert.equal(files.length, 1);
  assert.match(files[0], /\.json\.gz\.enc$/);
  const restored = await decryptBackup(await fs.promises.readFile(path.join(directory, files[0])), 'x'.repeat(32));
  assert.equal(restored.database.results[0].score, 20);
  assert.equal(service.status().encrypted, true);
});

test('automatic backup refuses to run without a strong encryption key', async () => {
  const service = createBackupService({ enabled: true, backupDir: '.', encryptionKey: 'short', readDB: () => ({}) });
  assert.equal((await service.run()).reason, 'not_configured');
  assert.equal(service.status().configured, false);
});
