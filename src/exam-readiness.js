function finitePositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function checkExamReadiness(set) {
  if (!set) return { ready: false, scoreMax: 0, errors: [{ code: 'missing_exam', message: 'ไม่พบชุดข้อสอบ' }] };
  if (set.delivery === 'object-analysis-design') return { ready: true, scoreMax: 20, errors: [] };
  const errors = [];
  const mc = set.sections?.mc || {};
  const matching = set.sections?.matching || {};
  const written = set.sections?.written || {};
  const allIds = new Set();
  const addId = (id, label) => {
    const value = String(id || '').trim();
    if (!value) errors.push({ code: 'missing_question_id', message: `${label}ไม่มีรหัสข้อ` });
    else if (allIds.has(value)) errors.push({ code: 'duplicate_question_id', message: `รหัสข้อ ${value} ซ้ำกัน` });
    else allIds.add(value);
  };

  for (const [index, question] of (mc.questions || []).entries()) {
    addId(question?.id, `ข้อปรนัยที่ ${index + 1} `);
    if (!Array.isArray(question?.choices) || question.choices.length < 2) errors.push({ code: 'invalid_choices', message: `ข้อปรนัยที่ ${index + 1} ต้องมีอย่างน้อย 2 ตัวเลือก` });
    if (!Number.isInteger(question?.answer) || question.answer < 0 || question.answer >= (question.choices || []).length) errors.push({ code: 'invalid_answer', message: `ข้อปรนัยที่ ${index + 1} ยังไม่มีเฉลยที่ถูกต้อง` });
    if (!finitePositive(question?.points)) errors.push({ code: 'invalid_points', message: `ข้อปรนัยที่ ${index + 1} ต้องมีคะแนนมากกว่า 0` });
  }

  const rightIds = new Set((matching.right || []).map(item => String(item?.id || '').trim()).filter(Boolean));
  for (const [index, item] of (matching.left || []).entries()) {
    addId(item?.id, `ข้อจับคู่ที่ ${index + 1} `);
    const answer = matching.correctMap?.[item?.id];
    if (!answer || !rightIds.has(String(answer))) errors.push({ code: 'invalid_matching_answer', message: `ข้อจับคู่ที่ ${index + 1} ยังไม่มีคู่คำตอบที่ถูกต้อง` });
  }
  if ((matching.left || []).length && !finitePositive(matching.pointsEach)) errors.push({ code: 'invalid_matching_points', message: 'คะแนนต่อข้อของส่วนจับคู่ต้องมากกว่า 0' });

  for (const [index, question] of (written.questions || []).entries()) {
    addId(question?.id, `ข้ออัตนัยที่ ${index + 1} `);
    if (!finitePositive(question?.maxPoints)) errors.push({ code: 'invalid_written_points', message: `ข้ออัตนัยที่ ${index + 1} ต้องมีคะแนนเต็มมากกว่า 0` });
    if (question?.answerType === 'code') {
      if (!String(question.answerCode || '').trim()) errors.push({ code: 'missing_code_answer', message: `ข้ออัตนัยที่ ${index + 1} ยังไม่มีโค้ดคำตอบ` });
    } else if (!Array.isArray(question?.keywords) || !question.keywords.some(keyword => String(keyword).trim())) {
      errors.push({ code: 'missing_keywords', message: `ข้ออัตนัยที่ ${index + 1} ยังไม่มีคำสำคัญสำหรับตรวจคะแนน` });
    }
  }

  const scoreMax = (mc.questions || []).reduce((sum, item) => sum + Number(item?.points || 0), 0)
    + (matching.left || []).length * Number(matching.pointsEach || 0)
    + (written.questions || []).reduce((sum, item) => sum + Number(item?.maxPoints || 0), 0);
  if (!allIds.size) errors.push({ code: 'empty_exam', message: 'ชุดข้อสอบต้องมีคำถามอย่างน้อย 1 ข้อ' });
  if (!finitePositive(scoreMax) || scoreMax > 100) errors.push({ code: 'invalid_total_score', message: 'คะแนนเต็มรวมต้องมากกว่า 0 และไม่เกิน 100 คะแนน' });

  const schedules = Array.isArray(set.examSchedules) && set.examSchedules.length ? set.examSchedules : [{ availableFrom: set.availableFrom, availableUntil: set.availableUntil }];
  schedules.forEach((schedule, index) => {
    if (!schedule?.availableFrom && !schedule?.availableUntil) return;
    const from = Date.parse(schedule.availableFrom), until = Date.parse(schedule.availableUntil);
    if (!Number.isFinite(from) || !Number.isFinite(until) || from >= until) errors.push({ code: 'invalid_schedule', message: `ช่วงเวลาสอบลำดับที่ ${index + 1} ไม่ถูกต้อง` });
  });
  return { ready: errors.length === 0, scoreMax, errors };
}

function readinessSummary(sets) {
  let ready = 0, blocked = 0;
  for (const set of sets.filter(item => !item.archived)) checkExamReadiness(set).ready ? ready++ : blocked++;
  return { ready, blocked };
}

module.exports = { checkExamReadiness, readinessSummary };
