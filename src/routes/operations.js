const fs = require('fs');
const { DATABASE_URL, SQLITE_PATH } = require('../config');
const { verificationSummary } = require('../score-verification');
const { readinessSummary } = require('../exam-readiness');

function registerOperationsRoutes(app, { requireAdmin, readDB, assetStorage, runtimeMetrics, submissionGate, pingDatabase, readinessTimeoutMs, backupService, systemMonitor, alertManager, jobQueue, sessionStore }) {
  app.get('/api/admin/operations', requireAdmin, async (req, res) => {
    const db = readDB();
    const memory = process.memoryUsage();
    const requests = runtimeMetrics.snapshot();
    requests.inFlight = Math.max(0, requests.inFlight - 1);
    let databaseBytes = null;
    if (!DATABASE_URL) {
      try { databaseBytes = fs.statSync(SQLITE_PATH).size; } catch (error) { databaseBytes = null; }
    }
    const recentActivity = [...db.auditLogs]
      .sort((a, b) => String(b.eventAt || '').localeCompare(String(a.eventAt || '')))
      .slice(0, 8)
      .map(event => ({ id: event.id, eventAt: event.eventAt, action: event.action, actorType: event.actorType, actorId: event.actorId || '', targetId: event.targetId || '' }));

    let database;
    try { database = await pingDatabase({ timeoutMs: readinessTimeoutMs }); }
    catch (error) { database = { status: 'disconnected', engine: DATABASE_URL ? 'PostgreSQL' : 'SQLite' }; }
    database.sizeBytes = databaseBytes;

    const activeTeacherSessions = await sessionStore.count('teacher');
    res.json({
      generatedAt: new Date().toISOString(),
      status: 'operational',
      uptimeSeconds: Math.floor(process.uptime()),
      database,
      backup: backupService.status(),
      monitoring: systemMonitor.status(),
      alerts: alertManager.status(),
      jobs: jobQueue.snapshot(),
      sessions: sessionStore.status(),
      storage: { status: assetStorage.configured ? 'configured' : 'not_configured', maxBytes: assetStorage.maxBytes },
      memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
      requests,
      submissions: submissionGate.snapshot(),
      scoreVerification: verificationSummary(db),
      examReadiness: readinessSummary(db.sets),
      counts: {
        students: db.students.length,
        teachers: db.teachers.length,
        examSets: db.sets.length,
        results: db.results.length,
        drafts: db.drafts.length,
        auditLogs: db.auditLogs.length,
        activeTeacherSessions
      },
      recentActivity
    });
  });
}

module.exports = { registerOperationsRoutes };
