const test = require('node:test');
const assert = require('node:assert/strict');
const { checkExamReadiness } = require('../src/exam-readiness');

function validExam() {
  return { sections: { mc: { questions: [{ id: 'm1', choices: ['A', 'B'], answer: 0, points: 5 }] }, matching: { left: [{ id: 'l1' }], right: [{ id: 'r1' }], correctMap: { l1: 'r1' }, pointsEach: 5 }, written: { questions: [{ id: 'w1', keywords: ['หลักการ'], maxPoints: 10 }] } }, availableFrom: '2026-07-18T01:00:00.000Z', availableUntil: '2026-07-18T02:00:00.000Z' };
}

test('exam readiness accepts a complete 20-point exam', () => {
  assert.deepEqual(checkExamReadiness(validExam()), { ready: true, scoreMax: 20, errors: [] });
});

test('exam readiness allows block-course scores above 20', () => {
  const exam = validExam(); exam.sections.mc.questions[0].points = 40;
  assert.equal(checkExamReadiness(exam).ready, true);
  assert.equal(checkExamReadiness(exam).scoreMax, 55);
});

test('exam readiness rejects duplicate ids, missing answers, and invalid schedules', () => {
  const exam = validExam(); exam.sections.written.questions[0].id = 'm1'; exam.sections.mc.questions[0].answer = 9; exam.availableUntil = exam.availableFrom;
  const check = checkExamReadiness(exam);
  assert.equal(check.ready, false);
  assert.ok(check.errors.some(error => error.code === 'duplicate_question_id'));
  assert.ok(check.errors.some(error => error.code === 'invalid_answer'));
  assert.ok(check.errors.some(error => error.code === 'invalid_schedule'));
});
