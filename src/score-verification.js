const { gradeMC, gradeMatching, gradeWritten, filterWrittenQuestionsForClass, round2 } = require('./grading');
const { gradeDfdLevel } = require('./dfd-grader');
const crypto = require('crypto');

const GRADING_VERSION = 'grading-v1';
const sameScore = (left, right) => Math.abs(Number(left || 0) - Number(right || 0)) < 0.005;
function gradingFingerprint(snapshot) {
  const source = { ...snapshot };
  delete source.fingerprint;
  return crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex');
}

function buildGradingSnapshot(set, classRoom) {
  const mc = set.sections?.mc || {};
  const matching = set.sections?.matching || {};
  const writtenQuestions = filterWrittenQuestionsForClass(set.sections?.written, classRoom);
  const snapshot = {
    version: GRADING_VERSION,
    mc: { questions: (mc.questions || []).map(question => ({ id: question.id, answer: question.answer, points: Number(question.points || 0) })) },
    matching: { left: (matching.left || []).map(item => ({ id: item.id })), correctMap: { ...(matching.correctMap || {}) }, pointsEach: Number(matching.pointsEach || 0) },
    written: { questions: writtenQuestions.map(question => ({ id: question.id, answerType: question.answerType || 'keywords', keywords: [...(question.keywords || [])], answerCode: question.answerCode || '', maxPoints: Number(question.maxPoints || 0) })) }
  };
  snapshot.fingerprint = gradingFingerprint(snapshot);
  return snapshot;
}

function setFromSnapshot(snapshot) {
  return { sections: { mc: snapshot.mc || {}, matching: snapshot.matching || {}, written: snapshot.written || {} } };
}

function verifyDfd(result) {
  const levels = result.detail?.levels;
  if (!Array.isArray(levels) || levels.length !== 3) return { status: 'unverifiable', reason: 'missing_dfd_detail', gradingVersion: GRADING_VERSION };
  const scores = result.scoreAdjustedAt
    ? levels.map(level => Number(result.detail.levelScores?.[Number(level.level)] ?? level.score ?? 0))
    : levels.map(level => gradeDfdLevel(Number(level.level), level.shapes, level.connections).total);
  const expected = { mc: scores[0], matching: scores[1], written: scores[2], overall: round2(scores.reduce((sum, score) => sum + score, 0) / 300 * 20) };
  const actual = { ...result.sectionScores, overall: result.overallScore20 };
  const matches = sameScore(expected.mc, actual.mc) && sameScore(expected.matching, actual.matching) && sameScore(expected.written, actual.written) && sameScore(expected.overall, actual.overall);
  return { status: matches ? 'verified' : 'mismatch', gradingVersion: GRADING_VERSION, expected, actual };
}

function verifyResultScore(result, set) {
  if (!result || !set) return { status: 'unverifiable', reason: 'missing_result_or_exam', gradingVersion: GRADING_VERSION };
  if (result.detail?.type === 'dfd') return verifyDfd(result);
  const answers = result.detail?.answers;
  if (!answers) return { status: 'unverifiable', reason: 'missing_answers', gradingVersion: GRADING_VERSION };
  if (result.detail?.gradingSnapshot && gradingFingerprint(result.detail.gradingSnapshot) !== result.detail.gradingSnapshot.fingerprint) return { status: 'mismatch', reason: 'grading_snapshot_corrupt', gradingVersion: result.detail.gradingSnapshot.version || GRADING_VERSION };
  const gradingSet = result.detail?.gradingSnapshot ? setFromSnapshot(result.detail.gradingSnapshot) : set;
  const mc = gradeMC(gradingSet.sections?.mc || {}, answers.mc);
  const matching = gradeMatching(gradingSet.sections?.matching || {}, answers.matching);
  const manualScores = result.detail?.writtenManualScores;
  const written = manualScores
    ? round2(Object.values(manualScores).reduce((sum, score) => sum + Number(score || 0), 0))
    : gradeWritten({ ...(gradingSet.sections?.written || {}), questions: filterWrittenQuestionsForClass(gradingSet.sections?.written, result.classRoom) }, answers.written).total;
  const expected = { mc, matching, written, overall: round2(mc + matching + written) };
  const actual = { ...result.sectionScores, overall: result.overallScore20 };
  const matches = sameScore(expected.mc, actual.mc) && sameScore(expected.matching, actual.matching) && sameScore(expected.written, actual.written) && sameScore(expected.overall, actual.overall);
  return { status: matches ? 'verified' : 'mismatch', gradingVersion: result.detail?.gradingSnapshot?.version || GRADING_VERSION, gradingFingerprint: result.detail?.gradingSnapshot?.fingerprint || null, expected, actual };
}

function verificationSummary(db) {
  const summary = { verified: 0, mismatch: 0, unverifiable: 0 };
  for (const result of db.results) {
    const verification = verifyResultScore(result, db.sets.find(set => set.key === result.questionKey));
    summary[verification.status] += 1;
  }
  return summary;
}

function verificationReport(db, { limit = 100 } = {}) {
  const issues = [];
  for (const result of db.results) {
    const set = db.sets.find(item => item.key === result.questionKey);
    const verification = verifyResultScore(result, set);
    if (verification.status === 'verified') continue;
    const student = db.students.find(item => item.studentId === result.studentId);
    const differences = [];
    for (const section of ['mc', 'matching', 'written', 'overall']) {
      const expected = verification.expected?.[section];
      const actual = verification.actual?.[section];
      if (expected !== undefined && actual !== undefined && !sameScore(expected, actual)) differences.push({ section, expected: Number(expected), actual: Number(actual), delta: round2(Number(actual) - Number(expected)) });
    }
    issues.push({
      resultId: result.id, studentId: result.studentId, studentName: [student?.firstName || result.firstName, student?.lastName || result.lastName].filter(Boolean).join(' '),
      classRoom: student?.classRoom || result.classRoom || '', questionKey: result.questionKey, examTitle: set?.title || result.examTitle || '',
      status: verification.status, reason: verification.reason || (differences.length ? 'score_components_mismatch' : 'score_mismatch'),
      gradingVersion: verification.gradingVersion, differences, submittedAt: result.submittedAt || null, published: Boolean(result.published)
    });
    if (issues.length >= limit) break;
  }
  return issues;
}

module.exports = { GRADING_VERSION, buildGradingSnapshot, verifyResultScore, verificationSummary, verificationReport };
