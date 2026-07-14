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

module.exports = { buildResultsWorkbook };
