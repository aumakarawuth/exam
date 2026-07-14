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

function gradeWritten(section, answers) {
  answers = answers || {};
  let total = 0;
  const perQuestion = {};
  (section.questions || []).forEach(question => {
    const points = keywordScore(answers[question.id] || '', question.keywords, question.maxPoints);
    perQuestion[question.id] = points;
    total += points;
  });
  return { total: round2(total), perQuestion };
}

function isPastDeadline(set) {
  return !!(set.availableUntil && Date.now() > new Date(set.availableUntil).getTime());
}

function sanitizeSetForStudent(set) {
  return {
    key: set.key, title: set.title, courseName: set.courseName || set.title, tagline: set.tagline, desc: set.desc,
    examType: set.examType || '', assignedClasses: set.assignedClasses || [],
    subjectTeacherName: set.subjectTeacherName || '', shuffleQuestions: !!set.shuffleQuestions,
    shuffleChoices: !!set.shuffleChoices, availableUntil: set.availableUntil || null,
    lateAccessRequired: isPastDeadline(set),
    sections: {
      mc: { title: set.sections.mc.title, desc: set.sections.mc.desc, questions: set.sections.mc.questions.map(q => ({ id: q.id, text: q.text, choices: q.choices, points: q.points })) },
      matching: { title: set.sections.matching.title, desc: set.sections.matching.desc, left: set.sections.matching.left, right: set.sections.matching.right, pointsEach: set.sections.matching.pointsEach },
      written: { title: set.sections.written.title, desc: set.sections.written.desc, questions: set.sections.written.questions.map(q => ({ id: q.id, text: q.text, maxPoints: q.maxPoints })) }
    }
  };
}

module.exports = { round2, gradeMC, gradeMatching, gradeWritten, isPastDeadline, sanitizeSetForStudent };
