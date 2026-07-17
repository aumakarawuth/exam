const test = require('node:test');
const assert = require('node:assert/strict');
const { applyAcademicPeriod, resolveAcademicPeriod } = require('../src/academic-calendar');

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

test('exam uses the earliest room schedule to receive an academic period', () => {
  const set = { examSchedules: [{ availableFrom: '2026-11-15T02:00:00.000Z' }, { availableFrom: '2026-11-16T02:00:00.000Z' }] };
  assert.deepEqual(applyAcademicPeriod(set, settings), { academicYear: '2569', semester: '2', semesterLabel: 'เทอม 2' });
  assert.equal(set.academicYear, '2569');
});
