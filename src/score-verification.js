const { gradeMC, gradeMatching, gradeWritten, filterWrittenQuestionsForClass, round2 } = require('./grading');
const { gradeDfdLevel } = require('./dfd-grader');

const GRADING_VERSION = 'grading-v1';
const sameScore = (left, right) => Math.abs(Number(left || 0) - Number(right || 0)) < 0.005;

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
  const mc = gradeMC(set.sections?.mc || {}, answers.mc);
  const matching = gradeMatching(set.sections?.matching || {}, answers.matching);
  const manualScores = result.detail?.writtenManualScores;
  const written = manualScores
    ? round2(Object.values(manualScores).reduce((sum, score) => sum + Number(score || 0), 0))
    : gradeWritten({ ...(set.sections?.written || {}), questions: filterWrittenQuestionsForClass(set.sections?.written, result.classRoom) }, answers.written).total;
  const expected = { mc, matching, written, overall: round2(mc + matching + written) };
  const actual = { ...result.sectionScores, overall: result.overallScore20 };
  const matches = sameScore(expected.mc, actual.mc) && sameScore(expected.matching, actual.matching) && sameScore(expected.written, actual.written) && sameScore(expected.overall, actual.overall);
  return { status: matches ? 'verified' : 'mismatch', gradingVersion: GRADING_VERSION, expected, actual };
}

function verificationSummary(db) {
  const summary = { verified: 0, mismatch: 0, unverifiable: 0 };
  for (const result of db.results) {
    const verification = verifyResultScore(result, db.sets.find(set => set.key === result.questionKey));
    summary[verification.status] += 1;
  }
  return summary;
}

module.exports = { GRADING_VERSION, verifyResultScore, verificationSummary };
