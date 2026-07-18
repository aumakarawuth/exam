const XLSX = require('xlsx');

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

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [12, 14, 18, 20, 3, 12, 12, 12, 12, 12, 12, 10].map(wch => ({ wch }));
  sheet['!autofilter'] = { ref: `A1:L${Math.max(1, data.length)}` };
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { CalcPr: { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true } };
  const safeSheetName = String(courseName || 'รวมคะแนน').replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31) || 'รวมคะแนน';
  XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { buildResultsWorkbook, buildGradebookWorkbook };
