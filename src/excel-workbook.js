const ExcelJS = require('exceljs');

function cellValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.text !== undefined) return value.text;
    if (value.result !== undefined) return value.result;
  }
  return value;
}

function addObjectSheet(workbook, name, rows, headers) {
  const worksheet = workbook.addWorksheet(name);
  const columns = headers || [...new Set(rows.flatMap(row => Object.keys(row)))];
  if (columns.length) worksheet.addRow(columns);
  for (const row of rows) worksheet.addRow(columns.map(column => cellValue(row[column])));
  return worksheet;
}

async function workbookBuffer(workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function worksheetMatrix(worksheet, maxRows = 10000, maxColumns = 100) {
  if (!worksheet) return [];
  if (worksheet.actualRowCount > maxRows || worksheet.actualColumnCount > maxColumns) {
    const error = new Error('spreadsheet_too_large');
    error.code = 'spreadsheet_too_large';
    throw error;
  }
  const matrix = [];
  worksheet.eachRow({ includeEmpty: false }, row => {
    const values = [];
    const end = Math.min(row.cellCount, maxColumns);
    for (let column = 1; column <= end; column += 1) values.push(cellValue(row.getCell(column).value));
    matrix.push(values);
  });
  return matrix;
}

module.exports = { ExcelJS, addObjectSheet, workbookBuffer, worksheetMatrix, cellValue };
