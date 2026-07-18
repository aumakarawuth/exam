function createSystemMonitor({ pingDatabase, runtimeMetrics, submissionGate, alertManager, intervalMs = 60_000, databaseTimeoutMs = 3000, errorRateThreshold = 5, queuePercentThreshold = 80, now = () => Date.now() } = {}) {
  let timer = null;
  let checking = false;
  let previousDatabaseStatus = null;
  let lastCheckAt = null;
  let database = { status: 'unknown' };

  async function check() {
    if (checking) return;
    checking = true;
    lastCheckAt = new Date(now()).toISOString();
    try {
      try {
        database = await pingDatabase({ timeoutMs: databaseTimeoutMs });
        if (previousDatabaseStatus === 'disconnected') await alertManager.send({ type: 'database_recovered', severity: 'info', message: 'Database connection recovered.', details: { latencyMs: database.latencyMs, engine: database.engine } });
        previousDatabaseStatus = 'connected';
      } catch (error) {
        database = { status: 'disconnected' };
        if (previousDatabaseStatus !== 'disconnected') await alertManager.send({ type: 'database_down', severity: 'critical', message: 'Database readiness probe failed.' });
        previousDatabaseStatus = 'disconnected';
      }
      const requests = runtimeMetrics.snapshot();
      if (requests.totalRequests >= 20 && requests.errorRatePercent >= errorRateThreshold) {
        await alertManager.send({ type: 'high_error_rate', message: 'Server error rate exceeded its threshold.', details: { errorRatePercent: requests.errorRatePercent, thresholdPercent: errorRateThreshold } });
      }
      const submissions = submissionGate.snapshot();
      const queuePercent = submissions.maxPending ? submissions.pending / submissions.maxPending * 100 : 0;
      if (queuePercent >= queuePercentThreshold) await alertManager.send({ type: 'submission_queue_high', message: 'Exam submission queue is nearing capacity.', details: { pending: submissions.pending, maxPending: submissions.maxPending } });
    } finally {
      checking = false;
    }
  }

  function start() {
    if (timer) return;
    void check();
    timer = setInterval(() => void check(), intervalMs);
    timer.unref?.();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  function status() { return { enabled: true, intervalSeconds: Math.round(intervalMs / 1000), lastCheckAt, database }; }
  return { check, start, stop, status };
}

module.exports = { createSystemMonitor };
