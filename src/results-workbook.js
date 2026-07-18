const { ExcelJS, addObjectSheet, workbookBuffer } = require('./excel-workbook');

async function buildResultsWorkbook(rows) {
  const data = rows.map(row => ({
    'รหัสนักเรียน': row.studentId, 'ชื่อ-สกุล': row.studentName, 'ห้อง': row.classRoom,
    'ประเภทข้อสอบ': row.examType, 'รายวิชา': row.questionTitle, 'อาจารย์ประจำวิชา': row.subjectTeacherName,
    'ปรนัย': row.sectionScores.mc, 'จับคู่': row.sectionScores.matching, 'อัตนัย': row.sectionScores.written,
    'คะแนนรวม (เต็ม 20)': row.overallScore20, 'ประกาศผลแล้ว': row.published ? 'ใช่' : 'ยังไม่ประกาศ',
    'คลิกขวา (ครั้ง)': row.rightClickAttempts, 'พยายามคัดลอก (ครั้ง)': row.copyAttempts,
    'สลับแท็บ (ครั้ง)': row.tabSwitches, 'โหลดหน้าใหม่ (ครั้ง)': row.reloadCount,
    'วันที่ส่ง': new Date(row.submittedAt).toLocaleString('th-TH')
  }));
  const workbook = new ExcelJS.Workbook();
  const sheet = addObjectSheet(workbook, 'ผลสอบ', data.length ? data : [{ 'หมายเหตุ': 'ยังไม่มีผลสอบ' }]);
  [12, 22, 10, 12, 28, 20, 8, 8, 8, 16, 14, 12, 14, 12, 14, 20].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  return workbookBuffer(workbook);
}

function splitStudentName(studentName) {
  const parts = String(studentName || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

function examSetScoreMax(set) {
  const mc = (set?.sections?.mc?.questions || []).reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const matching = (set?.sections?.matching?.left || []).length * (Number(set?.sections?.matching?.pointsEach) || 0);
  const written = (set?.sections?.written?.questions || []).reduce((sum, question) => sum + (Number(question.maxPoints) || 0), 0);
  return Math.round((mc + matching + written) * 100) / 100;
}

function blockCourseSlotScore(result, set) {
  const setScoreMax = examSetScoreMax(set);
  const visibleScoreMax = Number(result?.detail?.visibleScoreMax);
  const modeScoreMax = setScoreMax > 0 ? setScoreMax : visibleScoreMax;
  const scoreMax = Number.isFinite(visibleScoreMax) && visibleScoreMax > 0 ? visibleScoreMax : setScoreMax;
  if (!Number.isFinite(scoreMax) || scoreMax <= 0 || !Number.isFinite(modeScoreMax) || Math.abs(modeScoreMax - 20) < 0.001) return null;
  const score = Number(result.overallScore20);
  if (!Number.isFinite(score)) return null;
  return Math.round(Math.min(20, Math.max(0, score / scoreMax * 20)) * 100) / 100;
}

async function buildGradebookWorkbook({ results, students = [], sets = [], courseName = 'รายวิชา' }) {
  const studentsById = new Map(students.map(student => [student.studentId, student]));
  const setsByKey = new Map(sets.map(set => [set.key, set]));
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
    const score = Number(result.overallScore20);
    const blockSlotScore = blockCourseSlotScore(result, setsByKey.get(result.questionKey));
    if (blockSlotScore !== null) {
      row.midterm = row.midterm === null ? blockSlotScore : Math.max(row.midterm, blockSlotScore);
      row.final = row.final === null ? blockSlotScore : Math.max(row.final, blockSlotScore);
    } else if (Number.isFinite(score)) {
      const field = result.examType === 'กลางภาค' ? 'midterm' : 'final';
      row[field] = row[field] === null ? score : Math.max(row[field], score);
    }
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
    data[index + 1][10] = { formula: `IF(COUNT(F${excelRow}:J${excelRow})<5,"",SUM(F${excelRow}:J${excelRow}))`, result: 0 };
    data[index + 1][11] = { formula: `IF(K${excelRow}="","",IF(K${excelRow}>=80,4,IF(K${excelRow}>=75,3.5,IF(K${excelRow}>=70,3,IF(K${excelRow}>=65,2.5,IF(K${excelRow}>=60,2,IF(K${excelRow}>=55,1.5,IF(K${excelRow}>=50,1,0))))))))`, result: 0 };
  });

  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.calcProperties.forceFullCalc = true;
  const safeSheetName = String(courseName || 'รวมคะแนน').replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31) || 'รวมคะแนน';
  const sheet = workbook.addWorksheet(safeSheetName);
  data.forEach(row => sheet.addRow(row));
  [12, 14, 18, 20, 3, 12, 12, 12, 12, 12, 12, 10].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.eachRow((row, index) => { row.height = index === 1 ? 26 : 21; });
  sheet.autoFilter = { from: 'A1', to: `B${Math.max(1, data.length)}` };

  const headerColors = ['0F766E', '0F766E', '0F766E', '0F766E', '475569', 'D97706', 'D97706', 'D97706', '2563EB', '2563EB', '15803D', '15803D'];
  for (let column = 0; column < 12; column += 1) {
    const cell = sheet.getCell(1, column + 1);
    cell.style = {
      font: { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${headerColors[column]}` } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } } }
    };
  }
  for (let row = 1; row < data.length; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      const cell = sheet.getCell(row + 1, column + 1);
      let fill = row % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
      if (column === 4) fill = 'E2E8F0';
      else if (column >= 5 && column <= 7) fill = 'FFFBEB';
      else if (column >= 8 && column <= 9) fill = 'EFF6FF';
      else if (column >= 10) fill = 'F0FDF4';
      cell.font = { name: 'Tahoma', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fill}` } };
      cell.alignment = { horizontal: column >= 5 ? 'right' : (column < 2 ? 'center' : 'left'), vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      cell.numFmt = column >= 5 ? '0.##' : (column === 1 ? '@' : 'General');
    }
  }
  return workbookBuffer(workbook);
}

module.exports = { buildResultsWorkbook, buildGradebookWorkbook, examSetScoreMax, blockCourseSlotScore };
