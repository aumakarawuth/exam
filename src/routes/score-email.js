function registerScoreEmailRoutes(app, { requireAdmin, scoreEmailService, enqueueScoreEmail }) {
  app.get('/api/admin/score-emails/status', requireAdmin, (req, res) => res.json(scoreEmailService.status()));
  app.post('/api/admin/score-emails/:teacherId/send', requireAdmin, (req, res) => {
    const status = scoreEmailService.status();
    if (!status.configured) return res.status(409).json({ error: 'email_not_configured', message: 'กรุณาตั้งค่า RESEND_API_KEY และ SCORE_REPORT_FROM_EMAIL ก่อน' });
    const recipient = status.recipients.find(item => item.teacherId === req.params.teacherId);
    if (!recipient) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรายงานคะแนนของอาจารย์นี้' });
    if (!recipient.email) return res.status(409).json({ error: 'missing_email', message: 'กรุณาเพิ่มอีเมลให้อาจารย์ก่อนส่งรายงาน' });
    const queued = enqueueScoreEmail(recipient.teacherId);
    res.status(queued.accepted ? 202 : 409).json(queued);
  });
}
module.exports = { registerScoreEmailRoutes };
