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

test('gradebook normalizes a block course and splits its best score across both exam columns', () => {
  const blockSet = {
    key: 'block',
    sections: {
      mc: { questions: [{ points: 40 }] },
      matching: { left: [], pointsEach: 0 },
      written: { questions: [] }
    }
  };
  const buffer = buildGradebookWorkbook({
    courseName: 'วิชาบล็อกคอร์ส',
    sets: [blockSet],
    students: [{ studentId: '10001', firstName: 'สมชาย', lastName: 'ใจดี', classRoom: 'ปวช.1/1' }],
    results: [
      { questionKey: 'block', studentId: '10001', examType: 'กลางภาค', overallScore20: 30, detail: { visibleScoreMax: 40 } },
      { questionKey: 'block', studentId: '10001', examType: 'กลางภาค', overallScore20: 36, attemptType: 'resit', detail: { visibleScoreMax: 40 } }
    ]
  });
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet.I2.v, 18);
  assert.equal(sheet.J2.v, 18);
});

test('gradebook scales non-40 block course scores to a combined weight of 40', () => {
  const buffer = buildGradebookWorkbook({
    sets: [{ key: 'block-60', sections: { mc: { questions: [{ points: 60 }] }, matching: { left: [], pointsEach: 0 }, written: { questions: [] } } }],
    results: [{ questionKey: 'block-60', studentId: '10001', studentName: 'สมชาย ใจดี', examType: 'ปลายภาค', overallScore20: 45, detail: { visibleScoreMax: 60 } }]
  });
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet.I2.v, 15);
  assert.equal(sheet.J2.v, 15);
});
