function registerHealthRoutes(app, { ready }) {
  let readiness = 'starting';
  Promise.resolve(ready).then(
    () => { readiness = 'ready'; },
    () => { readiness = 'error'; }
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
  });

  app.get('/ready', (req, res) => {
    const available = readiness === 'ready';
    res.status(available ? 200 : 503).json({ status: available ? 'ready' : 'not_ready' });
  });
}

module.exports = { registerHealthRoutes };
