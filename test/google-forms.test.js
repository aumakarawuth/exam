const test = require('node:test');
const assert = require('node:assert/strict');
const { formIdFrom, parseGoogleForm } = require('../src/google-forms');

test('extracts a form id from a Google Forms edit URL', () => {
  assert.equal(formIdFrom('https://docs.google.com/forms/d/abc_123-XYZ/edit'), 'abc_123-XYZ');
  assert.equal(formIdFrom('not a form'), null);
});

test('imports only four-choice Google Forms quiz questions with an answer key', () => {
  const parsed = parseGoogleForm({ info: { title: 'Quiz' }, items: [
    { title: 'CPU คืออะไร', questionItem: { question: { questionId: 'q1', choiceQuestion: { type: 'RADIO', options: [{ value: 'แสดงผล' }, { value: 'ประมวลผล' }, { value: 'พิมพ์' }, { value: 'บันทึก' }] }, grading: { pointValue: 2, correctAnswers: { answers: [{ value: 'ประมวลผล' }] } } } } },
    { title: 'เลือกได้หลายข้อ', questionItem: { question: { choiceQuestion: { type: 'CHECKBOX', options: [] } } } }
  ] });
  assert.equal(parsed.title, 'Quiz');
  assert.deepEqual(parsed.questions[0], { sourceId: 'q1', text: 'CPU คืออะไร', choices: ['แสดงผล', 'ประมวลผล', 'พิมพ์', 'บันทึก'], answer: 1, sourcePoints: 2 });
  assert.equal(parsed.skipped.length, 1);
});
