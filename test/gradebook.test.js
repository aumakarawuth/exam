const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { buildGradebookWorkbook } = require('../src/results-workbook');
const { gradebookContext, gradebookOptions } = require('../src/routes/exports');

test('gradebook uses the highest midterm and final scores and includes formulas', async () => {
  const buffer = await buildGradebookWorkbook({
    courseName: 'การเขียนโปรแกรม',
    students: [{ studentId: '10001', firstName: 'สมชาย', lastName: 'ใจดี', classRoom: 'ปวช.1/1' }],
    results: [
      { studentId: '10001', studentName: 'สมชาย ใจดี', classRoom: 'ปวช.1/1', examType: 'กลางภาค', overallScore20: 12 },
      { studentId: '10001', studentName: 'สมชาย ใจดี', classRoom: 'ปวช.1/1', examType: 'กลางภาค', overallScore20: 18, attemptType: 'resit' },
      { studentId: '10001', studentName: 'สมชาย ใจดี', classRoom: 'ปวช.1/1', examType: 'ปลายภาค', overallScore20: 16 }
    ]
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell('I2').value, 18);
  assert.equal(sheet.getCell('J2').value, 16);
  assert.match(sheet.getCell('K2').value.formula, /COUNT\(F2:J2\)/);
  assert.match(sheet.getCell('L2').value.formula, />=80,4/);
  assert.equal(sheet.autoFilter, 'A1:B2');
  assert.equal(sheet.getCell('A1').fill.fgColor.argb, 'FF0F766E');
  assert.equal(sheet.getCell('I2').fill.fgColor.argb, 'FFEFF6FF');
  assert.equal(sheet.getCell('K2').fill.fgColor.argb, 'FFF0FDF4');
});

test('gradebook rounds every score cell to a whole number', async () => {
  const buffer = await buildGradebookWorkbook({
    results: [
      { studentId: '10001', studentName: 'Student One', examType: 'กลางภาค', overallScore20: 17.49 },
      { studentId: '10001', studentName: 'Student One', examType: 'ปลายภาค', overallScore20: 16.5 }
    ]
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell('I2').value, 17);
  assert.equal(sheet.getCell('J2').value, 17);
  for (const address of ['F2', 'G2', 'H2', 'I2', 'J2', 'K2']) assert.equal(sheet.getCell(address).numFmt, '0');
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

test('gradebook normalizes a block course and splits its best score across both exam columns', async () => {
  const blockSet = {
    key: 'block',
    sections: {
      mc: { questions: [{ points: 40 }] },
      matching: { left: [], pointsEach: 0 },
      written: { questions: [] }
    }
  };
  const buffer = await buildGradebookWorkbook({
    courseName: 'วิชาบล็อกคอร์ส',
    sets: [blockSet],
    students: [{ studentId: '10001', firstName: 'สมชาย', lastName: 'ใจดี', classRoom: 'ปวช.1/1' }],
    results: [
      { questionKey: 'block', studentId: '10001', examType: 'กลางภาค', overallScore20: 30, detail: { visibleScoreMax: 40 } },
      { questionKey: 'block', studentId: '10001', examType: 'กลางภาค', overallScore20: 36, attemptType: 'resit', detail: { visibleScoreMax: 40 } }
    ]
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell('I2').value, 18);
  assert.equal(sheet.getCell('J2').value, 18);
});

test('gradebook scales non-40 block course scores to a combined weight of 40', async () => {
  const buffer = await buildGradebookWorkbook({
    sets: [{ key: 'block-60', sections: { mc: { questions: [{ points: 60 }] }, matching: { left: [], pointsEach: 0 }, written: { questions: [] } } }],
    results: [{ questionKey: 'block-60', studentId: '10001', studentName: 'สมชาย ใจดี', examType: 'ปลายภาค', overallScore20: 45, detail: { visibleScoreMax: 60 } }]
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell('I2').value, 15);
  assert.equal(sheet.getCell('J2').value, 15);
});

test('explicit block-course exam type fills both exam columns', async () => {
  const buffer = await buildGradebookWorkbook({
    sets: [{ key:'block-explicit', sections:{ mc:{questions:[{points:20}]}, matching:{left:[],pointsEach:0}, written:{questions:[]} } }],
    results: [{ questionKey:'block-explicit', studentId:'10001', studentName:'ผู้เรียน ทดสอบ', examType:'บล็อคคอร์ส', overallScore20:16, detail:{visibleScoreMax:20} }]
  });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer); const sheet=workbook.worksheets[0];
  assert.equal(sheet.getCell('I2').value,16); assert.equal(sheet.getCell('J2').value,16);
});
