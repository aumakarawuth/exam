const test = require('node:test');
const assert = require('node:assert/strict');
const { applyAcademicPeriod, resolveAcademicPeriod } = require('../src/academic-calendar');
const { enrollmentFor, setEnrollment } = require('../src/student-enrollments');

const settings = {
  academicCalendar: [{
    academicYear: '2569',
    terms: [
      { id: '1', label: 'เทอม 1', startsOn: '2026-05-01', endsOn: '2026-09-30' },
      { id: '2', label: 'เทอม 2', startsOn: '2026-11-01', endsOn: '2027-02-28' }
    ]
  }]
};

test('academic calendar resolves an exam date to its semester', () => {
  assert.deepEqual(resolveAcademicPeriod(settings, '2026-09-15T02:00:00.000Z'), { academicYear: '2569', semester: '1', semesterLabel: 'เทอม 1' });
  assert.deepEqual(resolveAcademicPeriod(settings, '2027-02-28T02:00:00.000Z'), { academicYear: '2569', semester: '2', semesterLabel: 'เทอม 2' });
  assert.equal(resolveAcademicPeriod(settings, '2026-10-15T02:00:00.000Z'), null);
});

test('legacy calendar dates saved with Buddhist years still resolve new exam dates', () => {
  const legacySettings = { academicCalendar: [{ academicYear: '2569', terms: [{ id: '1', label: 'เทอม 1', startsOn: '2569-05-01', endsOn: '2569-09-30' }] }] };
  assert.deepEqual(resolveAcademicPeriod(legacySettings, '2026-07-21T05:00:00.000Z'), { academicYear: '2569', semester: '1', semesterLabel: 'เทอม 1' });
});

test('exam uses the earliest room schedule to receive an academic period', () => {
  const set = { examSchedules: [{ availableFrom: '2026-11-15T02:00:00.000Z' }, { availableFrom: '2026-11-16T02:00:00.000Z' }] };
  assert.deepEqual(applyAcademicPeriod(set, settings), { academicYear: '2569', semester: '2', semesterLabel: 'เทอม 2' });
  assert.equal(set.academicYear, '2569');
});

test('student enrollment keeps the previous room when promoted', () => {
  const student = { studentId: '10001', classRoom: 'CC.1/4', examPeriod: 'เช้า', createdAt: '2026-07-17T00:00:00.000Z' };
  assert.equal(enrollmentFor(student, '2569').classRoom, 'CC.1/4');
  setEnrollment(student, { academicYear: '2570', classRoom: 'CC.2/4', examPeriod: 'เช้า' });
  assert.equal(enrollmentFor(student, '2569').classRoom, 'CC.1/4');
  assert.equal(enrollmentFor(student, '2570').classRoom, 'CC.2/4');
});
