function registerHealthRoutes(app, { ready, pingDatabase, readinessTimeoutMs = 3000 }) {
  let readiness = 'starting';
  Promise.resolve(ready).then(
    () => { readiness = 'ready'; },
    () => { readiness = 'error'; }
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
  });

  app.get('/ready', async (req, res) => {
    if (readiness !== 'ready') return res.status(503).json({ status: 'not_ready', database: { status: 'disconnected' } });
    try {
      const database = await pingDatabase({ timeoutMs: readinessTimeoutMs });
      res.json({ status: 'ready', database });
    } catch (error) {
      res.status(503).json({ status: 'not_ready', database: { status: 'disconnected' } });
    }
  });
}

module.exports = { registerHealthRoutes };
