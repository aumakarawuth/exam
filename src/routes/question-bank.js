function sanitizeQuestion(question, newId, ownerId) {
  const text = String(question?.text || '').trim();
  const choices = Array.isArray(question?.choices) ? question.choices.map(choice => String(choice || '').trim()) : [];
  const answer = Number(question?.answer);
  if (!text || choices.length !== 4 || choices.some(choice => !choice) || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
  return { id: newId('bankq'), ownerId, courseName: String(question.courseName || '').trim(), tags: Array.isArray(question.tags) ? question.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 8) : [], text, choices, answer, createdAt: new Date().toISOString() };
}

function registerQuestionBankRoutes(app, { readDB, writeDB, newId, requireAdmin, requireTeacher }) {
  const list = owner => (req, res) => res.json(readDB().questionBank.filter(question => owner === null || question.ownerId === owner || question.ownerId === null));
  const save = owner => async (req, res) => {
    const source = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const db = readDB(); let added = 0;
    source.forEach(question => { const clean = sanitizeQuestion(question, newId, owner); if (clean && !db.questionBank.some(item => item.ownerId === owner && item.text === clean.text)) { db.questionBank.push(clean); added += 1; } });
    await writeDB(db); res.json({ added });
  };
  app.get('/api/question-bank', requireAdmin, list(null));
  app.post('/api/question-bank', requireAdmin, save(null));
  app.get('/api/teacher/question-bank', requireTeacher, (req, res) => list(req.teacherId)(req, res));
  app.post('/api/teacher/question-bank', requireTeacher, (req, res) => save(req.teacherId)(req, res));
}

module.exports = { registerQuestionBankRoutes };
