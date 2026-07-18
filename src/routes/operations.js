const fs = require('fs');
const { DATABASE_URL, SQLITE_PATH } = require('../config');
const { verificationSummary, verificationReport } = require('../score-verification');
const { readinessSummary } = require('../exam-readiness');

function liveOperationsSnapshot(db, { submissions, jobs, requests }, now = Date.now()) {
  const activeStudentIds = new Set(db.drafts.filter(draft => draft.studentId && new Date(draft.lockUntil || 0).getTime() > now).map(draft => draft.studentId));
  const recentCutoff = now - 5 * 60 * 1000;
  const activeExams = db.sets.filter(set => !set.archived && !set.deletedAt && (!set.availableFrom || new Date(set.availableFrom).getTime() <= now) && (!set.availableUntil || new Date(set.availableUntil).getTime() >= now)).length;
  return {
    generatedAt: new Date(now).toISOString(), activeStudents: activeStudentIds.size, activeExams,
    resultsLast5Minutes: db.results.filter(result => new Date(result.submittedAt || 0).getTime() >= recentCutoff).length,
    submissions: { active: submissions.active, pending: submissions.pending, overloaded: submissions.overloaded },
    jobs: { active: jobs.active, pending: jobs.pending, failed: jobs.failed },
    api: { inFlight: requests.inFlight, errorRatePercent: requests.errorRatePercent }
  };
}

function registerOperationsRoutes(app, { requireAdmin, readDB, assetStorage, runtimeMetrics, submissionGate, pingDatabase, readinessTimeoutMs, backupService, restoreDrill, enqueueRestoreDrill, systemMonitor, alertManager, jobQueue, sessionStore }) {
  app.get('/api/admin/operations/score-verification', requireAdmin, (req, res) => {
    const db = readDB();
    res.json({ generatedAt: new Date().toISOString(), summary: verificationSummary(db), issues: verificationReport(db) });
  });

  let activeStreams = 0;
  app.get('/api/admin/operations/stream', requireAdmin, (req, res) => {
    if (activeStreams >= 5) return res.status(429).json({ error: 'stream_limit', message: 'Too many live Operations connections.' });
    activeStreams += 1;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    const publish = () => {
      const snapshot = liveOperationsSnapshot(readDB(), { submissions: submissionGate.snapshot(), jobs: jobQueue.snapshot(), requests: runtimeMetrics.snapshot() });
      res.write(`event: operations\ndata: ${JSON.stringify(snapshot)}\n\n`);
    };
    publish();
    const timer = setInterval(publish, 3000);
    timer.unref?.();
    let closed = false;
    const close = () => { if (closed) return; closed = true; clearInterval(timer); activeStreams = Math.max(0, activeStreams - 1); };
    req.once('close', close);
    res.once('close', close);
  });

  app.post('/api/admin/operations/restore-drill', requireAdmin, (req, res) => {
    if (!restoreDrill.status().configured) return res.status(409).json({ error: 'restore_drill_not_configured', message: 'Encrypted backup and restore drill must be configured first.' });
    const queued = enqueueRestoreDrill();
    res.status(queued.accepted ? 202 : 409).json(queued);
  });

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
      restoreDrill: restoreDrill.status(),
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

module.exports = { registerOperationsRoutes, liveOperationsSnapshot };
