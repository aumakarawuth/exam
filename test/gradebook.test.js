const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { buildGradebookWorkbook } = require('../src/results-workbook');
const { gradebookContext, gradebookOptions } = require('../src/routes/exports');

test('gradebook uses the highest midterm and final scores and includes formulas', () => {
  const buffer = buildGradebookWorkbook({
    courseName: 'การเขียนโปรแกรม',
    students: [{ studentId: '10001', firstName: 'สมชาย', lastName: 'ใจดี', classRoom: 'ปวช.1/1' }],
    results: [
      { studentId: '10001', studentName: 'สมชาย ใจดี', classRoom: 'ปวช.1/1', examType: 'กลางภาค', overallScore20: 12 },
      { studentId: '10001', studentName: 'สมชาย ใจดี', classRoom: 'ปวช.1/1', examType: 'กลางภาค', overallScore20: 18, attemptType: 'resit' },
      { studentId: '10001', studentName: 'สมชาย ใจดี', classRoom: 'ปวช.1/1', examType: 'ปลายภาค', overallScore20: 16 }
    ]
  });
  const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: true, cellStyles: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet.I2.v, 18);
  assert.equal(sheet.J2.v, 16);
  assert.match(sheet.K2.f, /COUNT\(F2:J2\)/);
  assert.match(sheet.L2.f, />=80,4/);
  assert.equal(sheet['!autofilter'].ref, 'A1:B2');
  assert.equal(sheet.A1.s.fgColor.rgb, '0F766E');
  assert.equal(sheet.I2.s.fgColor.rgb, 'EFF6FF');
  assert.equal(sheet.K2.s.fgColor.rgb, 'F0FDF4');
});

test('gradebook pairs only the same course, year, semester, and teacher', () => {
  const db = {
    sets: [
      { key: 'mid', courseName: 'การเขียนโปรแกรม', academicYear: '2569', semester: '1', teacherId: 't1' },
      { key: 'final', courseName: 'การเขียนโปรแกรม', academicYear: '2569', semester: '1', teacherId: 't1' },
      { key: 'other-year', courseName: 'การเขียนโปรแกรม', academicYear: '2570', semester: '1', teacherId: 't1' },
      { key: 'other-teacher', courseName: 'การเขียนโปรแกรม', academicYear: '2569', semester: '1', teacherId: 't2' }
    ],
    results: [
      { questionKey: 'mid', examType: 'กลางภาค' },
      { questionKey: 'final', examType: 'ปลายภาค' },
      { questionKey: 'other-year', examType: 'ปลายภาค' },
      { questionKey: 'other-teacher', examType: 'ปลายภาค' }
    ]
  };
  const context = gradebookContext(db, 'mid', 't1');
  assert.equal(context.ready, true);
  assert.deepEqual(context.sets.map(set => set.key), ['mid', 'final']);
  assert.deepEqual(gradebookOptions(db, 't1'), ['mid', 'final', 'other-year']);
  assert.equal(gradebookContext(db, 'other-year', 't1').ready, true);
});
