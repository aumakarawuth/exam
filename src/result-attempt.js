function resultAttemptKey(studentId, questionKey, resitAccessId) {
  const student = String(studentId || '').trim();
  const question = String(questionKey || '').trim();
  if (!student || !question) return null;
  return `${student}::${question}::${resitAccessId ? `resit:${String(resitAccessId).trim()}` : 'normal'}`;
}

module.exports = { resultAttemptKey };
