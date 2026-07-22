function courseKey(set) {
  return [set.courseName || set.title || '', set.academicYear || '', set.semester || '', set.teacherId || ''].map(value => String(value).trim()).join('\u0000');
}

function createScoreEmailService({ apiKey = '', fromEmail = '', readDB, buildWorkbook, fetchImpl = fetch, now = () => new Date() } = {}) {
  const configured = Boolean(apiKey && fromEmail);
  const lastRuns = new Map();

  function plan() {
    const db = readDB();
    return db.teachers.map(teacher => {
      const grouped = new Map();
      for (const set of db.sets.filter(item => item.teacherId === teacher.id && !item.deletedAt)) {
        const key = courseKey(set);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(set);
      }
      const courses = [...grouped.values()].map(sets => {
        const keys = new Set(sets.map(set => set.key));
        return {
          courseName: sets[0].courseName || sets[0].title || 'รายวิชา', sets, students: db.students,
          results: db.results.filter(result => keys.has(result.questionKey))
        };
      }).filter(course => course.results.length);
      return { teacher, courses };
    }).filter(item => item.courses.length);
  }

  async function sendTeacher(teacherId) {
    if (!configured) throw new Error('Score email is not configured');
    const recipient = plan().find(item => item.teacher.id === teacherId);
    if (!recipient) throw new Error('Teacher score report not found');
    if (!recipient.teacher.email) throw new Error('Teacher email is missing');
    const { teacher, courses } = recipient;
    const attachment = await buildWorkbook(courses);
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [teacher.email],
        subject: `รายงานคะแนน ${now().toLocaleDateString('th-TH')}`,
        html: `<p>เรียน ${teacher.firstName || ''} ${teacher.lastName || ''}</p><p>แนบไฟล์รายงานคะแนน แยกชีตตามรายวิชาที่รับผิดชอบ จำนวน ${courses.length} รายวิชา</p>`,
        attachments: [{ filename: `รายงานคะแนน-${now().toISOString().slice(0, 10)}.xlsx`, content: attachment.toString('base64') }]
      })
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
    const result = { sentAt: now().toISOString(), teacherId, email: teacher.email, courseSheets: courses.length };
    lastRuns.set(teacherId, result);
    return result;
  }

  function status() {
    const recipients = plan();
    return {
      configured,
      eligibleTeachers: recipients.filter(item => item.teacher.email).length,
      missingEmailTeachers: recipients.filter(item => !item.teacher.email).length,
      courseSheets: recipients.reduce((sum, item) => sum + item.courses.length, 0),
      recipients: recipients.map(({ teacher, courses }) => ({
        teacherId: teacher.id,
        teacherName: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
        email: teacher.email || '',
        courses: courses.map(course => course.courseName),
        lastRun: lastRuns.get(teacher.id) || null
      }))
    };
  }
  return { sendTeacher, status };
}

module.exports = { createScoreEmailService, courseKey };
