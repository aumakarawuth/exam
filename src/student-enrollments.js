function defaultAcademicYear() {
  return String(new Date().getFullYear() + 543);
}

function normalizeStudentEnrollments(student, fallbackYear = defaultAcademicYear()) {
  const existing = Array.isArray(student.enrollments) ? student.enrollments : [];
  const unique = new Map();
  existing.forEach(item => {
    const academicYear = String(item?.academicYear || '').trim();
    if (!academicYear || unique.has(academicYear)) return;
    unique.set(academicYear, { academicYear, classRoom: String(item.classRoom || '').trim(), examPeriod: String(item.examPeriod || '').trim(), status: item.status || 'active', createdAt: item.createdAt || student.createdAt || new Date().toISOString() });
  });
  if (!unique.size && student.classRoom) unique.set(String(fallbackYear), { academicYear: String(fallbackYear), classRoom: student.classRoom, examPeriod: student.examPeriod || '', status: 'active', createdAt: student.createdAt || new Date().toISOString() });
  student.enrollments = [...unique.values()].sort((a, b) => a.academicYear.localeCompare(b.academicYear));
  return student.enrollments;
}

function enrollmentFor(student, academicYear) {
  return normalizeStudentEnrollments(student).find(item => item.academicYear === String(academicYear)) || null;
}

function setEnrollment(student, enrollment) {
  const academicYear = String(enrollment.academicYear || '').trim();
  if (!academicYear) throw new Error('academic year is required');
  const enrollments = normalizeStudentEnrollments(student);
  const index = enrollments.findIndex(item => item.academicYear === academicYear);
  const next = { academicYear, classRoom: String(enrollment.classRoom || '').trim(), examPeriod: String(enrollment.examPeriod || '').trim(), status: enrollment.status || 'active', createdAt: enrollment.createdAt || new Date().toISOString() };
  if (index === -1) enrollments.push(next); else enrollments[index] = { ...enrollments[index], ...next };
  enrollments.sort((a, b) => a.academicYear.localeCompare(b.academicYear));
  student.enrollments = enrollments;
  return next;
}

module.exports = { normalizeStudentEnrollments, enrollmentFor, setEnrollment };
