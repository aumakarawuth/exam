const XLSX = require('xlsx');
const StyledXLSX = require('xlsx-js-style');

function buildResultsWorkbook(rows) {
  const data = rows.map(row => ({
    'รหัสนักเรียน': row.studentId, 'ชื่อ-สกุล': row.studentName, 'ห้อง': row.classRoom,
    'ประเภทข้อสอบ': row.examType, 'รายวิชา': row.questionTitle, 'อาจารย์ประจำวิชา': row.subjectTeacherName,
    'ปรนัย': row.sectionScores.mc, 'จับคู่': row.sectionScores.matching, 'อัตนัย': row.sectionScores.written,
    'คะแนนรวม (เต็ม 20)': row.overallScore20, 'ประกาศผลแล้ว': row.published ? 'ใช่' : 'ยังไม่ประกาศ',
    'คลิกขวา (ครั้ง)': row.rightClickAttempts, 'พยายามคัดลอก (ครั้ง)': row.copyAttempts,
    'สลับแท็บ (ครั้ง)': row.tabSwitches, 'โหลดหน้าใหม่ (ครั้ง)': row.reloadCount,
    'วันที่ส่ง': new Date(row.submittedAt).toLocaleString('th-TH')
  }));
  const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ 'หมายเหตุ': 'ยังไม่มีผลสอบ' }]);
  sheet['!cols'] = [12, 22, 10, 12, 28, 20, 8, 8, 8, 16, 14, 12, 14, 12, 14, 20].map(wch => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'ผลสอบ');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function splitStudentName(studentName) {
  const parts = String(studentName || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

function buildGradebookWorkbook({ results, students = [], courseName = 'รายวิชา' }) {
  const studentsById = new Map(students.map(student => [student.studentId, student]));
  const rowsByStudent = new Map();
  for (const result of results) {
    if (!['กลางภาค', 'ปลายภาค'].includes(result.examType)) continue;
    const roster = studentsById.get(result.studentId);
    const fallbackName = splitStudentName(result.studentName);
    const row = rowsByStudent.get(result.studentId) || {
      studentId: result.studentId,
      classRoom: roster?.classRoom || result.classRoom || '',
      firstName: roster?.firstName || fallbackName.firstName,
      lastName: roster?.lastName || fallbackName.lastName,
      midterm: null,
      final: null
    };
    const field = result.examType === 'กลางภาค' ? 'midterm' : 'final';
    const score = Number(result.overallScore20);
    if (Number.isFinite(score)) row[field] = row[field] === null ? score : Math.max(row[field], score);
    rowsByStudent.set(result.studentId, row);
  }

  const rows = [...rowsByStudent.values()].sort((a, b) =>
    String(a.classRoom).localeCompare(String(b.classRoom), 'th', { numeric: true }) ||
    String(a.studentId).localeCompare(String(b.studentId), 'th', { numeric: true })
  );
  const data = [['ห้อง', 'รหัส นศ.', 'ชื่อ', 'นามสกุล', '', 'เวลาเรียน', 'จิตพิสัย', 'คะแนนเก็บ', 'กลางภาค', 'ปลายภาค', 'รวม', 'เกรด']];
  rows.forEach((row, index) => {
    const excelRow = index + 2;
    data.push([row.classRoom, row.studentId, row.firstName, row.lastName, '', '', '', '', row.midterm, row.final, null, null]);
    data[index + 1][10] = { t: 'n', v: 0, f: `IF(COUNT(F${excelRow}:J${excelRow})<5,"",SUM(F${excelRow}:J${excelRow}))` };
    data[index + 1][11] = { t: 'n', v: 0, f: `IF(K${excelRow}="","",IF(K${excelRow}>=80,4,IF(K${excelRow}>=75,3.5,IF(K${excelRow}>=70,3,IF(K${excelRow}>=65,2.5,IF(K${excelRow}>=60,2,IF(K${excelRow}>=55,1.5,IF(K${excelRow}>=50,1,0))))))))` };
  });

  const sheet = StyledXLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [12, 14, 18, 20, 3, 12, 12, 12, 12, 12, 12, 10].map(wch => ({ wch }));
  sheet['!rows'] = data.map((_, index) => ({ hpt: index === 0 ? 26 : 21 }));
  sheet['!autofilter'] = { ref: `A1:B${Math.max(1, data.length)}` };

  const borderColor = { rgb: 'CBD5E1' };
  const bodyBorder = { bottom: { style: 'thin', color: borderColor } };
  const headerColors = ['0F766E', '0F766E', '0F766E', '0F766E', '475569', 'D97706', 'D97706', 'D97706', '2563EB', '2563EB', '15803D', '15803D'];
  for (let column = 0; column < 12; column += 1) {
    const address = StyledXLSX.utils.encode_cell({ r: 0, c: column });
    sheet[address].s = {
      font: { name: 'Tahoma', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: headerColors[column] } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'medium', color: { rgb: 'FFFFFF' } } }
    };
  }
  for (let row = 1; row < data.length; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      const address = StyledXLSX.utils.encode_cell({ r: row, c: column });
      const cell = sheet[address] || (sheet[address] = { t: 's', v: '' });
      let fill = row % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
      if (column === 4) fill = 'E2E8F0';
      else if (column >= 5 && column <= 7) fill = 'FFFBEB';
      else if (column >= 8 && column <= 9) fill = 'EFF6FF';
      else if (column >= 10) fill = 'F0FDF4';
      cell.s = {
        font: { name: 'Tahoma', sz: 10, color: { rgb: '1E293B' } },
        fill: { patternType: 'solid', fgColor: { rgb: fill } },
        alignment: { horizontal: column >= 5 ? 'right' : (column < 2 ? 'center' : 'left'), vertical: 'center' },
        border: bodyBorder,
        numFmt: column >= 5 ? '0.##' : (column === 1 ? '@' : 'General')
      };
    }
  }
  const workbook = StyledXLSX.utils.book_new();
  workbook.Workbook = { CalcPr: { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true } };
  const safeSheetName = String(courseName || 'รวมคะแนน').replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31) || 'รวมคะแนน';
  StyledXLSX.utils.book_append_sheet(workbook, sheet, safeSheetName);
  return StyledXLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { buildResultsWorkbook, buildGradebookWorkbook };
