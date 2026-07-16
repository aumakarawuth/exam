function activeResitAccess(set, studentId, accessId) {
  const now = Date.now();
  return (set.resitAccesses || []).find(access => access.studentId === studentId && access.status === 'approved' && (!accessId || access.id === accessId) && new Date(access.availableFrom).getTime() <= now && now <= new Date(access.availableUntil).getTime() && !access.usedResultId);
}

function resitScore(rawScore20, scoreMax) {
  return Math.round((Number(rawScore20 || 0) / 20 * Number(scoreMax || 20) + Number.EPSILON) * 100) / 100;
}

module.exports = { activeResitAccess, resitScore };
