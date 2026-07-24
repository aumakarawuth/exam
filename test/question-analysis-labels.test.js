const test = require('node:test');
const assert = require('node:assert/strict');
const { difficultyLabel, discriminationLabel } = require('../src/question-analysis');

test('web and workbook analysis labels use the documented ranges', () => {
  assert.equal(difficultyLabel(.19), 'ยากเกินไป');
  assert.equal(difficultyLabel(.2), 'ค่อนข้างยาก');
  assert.equal(difficultyLabel(.4), 'ยากปานกลาง (เหมาะสมดีมาก)');
  assert.equal(difficultyLabel(.6), 'ค่อนข้างง่าย');
  assert.equal(difficultyLabel(.8), 'ค่อนข้างง่าย');
  assert.equal(difficultyLabel(.81), 'ง่ายเกินไป');
  assert.equal(discriminationLabel(.6), 'ดีมาก');
  assert.equal(discriminationLabel(.4), 'ดี');
  assert.equal(discriminationLabel(.2), 'พอใช้');
  assert.equal(discriminationLabel(.1), 'ค่อนข้างต่ำ ควรปรับปรุง');
  assert.equal(discriminationLabel(.09), 'ต่ำมาก ต้องปรับปรุง');
});
