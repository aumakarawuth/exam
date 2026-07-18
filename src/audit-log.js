function resultAuditSnapshot(result) {
  if (!result) return null;
  return {
    id: result.id,
    studentId: result.studentId,
    questionKey: result.questionKey,
    published: !!result.published,
    overallScore: result.overallScore20,
    sectionScores: result.sectionScores || null,
    writtenManualScores: result.detail?.writtenManualScores || null,
    dfdLevelScores: result.detail?.levelScores || null
  };
}

function appendAuditLog(db, { newId, actorType, actorId, action, targetType = 'result', targetId, questionKey, before = null, after = null, reason = '' }) {
  const event = {
    id: newId('audit'),
    eventAt: new Date().toISOString(),
    actorType,
    actorId: actorId || null,
    action,
    targetType,
    targetId: targetId || null,
    questionKey: questionKey || null,
    reason: String(reason || '').trim().slice(0, 500),
    before,
    after
  };
  db.auditLogs ||= [];
  db.auditLogs.push(event);
  return event;
}

module.exports = { appendAuditLog, resultAuditSnapshot };
