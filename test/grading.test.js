const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeMC, gradeMatching, gradeWritten, sanitizeSetForStudent, isBeforeStart, isPastDeadline, hasExamAccess } = require('../src/grading');

test('multiple-choice grading awards only correct answers', () => {
  const section = { questions: [{ id: 'a', answer: 1, points: 2 }, { id: 'b', answer: 0, points: 3 }] };
  assert.equal(gradeMC(section, { a: 1, b: 2 }), 2);
});

test('matching and written grading calculate partial scores', () => {
  const matching = { left: [{ id: 'a' }, { id: 'b' }], correctMap: { a: '1', b: '2' }, pointsEach: 2 };
  const written = { questions: [{ id: 'w', keywords: ['cpu', 'ram'], maxPoints: 4 }] };
  assert.equal(gradeMatching(matching, { a: '1', b: 'wrong' }), 2);
  assert.deepEqual(gradeWritten(written, { w: 'CPU' }), { total: 2, perQuestion: { w: 2 } });
});

test('student exam data includes question resources but not answer keys', () => {
  const set = { key: 'set-1', title: 'Test', sections: {
    mc: { title: 'MC', desc: '', questions: [{ id: 'm1', text: 'Question', choices: ['a', 'b', 'c', 'd'], answer: 2, points: 1, resources: { code: 'int main(){}', attachments: [{ url: 'https://example.com/image.png', type: 'image/png' }] } }] },
    matching: { title: 'Match', desc: '', left: [], right: [], pointsEach: 0, correctMap: {} },
    written: { title: 'Written', desc: '', questions: [{ id: 'w1', text: 'Explain', keywords: ['answer'], maxPoints: 2, resources: { table: 'A,B\\n1,2' } }] }
  } };
  const result = sanitizeSetForStudent(set);
  assert.equal(result.sections.mc.questions[0].answer, undefined);
  assert.equal(result.sections.mc.questions[0].resources.code, 'int main(){}');
  assert.equal(result.sections.written.questions[0].keywords, undefined);
  assert.equal(result.sections.written.questions[0].resources.table, 'A,B\\n1,2');
});

test('quick-open bypasses the time window but preserves classroom access', () => {
  const set = {
    quickOpen: true,
    examSchedules: [{ classes: ['CIT.2/5'], availableFrom: '2099-01-01T00:00:00.000Z', availableUntil: '2020-01-01T00:00:00.000Z' }]
  };
  assert.equal(isBeforeStart(set, 'CIT.2/5'), false);
  assert.equal(isPastDeadline(set, 'CIT.2/5'), false);
  assert.equal(hasExamAccess(set, 'CIT.2/5'), true);
  assert.equal(hasExamAccess(set, 'CIT.2/6'), false);
});
