const test = require('node:test');
const assert = require('node:assert/strict');
const { ExcelJS, workbookBuffer, worksheetMatrix } = require('../src/excel-workbook');

test('ExcelJS workbook round-trips imported student rows', async () => {
  const source = new ExcelJS.Workbook();
  const sheet = source.addWorksheet('students');
  sheet.addRow(['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ห้อง']);
  sheet.addRow(['10001', 'สมชาย', 'ใจดี', 'ม.3/1']);
  const buffer = await workbookBuffer(source);

  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  assert.deepEqual(worksheetMatrix(loaded.worksheets[0]), [
    ['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ห้อง'],
    ['10001', 'สมชาย', 'ใจดี', 'ม.3/1']
  ]);
});

test('Excel import rejects worksheets beyond the configured row limit', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('large');
  sheet.addRow(['header']);
  sheet.addRow(['value']);
  assert.throws(() => worksheetMatrix(sheet, 1, 10), /spreadsheet_too_large/);
});
