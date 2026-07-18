const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const MAGIC = Buffer.from('EXAMBACKUP2');

async function encryptBackup(value, secret) {
  const compressed = await gzip(Buffer.from(JSON.stringify(value)));
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}

async function decryptBackup(buffer, secret) {
  if (!buffer.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Unsupported backup format');
  const ivStart = MAGIC.length;
  const tagStart = ivStart + 12;
  const dataStart = tagStart + 16;
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, buffer.subarray(ivStart, tagStart));
  decipher.setAuthTag(buffer.subarray(tagStart, dataStart));
  return JSON.parse((await gunzip(Buffer.concat([decipher.update(buffer.subarray(dataStart)), decipher.final()]))).toString('utf8'));
}

function createBackupService({ enabled = false, backupDir, intervalMs = 86_400_000, retentionMs = 30 * 86_400_000, encryptionKey = '', readDB, alertManager, now = () => Date.now(), logger = console } = {}) {
  const configured = enabled && encryptionKey.length >= 32;
  let timer = null;
  let running = false;
  let lastSuccessAt = null;
  let lastFailureAt = null;
  let lastError = null;
  let nextRunAt = null;
  let previouslyFailed = false;

  async function removeExpiredBackups(current) {
    const entries = await fs.promises.readdir(backupDir, { withFileTypes: true });
    await Promise.all(entries.filter(entry => entry.isFile() && /^exam-backup-\d{4}-\d{2}-\d{2}T[\d.-]+Z\.json\.gz\.enc$/.test(entry.name)).map(async entry => {
      const target = path.resolve(backupDir, entry.name);
      if (path.dirname(target) !== path.resolve(backupDir)) return;
      const stat = await fs.promises.stat(target);
      if (current - stat.mtimeMs > retentionMs) await fs.promises.unlink(target);
    }));
  }

  async function run() {
    if (!configured || running) return { created: false, reason: configured ? 'already_running' : 'not_configured' };
    running = true;
    const current = now();
    try {
      await fs.promises.mkdir(backupDir, { recursive: true });
      const exportedAt = new Date(current).toISOString();
      const contents = await encryptBackup({ version: 2, exportedAt, database: readDB() }, encryptionKey);
      const filename = `exam-backup-${exportedAt.replace(/:/g, '-')}.json.gz.enc`;
      const target = path.resolve(backupDir, filename);
      const temporary = `${target}.${process.pid}.tmp`;
      await fs.promises.writeFile(temporary, contents, { flag: 'wx', mode: 0o600 });
      await fs.promises.rename(temporary, target);
      await removeExpiredBackups(current);
      lastSuccessAt = exportedAt;
      lastError = null;
      if (previouslyFailed) await alertManager?.send({ type: 'backup_recovered', severity: 'info', message: 'Automatic database backup recovered.' });
      previouslyFailed = false;
      return { created: true, filename };
    } catch (error) {
      lastFailureAt = new Date(current).toISOString();
      lastError = String(error?.message || error).slice(0, 300);
      previouslyFailed = true;
      logger.error('[backup] Automatic backup failed:', lastError);
      await alertManager?.send({ type: 'backup_failed', severity: 'critical', message: 'Automatic database backup failed.', details: { error: lastError } });
      return { created: false, reason: 'failed' };
    } finally {
      running = false;
    }
  }

  function schedule(runBackup = run) {
    if (!configured || timer) return;
    nextRunAt = new Date(now() + intervalMs).toISOString();
    timer = setInterval(() => {
      nextRunAt = new Date(now() + intervalMs).toISOString();
      void runBackup();
    }, intervalMs);
    timer.unref?.();
  }

  function stop() { if (timer) clearInterval(timer); timer = null; nextRunAt = null; }
  function status() { return { enabled, configured, running, encrypted: configured, retentionDays: Math.round(retentionMs / 86_400_000), lastSuccessAt, lastFailureAt, lastError, nextRunAt }; }
  return { run, schedule, stop, status };
}

module.exports = { encryptBackup, decryptBackup, createBackupService };
