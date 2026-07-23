const test = require('node:test');
const assert = require('node:assert/strict');
const { validateExamSetPayload, validateTeacherPayload, validateStudentPayload } = require('../src/validation');

const validSet = () => ({ title: 'พื้นฐานคอมพิวเตอร์', educationLevel: 'ปวช.', sections: {} });

test('exam set validation accepts the minimum valid payload', () => {
  assert.deepEqual(validateExamSetPayload(validSet()), []);
});

test('exam set validation rejects missing sections and invalid field types', () => {
  const errors = validateExamSetPayload({
    title: 'ชุดทดสอบ', educationLevel: 'ปวช.', sections: [],
    assignedClasses: 'ปวช.1/1', examSchedules: {}
  });
  assert.equal(errors.length, 3);
  assert.ok(errors.some(error => error.includes('sections')));
  assert.ok(errors.some(error => error.includes('assignedClasses')));
  assert.ok(errors.some(error => error.includes('examSchedules')));
});

test('exam set validation rejects unsafe custom keys', () => {
  const errors = validateExamSetPayload({ ...validSet(), key: '../another-set' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /key/);
});

test('teacher validation enforces safe usernames and password length', () => {
  assert.deepEqual(validateTeacherPayload({ firstName: 'สมชาย', lastName: 'ใจดี', username: 'teacher.one', password: 'password123', department: 'เทคโนโลยีสารสนเทศ' }), []);
  const errors = validateTeacherPayload({ firstName: 'สมชาย', lastName: 'ใจดี', username: '../admin', password: '1234', department: '' });
  assert.equal(errors.length, 3);
});

test('student validation rejects unsafe identifiers and empty names', () => {
  assert.deepEqual(validateStudentPayload({ studentId: '65001', firstName: 'สมหญิง', lastName: 'รักเรียน', classRoom: 'ปวช.1/1' }), []);
  const errors = validateStudentPayload({ studentId: '../65001', firstName: '', lastName: 'รักเรียน', classRoom: '' });
  assert.equal(errors.length, 3);
});
