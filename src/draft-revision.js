function nextDraftRevision(current, requestedRevision) {
  const currentRevision = Number(current?.revision) || 0;
  const expectedRevision = Number(requestedRevision) || 0;
  if (expectedRevision !== currentRevision) {
    const error = new Error('draft_conflict');
    error.code = 'DRAFT_CONFLICT';
    error.currentRevision = currentRevision;
    throw error;
  }
  return currentRevision + 1;
}

module.exports = { nextDraftRevision };
