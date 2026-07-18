const fs = require('fs');
const { DATABASE_URL, SQLITE_PATH } = require('../config');

function registerOperationsRoutes(app, { requireAdmin, readDB, assetStorage, teacherSessions, runtimeMetrics, submissionGate }) {
  app.get('/api/admin/operations', requireAdmin, (req, res) => {
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

    res.json({
      generatedAt: new Date().toISOString(),
      status: 'operational',
      uptimeSeconds: Math.floor(process.uptime()),
      database: { status: 'connected', engine: DATABASE_URL ? 'PostgreSQL' : 'SQLite', sizeBytes: databaseBytes },
      storage: { status: assetStorage.configured ? 'configured' : 'not_configured', maxBytes: assetStorage.maxBytes },
      memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
      requests,
      submissions: submissionGate.snapshot(),
      counts: {
        students: db.students.length,
        teachers: db.teachers.length,
        examSets: db.sets.length,
        results: db.results.length,
        drafts: db.drafts.length,
        auditLogs: db.auditLogs.length,
        activeTeacherSessions: teacherSessions.size
      },
      recentActivity
    });
  });
}

module.exports = { registerOperationsRoutes };
