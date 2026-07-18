const test = require('node:test');
const assert = require('node:assert/strict');
const { createShutdownHandler } = require('../src/shutdown');
const silentLogger = { log() {}, error() {} };

test('graceful shutdown closes the server and database once', async () => {
  const calls = [];
  const server = {
    closeIdleConnections() { calls.push('idle'); },
    close(callback) { calls.push('server'); callback(); },
    closeAllConnections() { calls.push('force'); }
  };
  const shutdown = createShutdownHandler({
    server,
    closeDatabase: async () => { calls.push('database'); },
    timeoutMs: 100,
    logger: silentLogger
  });

  assert.equal(await shutdown('test'), true);
  assert.equal(await shutdown('test-again'), false);
  assert.deepEqual(calls, ['idle', 'server', 'database']);
});

test('graceful shutdown reports a server close failure', async () => {
  const priorExitCode = process.exitCode;
  let databaseClosed = false;
  const server = { close(callback) { callback(new Error('close failed')); } };
  const shutdown = createShutdownHandler({ server, closeDatabase: async () => { databaseClosed = true; }, timeoutMs: 100, logger: silentLogger });

  assert.equal(await shutdown('test-error'), false);
  assert.equal(process.exitCode, 1);
  assert.equal(databaseClosed, true);
  process.exitCode = priorExitCode;
});
