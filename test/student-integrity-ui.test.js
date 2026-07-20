const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('standard exam resets answers on switch 3 and submits on switch 5', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/assets/student-main.js'), 'utf8');
  assert.match(source, /state\.tabSwitches===3\)resetAllExamAnswers\(\)/);
  assert.match(source, /state\.tabSwitches>=5/);
  assert.match(source, /hasSuspiciousSplitScreen/);
});

test('DFD exam submits on the fifth tab switch', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/assets/object-analysis-design-main.js'), 'utf8');
  assert.match(source, /app\.tabSwitches>=5/);
});
