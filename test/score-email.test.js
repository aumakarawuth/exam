const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { createScoreEmailService } = require('../src/score-email');
const { buildMultiCourseGradebookWorkbook } = require('../src/results-workbook');

function database() {
  return {
    teachers: [{ id: 't1', firstName: 'สมชาย', lastName: 'ใจดี', email: 'teacher@example.com' }],
    students: [{ studentId: '1', firstName: 'ผู้', lastName: 'เรียน', classRoom: '1/1' }],
    sets: [
      { key: 'a', teacherId: 't1', courseName: 'วิชา ก', academicYear: '2569', semester: '1' },
      { key: 'b', teacherId: 't1', courseName: 'วิชา ข', academicYear: '2569', semester: '1' }
    ],
    results: [
      { id: 'r1', questionKey: 'a', studentId: '1', examType: 'กลางภาค', overallScore20: 15.5 },
      { id: 'r2', questionKey: 'b', studentId: '1', examType: 'ปลายภาค', overallScore20: 18.2 }
    ]
  };
}

test('multi-course report creates one rounded score sheet per course', async () => {
  const db = database();
  const buffer = await buildMultiCourseGradebookWorkbook([
    { courseName: 'วิชา ก', sets: [db.sets[0]], results: [db.results[0]], students: db.students },
    { courseName: 'วิชา ข', sets: [db.sets[1]], results: [db.results[1]], students: db.students }
  ]);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['วิชา ก', 'วิชา ข']);
  assert.equal(workbook.worksheets[0].getCell('I2').value, 16);
  assert.equal(workbook.worksheets[1].getCell('J2').value, 18);
});

test('score email sends one attachment to each eligible teacher', async () => {
  const calls = [];
  const service = createScoreEmailService({
    apiKey: 'test-key', fromEmail: 'scores@example.com', readDB: database,
    buildWorkbook: async courses => { assert.equal(courses.length, 2); return Buffer.from('xlsx'); },
    fetchImpl: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return { ok: true, status: 200 }; },
    now: () => new Date('2026-07-23T00:00:00.000Z')
  });
  const status = service.status();
  assert.deepEqual(status.recipients[0].courses, ['วิชา ก', 'วิชา ข']);
  const result = await service.sendTeacher('t1');
  assert.equal(result.courseSheets, 2);
  assert.equal(calls[0].body.to[0], 'teacher@example.com');
  assert.equal(calls[0].body.attachments[0].content, Buffer.from('xlsx').toString('base64'));
});
