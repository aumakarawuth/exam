const assert = require('node:assert/strict');
const test = require('node:test');
const { gradeWritten, normalizeCodeAnswer, sanitizeSetForStudent } = require('../src/grading');

const codeQuestion = { id: 'code1', answerType: 'code', language: 'c', answerCode: 'printf("asd");', maxPoints: 5 };

test('code-fix answers ignore whitespace but require the teacher answer', () => {
  assert.equal(normalizeCodeAnswer('printf( "asd" );\n'), 'printf("asd");');
  assert.deepEqual(gradeWritten({ questions: [codeQuestion] }, { code1: 'printf( "asd" );' }), { total: 5, perQuestion: { code1: 5 } });
  assert.deepEqual(gradeWritten({ questions: [codeQuestion] }, { code1: 'print("asd");' }), { total: 0, perQuestion: { code1: 0 } });
});

test('student exam data does not expose a code answer key', () => {
  const restricted = { ...codeQuestion, id: 'code2', eligibleClassRooms: ['CA.1/2'] };
  const set = { key: 'set1', title: 'Code', courseName: 'Code', sections: { mc: { title: '', desc: '', questions: [] }, matching: { title: '', desc: '', left: [], right: [], pointsEach: 0 }, written: { title: '', desc: '', questions: [codeQuestion, restricted] } } };
  const sanitized = sanitizeSetForStudent(set, 'CA.1/1');
  assert.equal(sanitized.sections.written.questions[0].answerCode, undefined);
  assert.equal(sanitized.sections.written.questions[0].answerType, 'code');
  assert.equal(sanitized.sections.written.questions.length, 1);
});
