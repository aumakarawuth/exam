function createShutdownHandler({ server, closeDatabase, timeoutMs = 10_000, logger = console }) {
  let shuttingDown = false;

  return async function shutdown(signal = 'shutdown') {
    if (shuttingDown) return false;
    shuttingDown = true;
    logger.log(`Received ${signal}; shutting down gracefully.`);

    const forceTimer = setTimeout(() => {
      logger.error(`Graceful shutdown exceeded ${timeoutMs}ms; closing remaining connections.`);
      server.closeAllConnections?.();
      process.exitCode = 1;
    }, timeoutMs);
    forceTimer.unref();

    let failure = null;
    try {
      server.closeIdleConnections?.();
      await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
    } catch (error) {
      failure = error;
    }
    try {
      await closeDatabase();
    } catch (error) {
      failure ||= error;
    }
    clearTimeout(forceTimer);
    if (failure) {
      logger.error('Graceful shutdown failed.', failure);
      process.exitCode = 1;
      return false;
    }
    return true;
  };
}

function registerShutdownSignals(handler) {
  process.once('SIGTERM', () => { void handler('SIGTERM'); });
  process.once('SIGINT', () => { void handler('SIGINT'); });
}

module.exports = { createShutdownHandler, registerShutdownSignals };
