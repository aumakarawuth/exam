const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGradingSnapshot, verifyResultScore } = require('../src/score-verification');

const set = { sections: { mc: { questions: [{ id: 'm1', answer: 1, points: 5 }] }, matching: { left: [{ id: 'l1' }], correctMap: { l1: 'r1' }, pointsEach: 5 }, written: { questions: [{ id: 'w1', keywords: ['alpha'], maxPoints: 10 }] } } };
const result = { classRoom: '1/1', sectionScores: { mc: 5, matching: 5, written: 10 }, overallScore20: 20, detail: { answers: { mc: { m1: 1 }, matching: { l1: 'r1' }, written: { w1: 'alpha' } } } };

test('score verification independently accepts a matching score breakdown', () => {
  assert.equal(verifyResultScore(result, set).status, 'verified');
});

test('score verification detects a changed or corrupted total', () => {
  const corrupted = structuredClone(result); corrupted.overallScore20 = 19;
  const verification = verifyResultScore(corrupted, set);
  assert.equal(verification.status, 'mismatch');
  assert.equal(verification.expected.overall, 20);
  assert.equal(verification.actual.overall, 19);
});

test('score verification preserves teacher-reviewed written scores', () => {
  const reviewed = structuredClone(result); reviewed.detail.writtenManualScores = { w1: 7 }; reviewed.sectionScores.written = 7; reviewed.overallScore20 = 17;
  assert.equal(verifyResultScore(reviewed, set).status, 'verified');
});

test('grading snapshot keeps an existing result stable after the exam answer key changes', () => {
  const snapshotted = structuredClone(result);
  snapshotted.detail.gradingSnapshot = buildGradingSnapshot(set, snapshotted.classRoom);
  const editedSet = structuredClone(set);
  editedSet.sections.mc.questions[0].answer = 0;
  assert.equal(verifyResultScore(snapshotted, editedSet).status, 'verified');
  assert.match(snapshotted.detail.gradingSnapshot.fingerprint, /^[a-f0-9]{64}$/);
});

test('score verification blocks a grading snapshot that was modified after submission', () => {
  const tampered = structuredClone(result);
  tampered.detail.gradingSnapshot = buildGradingSnapshot(set, tampered.classRoom);
  tampered.detail.gradingSnapshot.mc.questions[0].answer = 0;
  const verification = verifyResultScore(tampered, set);
  assert.equal(verification.status, 'mismatch');
  assert.equal(verification.reason, 'grading_snapshot_corrupt');
});
