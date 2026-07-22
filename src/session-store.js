const crypto = require('crypto');
const { createClient } = require('redis');

function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

function createSessionStore({ redisUrl = '', prefix = 'exam', now = () => Date.now(), logger = console } = {}) {
  const memory = { teacher: new Map(), student: new Map() };
  let client = null;
  let connected = false;
  let lastError = null;

  const ready = redisUrl ? (async () => {
    client = createClient({ url: redisUrl, socket: { connectTimeout: 5000, reconnectStrategy: retries => retries >= 5 ? new Error('Redis reconnect limit reached') : Math.min(retries * 100, 3000) } });
    client.on('error', error => { lastError = String(error?.message || error).slice(0, 200); logger.error('[sessions] Redis error:', lastError); });
    client.on('ready', () => { connected = true; lastError = null; });
    client.on('end', () => { connected = false; });
    await client.connect();
    connected = true;
  })() : Promise.resolve();

  function key(role, token) { return `${prefix}:session:${role}:${tokenHash(token)}`; }
  function expiryKey(role) { return `${prefix}:session-expiry:${role}`; }

  async function set(role, token, subjectId, ttlMs) {
    const expiresAt = now() + ttlMs;
    if (!client) {
      memory[role].set(token, { subjectId, [`${role}Id`]: subjectId, expiresAt });
      return;
    }
    await ready;
    const hashed = tokenHash(token);
    await client.multi()
      .set(key(role, token), JSON.stringify({ subjectId }), { PX: ttlMs })
      .zAdd(expiryKey(role), [{ score: expiresAt, value: hashed }])
      .exec();
  }

  async function getAndTouch(role, token, ttlMs) {
    if (!token) return null;
    if (!client) {
      const session = memory[role].get(token);
      if (!session || session.expiresAt <= now()) { memory[role].delete(token); return null; }
      session.expiresAt = now() + ttlMs;
      return session.subjectId;
    }
    await ready;
    const value = await client.get(key(role, token));
    if (!value) return null;
    const session = JSON.parse(value);
    const expiresAt = now() + ttlMs;
    await client.multi().pExpire(key(role, token), ttlMs).zAdd(expiryKey(role), [{ score: expiresAt, value: tokenHash(token) }]).exec();
    return session.subjectId;
  }

  async function remove(role, token) {
    if (!token) return;
    if (!client) { memory[role].delete(token); return; }
    await ready;
    await client.multi().del(key(role, token)).zRem(expiryKey(role), tokenHash(token)).exec();
  }

  async function removeBySubject(role, subjectId) {
    if (!client) {
      for (const [token, session] of memory[role]) if (session.subjectId === subjectId) memory[role].delete(token);
      return;
    }
    await ready;
    const removals = [];
    const hashes = [];
    for await (const redisKey of client.scanIterator({ MATCH: `${prefix}:session:${role}:*`, COUNT: 100 })) {
      const value = await client.get(redisKey);
      if (value && JSON.parse(value).subjectId === subjectId) { removals.push(redisKey); hashes.push(redisKey.slice(redisKey.lastIndexOf(':') + 1)); }
    }
    if (removals.length) await client.multi().del(removals).zRem(expiryKey(role), hashes).exec();
  }

  async function clear(role) {
    if (!client) { memory[role].clear(); return; }
    await ready;
    const removals = [];
    for await (const redisKey of client.scanIterator({ MATCH: `${prefix}:session:${role}:*`, COUNT: 100 })) removals.push(redisKey);
    if (removals.length) await client.del(removals);
    await client.del(expiryKey(role));
  }

  function purgeExpired(current = now()) {
    let removed = 0;
    for (const store of Object.values(memory)) for (const [token, session] of store) if (session.expiresAt <= current) { store.delete(token); removed += 1; }
    return removed;
  }

  async function count(role) {
    if (!client) { purgeExpired(); return memory[role].size; }
    await ready;
    await client.zRemRangeByScore(expiryKey(role), 0, now());
    return client.zCard(expiryKey(role));
  }

  async function ping({ timeoutMs = 3000 } = {}) {
    if (!client) return { status: 'connected', engine: 'Memory', latencyMs: 0 };
    await ready;
    const startedAt = now();
    let timer;
    try {
      await Promise.race([
        client.ping(),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Session store probe timed out')), timeoutMs);
          timer.unref?.();
        })
      ]);
      return { status: 'connected', engine: 'Redis', latencyMs: Math.max(0, now() - startedAt) };
    } finally { clearTimeout(timer); }
  }

  function status() { return { engine: redisUrl ? 'Redis' : 'Memory', configured: Boolean(redisUrl), connected: redisUrl ? Boolean(connected && client?.isReady) : true, lastError }; }
  async function close() { if (client?.isOpen) await client.quit(); connected = false; }

  return { ready, set, getAndTouch, remove, removeBySubject, clear, purgeExpired, count, ping, status, close, memory };
}

module.exports = { createSessionStore };
