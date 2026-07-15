function formIdFrom(value) {
  const text = String(value || '').trim();
  if (/forms\/d\/e\//.test(text)) return null;
  const match = text.match(/forms\/d\/([a-zA-Z0-9_-]+)/) || text.match(/^([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : null;
}

function parseGoogleForm(form) {
  const questions = [];
  const skipped = [];
  for (const item of form?.items || []) {
    const question = item.questionItem?.question;
    const choices = question?.choiceQuestion;
    if (!question || !choices || !['RADIO', 'DROP_DOWN'].includes(choices.type)) {
      if (item.questionItem || item.title) skipped.push({ title: String(item.title || 'ไม่มีชื่อข้อ'), reason: 'รองรับเฉพาะข้อเลือกตอบ 1 คำตอบ' });
      continue;
    }
    const options = (choices.options || []).map(option => String(option.value || '').trim());
    const answerValue = question.grading?.correctAnswers?.answers?.[0]?.value;
    const answer = options.indexOf(answerValue);
    if (options.length !== 4 || options.some(option => !option) || new Set(options).size !== 4) {
      skipped.push({ title: String(item.title || 'ไม่มีชื่อข้อ'), reason: 'ต้องมีตัวเลือกที่ไม่ซ้ำกัน 4 ตัวเลือก' });
      continue;
    }
    if (answer < 0) {
      skipped.push({ title: String(item.title || 'ไม่มีชื่อข้อ'), reason: 'ไม่พบเฉลยของข้อสอบ' });
      continue;
    }
    questions.push({ sourceId: question.questionId || item.itemId || '', text: String(item.title || '').trim(), choices: options, answer, sourcePoints: Number(question.grading?.pointValue) || 0 });
  }
  return { title: String(form?.info?.title || 'Google Forms'), questions, skipped };
}

module.exports = { formIdFrom, parseGoogleForm };
