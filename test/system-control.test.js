const test = require('node:test');
const assert = require('node:assert/strict');
const { isStudentExamRequest } = require('../src/routes/system-control');

function request(method, path) { return { method, path }; }

test('exam closure covers every student exam entry and write path', () => {
  const paths = [
    request('GET', '/api/exam-types'),
    request('GET', '/api/sets'),
    request('POST', '/api/sets/exam-1/verify-late-code'),
    request('POST', '/api/results'),
    request('PUT', '/api/exam-drafts/exam-1'),
    request('GET', '/api/student/session'),
    request('GET', '/api/students/10001'),
    request('POST', '/api/students/10001/verify-pin'),
    request('GET', '/api/object-analysis/access'),
    request('POST', '/api/object-analysis-results')
  ];
  paths.forEach(item => assert.equal(isStudentExamRequest(item), true, `${item.method} ${item.path}`));
});

test('exam closure does not block staff and administrative paths', () => {
  const paths = [
    request('POST', '/api/sets'),
    request('GET', '/api/students'),
    request('PUT', '/api/sets/exam-1'),
    request('GET', '/api/admin/sets'),
    request('POST', '/api/teacher/login'),
    request('GET', '/api/teacher/sets')
  ];
  paths.forEach(item => assert.equal(isStudentExamRequest(item), false, `${item.method} ${item.path}`));
});
