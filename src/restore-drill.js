const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { decryptBackup } = require('./backup');

const BACKUP_PATTERN = /^exam-backup-\d{4}-\d{2}-\d{2}T[\d.-]+Z\.json\.gz\.enc$/;
const COLLECTION_KEYS = ['sets', 'results', 'students', 'teachers', 'questionBank', 'drafts', 'auditLogs'];
const ID_FIELDS = { sets: 'key', results: 'id', students: 'studentId', teachers: 'id', questionBank: 'id', drafts: 'draftKey', auditLogs: 'id' };

function validateRestoredBackup(payload) {
  if (!payload || payload.version !== 2 || !payload.exportedAt || !payload.database || typeof payload.database !== 'object') throw new Error('Invalid backup envelope');
  const counts = {};
  for (const collection of COLLECTION_KEYS) {
    const rows = payload.database[collection];
    if (!Array.isArray(rows)) throw new Error(`Invalid backup collection: ${collection}`);
    const field = ID_FIELDS[collection];
    const ids = new Set();
    for (const row of rows) {
      const id = row?.[field];
      if (typeof id !== 'string' || !id) throw new Error(`Missing ${field} in ${collection}`);
      if (ids.has(id)) throw new Error(`Duplicate ${field} in ${collection}`);
      ids.add(id);
    }
    counts[collection] = rows.length;
  }
  if (!payload.database.settings || typeof payload.database.settings !== 'object') throw new Error('Invalid backup settings');
  return counts;
}

function createRestoreDrill({ enabled = false, backupDir, encryptionKey = '', maxBytes = 250 * 1024 * 1024, alertManager, now = () => Date.now(), logger = console } = {}) {
  const configured = enabled && encryptionKey.length >= 32;
  let running = false;
  let lastSuccessAt = null;
  let lastFailureAt = null;
  let lastError = null;
  let lastBackupFile = null;
  let lastFingerprint = null;
  let lastCounts = null;
  let previouslyFailed = false;

  async function latestBackup() {
    const entries = await fs.promises.readdir(backupDir, { withFileTypes: true });
    const candidates = await Promise.all(entries.filter(entry => entry.isFile() && BACKUP_PATTERN.test(entry.name)).map(async entry => {
      const file = path.resolve(backupDir, entry.name);
      if (path.dirname(file) !== path.resolve(backupDir)) return null;
      return { file, name: entry.name, stat: await fs.promises.stat(file) };
    }));
    return candidates.filter(Boolean).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0] || null;
  }

  async function run() {
    if (!configured || running) return { verified: false, reason: configured ? 'already_running' : 'not_configured' };
    running = true;
    const checkedAt = new Date(now()).toISOString();
    try {
      const latest = await latestBackup();
      if (!latest) throw new Error('No encrypted backup is available for restore drill');
      if (latest.stat.size > maxBytes) throw new Error('Backup exceeds restore drill size limit');
      const encrypted = await fs.promises.readFile(latest.file);
      const payload = await decryptBackup(encrypted, encryptionKey);
      const counts = validateRestoredBackup(payload);
      const fingerprint = crypto.createHash('sha256').update(encrypted).digest('hex').slice(0, 16);
      lastSuccessAt = checkedAt;
      lastBackupFile = latest.name;
      lastFingerprint = fingerprint;
      lastCounts = counts;
      lastError = null;
      if (previouslyFailed) await alertManager?.send({ type: 'restore_drill_recovered', severity: 'info', message: 'Automated backup restore drill recovered.' });
      previouslyFailed = false;
      return { verified: true, backupFile: latest.name, fingerprint, counts };
    } catch (error) {
      lastFailureAt = checkedAt;
      lastError = String(error?.message || error).slice(0, 200);
      previouslyFailed = true;
      logger.error('[restore-drill] Verification failed:', lastError);
      await alertManager?.send({ type: 'restore_drill_failed', severity: 'critical', message: 'Automated backup restore drill failed.', details: { error: lastError } });
      return { verified: false, reason: 'failed' };
    } finally { running = false; }
  }

  function status() { return { enabled, configured, running, lastSuccessAt, lastFailureAt, lastError, lastBackupFile, lastFingerprint, lastCounts }; }
  return { run, status };
}

module.exports = { validateRestoredBackup, createRestoreDrill };
