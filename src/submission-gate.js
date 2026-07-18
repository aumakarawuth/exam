function createSubmissionGate({ maxConcurrent = 25, maxPending = 500 } = {}) {
  let active = 0;
  let completed = 0;
  let overloaded = 0;
  let peakActive = 0;
  const queue = [];

  function dispatch() {
    while (active < maxConcurrent && queue.length) {
      const entry = queue.shift();
      if (!entry.cancelled) start(entry.req, entry.res, entry.next);
    }
  }

  function start(req, res, next) {
    active += 1;
    peakActive = Math.max(peakActive, active);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active = Math.max(0, active - 1);
      completed += 1;
      dispatch();
    };
    res.once('finish', release);
    res.once('close', release);
    next();
  }

  function middleware(req, res, next) {
    if (active < maxConcurrent) return start(req, res, next);
    if (queue.length >= maxPending) {
      overloaded += 1;
      res.setHeader('Retry-After', '2');
      return res.status(503).json({ error: 'submission_busy', message: 'มีผู้ส่งข้อสอบพร้อมกันจำนวนมาก กรุณารอ 2 วินาทีแล้วลองใหม่' });
    }
    const entry = { req, res, next, cancelled: false };
    queue.push(entry);
    req.once('aborted', () => { entry.cancelled = true; });
  }

  function snapshot() {
    return { active, pending: queue.filter(entry => !entry.cancelled).length, maxConcurrent, maxPending, peakActive, completed, overloaded };
  }

  return { middleware, snapshot };
}

module.exports = { createSubmissionGate };
