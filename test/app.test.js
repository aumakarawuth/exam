const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
process.env.NODE_ENV = 'test';
const app = require('../server');
const { ADMIN_KEY } = require('../src/config');
const { readDB, databaseReady } = require('../src/database');
const { createStudentSession } = require('../src/auth');

async function studentHeaders() {
  await Promise.all([databaseReady, app.ready]);
  const student = readDB().students[0];
  return { 'x-student-token': await createStudentSession(student.studentId) };
}

function request(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const requestHeaders = { ...headers };
      if (body) requestHeaders['content-type'] = 'application/json';
      const clientRequest = http.request({ hostname: '127.0.0.1', port, path, method, headers: requestHeaders }, response => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => { server.close(); resolve({ status: response.statusCode, body, headers: response.headers }); });
      });
      clientRequest.on('error', error => { server.close(); reject(error); });
      if (body) clientRequest.write(JSON.stringify(body));
      clientRequest.end();
    });
  });
}

test('public exam types endpoint remains available', async () => {
  const response = await request('/api/exam-types');
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), ['กลางภาค', 'ปลายภาค']);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
});

test('health and readiness endpoints report application state', async () => {
  await app.ready;
  const health = await request('/health');
  assert.equal(health.status, 200);
  const healthBody = JSON.parse(health.body);
  assert.equal(healthBody.status, 'ok');
  assert.equal(Number.isInteger(healthBody.uptimeSeconds), true);

  const ready = await request('/ready');
  assert.equal(ready.status, 200);
  const readyBody = JSON.parse(ready.body);
  assert.equal(readyBody.status, 'ready');
  assert.equal(readyBody.database.status, 'connected');
  assert.equal(typeof readyBody.database.latencyMs, 'number');
  assert.equal(readyBody.sessions.status, 'connected');
});

test('frontend pages load extracted CSS and JavaScript assets', async () => {
  const admin = await request('/admin');
  assert.equal(admin.status, 200);
  assert.match(admin.body, /href="\/assets\/admin\.css"/);
  assert.match(admin.body, /src="\/assets\/admin-main\.js"/);
  assert.match(admin.body, /href="\/manifest\.webmanifest"/);
  assert.match(admin.body, /src="\/assets\/pwa\.js"/);
  assert.doesNotMatch(admin.body, /<style>/);
  const [css, script] = await Promise.all([request('/assets/admin.css'), request('/assets/admin-main.js')]);
  assert.equal(css.status, 200);
  assert.match(css.headers['content-type'], /text\/css/);
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /javascript/);
});

test('PWA shell is installable and never caches API responses', async () => {
  const [manifestResponse, worker, pwa] = await Promise.all([request('/manifest.webmanifest'), request('/service-worker.js'), request('/assets/pwa.js')]);
  assert.equal(manifestResponse.status, 200);
  const manifest = JSON.parse(manifestResponse.body);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(worker.status, 200);
  assert.match(worker.headers['cache-control'], /no-cache/);
  assert.equal(worker.headers['service-worker-allowed'], '/');
  assert.match(worker.body, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.doesNotMatch(worker.body, /cache\.put\([^\n]*api/i);
  assert.equal(pwa.status, 200);
  assert.match(pwa.body, /beforeinstallprompt/);
});

test('unknown API endpoints return a JSON 404 response', async () => {
  const response = await request('/api/endpoint-that-does-not-exist');
  assert.equal(response.status, 404);
  assert.match(response.headers['content-type'], /application\/json/);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'not_found',
    message: 'API endpoint not found: GET /api/endpoint-that-does-not-exist'
  });
});

test('exam sets require a verified student session', async () => {
  const response = await request('/api/sets');
  assert.equal(response.status, 401);
});

test('admin routes reject requests without an admin key', async () => {
  const response = await request('/api/admin/sets');
  assert.equal(response.status, 401);
});

test('operations requires admin access and reports system health', async () => {
  assert.equal((await request('/api/admin/operations')).status, 401);
  const response = await request('/api/admin/operations', { headers: { 'x-admin-key': ADMIN_KEY } });
  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, 'operational');
  assert.equal(body.database.status, 'connected');
  assert.equal(typeof body.database.latencyMs, 'number');
  assert.equal(typeof body.backup.configured, 'boolean');
  assert.equal(typeof body.alerts.configured, 'boolean');
  assert.equal(typeof body.jobs.pending, 'number');
  assert.equal(body.jobs.concurrency, 2);
  assert.equal(body.sessions.engine, 'Memory');
  assert.equal(body.sessions.connected, true);
  assert.equal(typeof body.restoreDrill.configured, 'boolean');
  assert.equal(Number.isInteger(body.uptimeSeconds), true);
  assert.equal(typeof body.counts.students, 'number');
  assert.equal(body.submissions.maxConcurrent, 25);
  assert.equal(body.submissions.maxPending, 500);
  assert.equal(typeof body.scoreVerification.verified, 'number');
  assert.equal(typeof body.scoreVerification.mismatch, 'number');
  assert.equal(typeof body.examReadiness.ready, 'number');
  assert.equal(typeof body.examReadiness.blocked, 'number');
  assert.equal(Array.isArray(body.recentActivity), true);
});

test('manual restore drill requires encrypted backup configuration', async () => {
  const response = await request('/api/admin/operations/restore-drill', { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY } });
  assert.equal(response.status, 409);
  assert.equal(JSON.parse(response.body).error, 'restore_drill_not_configured');
});

test('live Operations stream requires administrator authentication', async () => {
  const response = await request('/api/admin/operations/stream');
  assert.equal(response.status, 401);
});

test('student lookup returns a stable not-found response', async () => {
  const response = await request('/api/students/not-a-student');
  assert.equal(response.status, 404);
  assert.equal(JSON.parse(response.body).error, 'not_found');
});

test('teacher login requires both username and password', async () => {
  const response = await request('/api/teacher/login', { method: 'POST', body: { username: 'teacher' } });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_payload');
});

test('teacher results require a teacher session', async () => {
  const response = await request('/api/teacher/results');
  assert.equal(response.status, 401);
  assert.equal(JSON.parse(response.body).error, 'unauthorized');
});

test('submissions reject a missing student or exam identifier', async () => {
  const response = await request('/api/results', { method: 'POST', headers: await studentHeaders(), body: {} });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_payload');
});

test('public exam data never includes answer keys', async () => {
  const response = await request('/api/sets', { headers: await studentHeaders() });
  assert.equal(response.status, 200);
  const sets = JSON.parse(response.body);
  for (const set of sets) {
    for (const question of set.sections.mc.questions) assert.equal(Object.hasOwn(question, 'answer'), false);
    assert.equal(Object.hasOwn(set.sections.matching, 'correctMap'), false);
    for (const question of set.sections.written.questions) assert.equal(Object.hasOwn(question, 'keywords'), false);
  }
});

test('result exports require the correct role', async () => {
  const [adminExport, teacherExport] = await Promise.all([
    request('/api/export/results.xlsx'),
    request('/api/teacher/export/results.xlsx')
  ]);
  assert.equal(adminExport.status, 401);
  assert.equal(teacherExport.status, 401);
});

test('audit logs require the correct role', async () => {
  assert.equal((await request('/api/audit-logs')).status, 401);
  assert.equal((await request('/api/teacher/audit-logs')).status, 401);
});

test('gradebook endpoints require authentication', async () => {
  assert.equal((await request('/api/gradebook/options')).status, 401);
  assert.equal((await request('/api/teacher/gradebook/options')).status, 401);
  assert.equal((await request('/api/export/gradebook.xlsx?setKey=set_seed_sample1')).status, 401);
});

test('gradebook export waits for at least one midterm or final result', async () => {
  const response = await request('/api/export/gradebook.xlsx?setKey=set_seed_sample1', { headers: { 'x-admin-key': ADMIN_KEY } });
  assert.equal(response.status, 409);
  assert.equal(JSON.parse(response.body).error, 'gradebook_not_ready');
});

test('admin result export returns an Excel workbook', async () => {
  const response = await request('/api/export/results.xlsx', { headers: { 'x-admin-key': ADMIN_KEY } });
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /spreadsheetml/);
  assert.ok(response.body.length > 0);
});

test('admin can export an exam paper PDF without answer keys', async () => {
  await Promise.all([databaseReady, app.ready]);
  const setKey = readDB().sets[0].key;
  const denied = await request('/api/export/exam.pdf?setKey=' + encodeURIComponent(setKey));
  assert.equal(denied.status, 401);
  const response = await request('/api/export/exam.pdf?setKey=' + encodeURIComponent(setKey), { headers: { 'x-admin-key': ADMIN_KEY } });
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /application\/pdf/);
  assert.match(response.headers['content-disposition'], /filename\*=UTF-8''/);
  assert.ok(response.body.length > 100);
});

test('question analysis requires admin access and exports an Excel workbook', async () => {
  await Promise.all([databaseReady, app.ready]);
  const setKey = readDB().sets[0].key;
  const denied = await request('/api/question-analysis?setKey=' + encodeURIComponent(setKey));
  assert.equal(denied.status, 401);
  const [analysis, workbook] = await Promise.all([
    request('/api/question-analysis?setKey=' + encodeURIComponent(setKey), { headers: { 'x-admin-key': ADMIN_KEY } }),
    request('/api/export/question-analysis.xlsx?setKey=' + encodeURIComponent(setKey), { headers: { 'x-admin-key': ADMIN_KEY } })
  ]);
  assert.equal(analysis.status, 200);
  assert.ok(Array.isArray(JSON.parse(analysis.body).items));
  assert.equal(workbook.status, 200);
  assert.match(workbook.headers['content-type'], /spreadsheetml/);
});

test('admin set creation rejects an incomplete payload without changing data', async () => {
  const response = await request('/api/sets', { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY }, body: {} });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_payload');
});

test('bulk student import skips invalid records without changing the database', async () => {
  const studentId = '../invalid-bulk-student';
  const before = readDB().students.length;
  const response = await request('/api/students/bulk', {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
    body: { text: `${studentId},สมชาย,ใจดี,ปวช.1/1` }
  });
  assert.equal(response.status, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.imported, 0);
  assert.equal(result.updated, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(readDB().students.length, before);
  assert.equal(readDB().students.some(student => student.studentId === studentId), false);
});

test('teacher set management requires a teacher session', async () => {
  const response = await request('/api/teacher/sets');
  assert.equal(response.status, 401);
  assert.equal(JSON.parse(response.body).error, 'unauthorized');
});

test('result deletion requires administrator authentication', async () => {
  const response = await request('/api/results/does-not-matter', { method: 'DELETE' });
  assert.equal(response.status, 401);
  assert.equal(JSON.parse(response.body).error, 'unauthorized');
});

test('late-access verification rejects an unknown exam set', async () => {
  const response = await request('/api/sets/unknown-set/verify-late-code', { method: 'POST', headers: await studentHeaders(), body: { code: 'anything' } });
  assert.equal(response.status, 404);
  assert.equal(JSON.parse(response.body).ok, false);
});

test('submissions reject an unknown exam set', async () => {
  const response = await request('/api/results', { method: 'POST', headers: await studentHeaders(), body: { questionKey: 'unknown-set' } });
  assert.equal(response.status, 404);
  assert.equal(JSON.parse(response.body).error, 'not_found');
});
