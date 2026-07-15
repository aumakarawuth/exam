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
  return { 'x-student-token': createStudentSession(student.studentId) };
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

test('exam sets require a verified student session', async () => {
  const response = await request('/api/sets');
  assert.equal(response.status, 401);
});

test('admin routes reject requests without an admin key', async () => {
  const response = await request('/api/admin/sets');
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

test('admin result export returns an Excel workbook', async () => {
  const response = await request('/api/export/results.xlsx', { headers: { 'x-admin-key': ADMIN_KEY } });
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /spreadsheetml/);
  assert.ok(response.body.length > 0);
});

test('admin set creation rejects an incomplete payload without changing data', async () => {
  const response = await request('/api/sets', { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY }, body: {} });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_payload');
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
