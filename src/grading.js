function round2(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

function gradeMC(section, answers) {
  answers = answers || {};
  let total = 0;
  (section.questions || []).forEach(question => {
    if (answers[question.id] === question.answer) total += (question.points || 0);
  });
  return round2(total);
}

function gradeMatching(section, answers) {
  answers = answers || {};
  let total = 0;
  (section.left || []).forEach(item => {
    if (answers[item.id] && answers[item.id] === section.correctMap[item.id]) total += (section.pointsEach || 0);
  });
  return round2(total);
}

function keywordScore(text, keywords, maxPoints) {
  if (!text || !text.trim() || !keywords || !keywords.length) return 0;
  const normalizedText = text.toLowerCase();
  const hit = keywords.filter(keyword => normalizedText.includes(String(keyword).toLowerCase())).length;
  return round2((hit / keywords.length) * (maxPoints || 0));
}

// Code-fix questions deliberately do not compile code.  They compare the
// teacher's expected snippet after removing formatting-only whitespace, which
// keeps this fast and safe for short syntax-correction exercises.
function normalizeCodeAnswer(value) {
  return String(value || '').replace(/\s+/g, '');
}

function filterWrittenQuestionsForClass(section, classRoom) {
  // Written code questions apply to every student who can access the exam set.
  // classRoom remains an argument for compatibility with existing callers.
  return section?.questions || [];
}

function gradeWritten(section, answers) {
  answers = answers || {};
  let total = 0;
  const perQuestion = {};
  (section.questions || []).forEach(question => {
    const points = question.answerType === 'code'
      ? (normalizeCodeAnswer(answers[question.id]) === normalizeCodeAnswer(question.answerCode) && normalizeCodeAnswer(question.answerCode) ? Number(question.maxPoints || 0) : 0)
      : keywordScore(answers[question.id] || '', question.keywords, question.maxPoints);
    perQuestion[question.id] = points;
    total += points;
  });
  return { total: round2(total), perQuestion };
}

function getExamSchedule(set, classRoom) {
  const schedules = Array.isArray(set.examSchedules) ? set.examSchedules.filter(item => item && Array.isArray(item.classes)) : [];
  if (schedules.length) return schedules.find(item => (item.classes || []).includes(classRoom)) || schedules.find(item => !(item.classes || []).length) || null;
  return { classes: set.assignedClasses || [], availableFrom: set.availableFrom, availableUntil: set.availableUntil, lateAccessCode: set.lateAccessCode || '' };
}
function isPastDeadline(set, classRoom) {
  const schedule = getExamSchedule(set, classRoom);
  return !!(schedule?.availableUntil && Date.now() > new Date(schedule.availableUntil).getTime());
}
function isBeforeStart(set, classRoom) {
  const schedule = getExamSchedule(set, classRoom);
  return !!(schedule?.availableFrom && Date.now() < new Date(schedule.availableFrom).getTime());
}
function hasExamAccess(set, classRoom) {
  const schedule = getExamSchedule(set, classRoom);
  return !!schedule && (!(schedule.classes || []).length || schedule.classes.includes(classRoom));
}

function sanitizeSetForStudent(set, classRoom) {
  const schedule = getExamSchedule(set, classRoom);
  return {
    key: set.key, title: set.title, courseName: set.courseName || set.title, tagline: set.tagline, desc: set.desc,
    examType: set.examType || '', assignedClasses: set.assignedClasses || [],
    subjectTeacherName: set.subjectTeacherName || '', shuffleQuestions: !!set.shuffleQuestions,
    availableFrom: schedule?.availableFrom || null,
    shuffleChoices: !!set.shuffleChoices, availableUntil: schedule?.availableUntil || null,
    lateAccessRequired: isPastDeadline(set, classRoom),
    sections: {
      mc: { title: set.sections.mc.title, desc: set.sections.mc.desc, questions: set.sections.mc.questions.map(q => ({ id: q.id, text: q.text, choices: q.choices, points: q.points, resources: q.resources || null })) },
      matching: { title: set.sections.matching.title, desc: set.sections.matching.desc, left: set.sections.matching.left, right: set.sections.matching.right, pointsEach: set.sections.matching.pointsEach },
      written: { title: set.sections.written.title, desc: set.sections.written.desc, questions: filterWrittenQuestionsForClass(set.sections.written, classRoom).map(q => {
        const isCode = q.answerType === 'code';
        const resources = isCode ? { code: q.resources?.code || '', language: q.resources?.language || '' } : (q.resources || null);
        return { id: q.id, text: q.text, maxPoints: q.maxPoints, answerType: q.answerType || 'text', language: q.language || 'c', resources };
      }) }
    }
  };
}

module.exports = { round2, gradeMC, gradeMatching, gradeWritten, normalizeCodeAnswer, filterWrittenQuestionsForClass, getExamSchedule, hasExamAccess, isPastDeadline, isBeforeStart, sanitizeSetForStudent };
