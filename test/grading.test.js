const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeMC, gradeMatching, gradeWritten } = require('../src/grading');

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
