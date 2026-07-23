const test = require('node:test');
const assert = require('node:assert/strict');
const { analysisStatus, buildQuestionAnalysisDocx, buildSummary } = require('../src/question-analysis-docx');

test('Word question analysis applies the documented item-quality thresholds', async () => {
  const accepted = { number: 1, choices: ['ก', 'ข', 'ค', 'ง'], correctCount: 7, incorrectCount: 3, difficulty: .7, discrimination: .3 };
  const rejected = { number: 2, choices: ['ก', 'ข', 'ค', 'ง'], correctCount: 9, incorrectCount: 1, difficulty: .9, discrimination: .1 };
  assert.equal(analysisStatus(accepted).accepted, true);
  assert.equal(analysisStatus(rejected).accepted, false);
  assert.deepEqual(buildSummary({ items: [accepted, rejected], questionCount: 2 }), { standardCount: 1, rejectedCount: 1, percent: 50, rejectedPercent: 50 });
  const buffer = await buildQuestionAnalysisDocx({ title: 'วิชาทดสอบ', courseName: 'วิชาทดสอบ', assignedClasses: ['CIT.1/1'], programs: ['เทคโนโลยีสารสนเทศ'], respondents: 10, questionCount: 2, reliability: .75, items: [accepted, rejected] });
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  assert.ok(buffer.length > 1000);
});
