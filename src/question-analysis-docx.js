const fs = require('fs');
const path = require('path');
const {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, PageBreak,
  PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  VerticalAlign, WidthType
} = require('docx');

const FONT = 'TH Sarabun New';
const borders = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const cellBorders = { top: borders, bottom: borders, left: borders, right: borders };
const text = (value, options = {}) => new TextRun({ text: String(value ?? ''), font: FONT, size: options.size || 28, bold: !!options.bold });
const paragraph = (value, options = {}) => new Paragraph({
  alignment: options.alignment || AlignmentType.LEFT,
  spacing: { before: options.before || 0, after: options.after || 0, line: options.line || 300 },
  children: [text(value, options)]
});
const labeled = (label, value) => new Paragraph({ spacing: { after: 40, line: 320 }, children: [text(label, { bold: true }), text(value || '-')] });
const cell = (value, options = {}) => new TableCell({
  borders: cellBorders,
  width: { size: options.width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 70, bottom: 70, left: 80, right: 80 },
  children: [paragraph(value, { alignment: options.alignment || AlignmentType.CENTER, bold: options.bold, size: options.size || 24, line: 260 })]
});

function analysisStatus(item) {
  const difficultyOk = item.difficulty >= .2 && item.difficulty <= .8;
  const discriminationOk = item.discrimination !== null && item.discrimination >= .2;
  const messages = [difficultyOk ? 'ค่าความยากอยู่ในเกณฑ์' : 'ค่าความยากควรปรับปรุง'];
  messages.push(item.discrimination === null ? 'ข้อมูลอำนาจจำแนกไม่พอ' : discriminationOk ? 'อำนาจจำแนกอยู่ในเกณฑ์' : 'อำนาจจำแนกควรปรับปรุง');
  return { accepted: difficultyOk && discriminationOk, message: messages.join(' / ') };
}

function buildSummary(analysis) {
  const statuses = analysis.items.map(analysisStatus);
  const standardCount = statuses.filter(item => item.accepted).length;
  const percent = analysis.questionCount ? Math.round(standardCount / analysis.questionCount * 10000) / 100 : 0;
  return { standardCount, rejectedCount: analysis.questionCount - standardCount, percent, rejectedPercent: Math.round((100 - percent) * 100) / 100 };
}

async function buildQuestionAnalysisDocx(analysis) {
  const summary = buildSummary(analysis);
  const logoPath = path.join(__dirname, '..', 'public', 'assets', 'college-logo.jpg');
  const logo = fs.existsSync(logoPath) ? new ImageRun({ data: fs.readFileSync(logoPath), transformation: { width: 74, height: 74 }, type: 'jpg' }) : null;
  const choiceCounts = [...new Set(analysis.items.map(item => item.choices.length).filter(Boolean))];
  const choicesLabel = choiceCounts.length === 1 ? choiceCounts[0] : choiceCounts.length ? choiceCounts.join(', ') : '-';
  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1500, 7860],
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 1500, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: logo ? [logo] : [] })] }),
      new TableCell({ width: { size: 7860, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [
        paragraph('วิทยาลัยเทคโนโลยีจรัลสนิทวงศ์', { bold: true, size: 36, alignment: AlignmentType.CENTER, line: 340 }),
        paragraph('สรุปผลการวิเคราะห์ข้อสอบ', { bold: true, size: 34, alignment: AlignmentType.CENTER, line: 330 })
      ] })
    ] })]
  });
  const itemRows = analysis.items.map(item => {
    const status = analysisStatus(item);
    return new TableRow({ cantSplit: true, children: [
      cell(item.number, { width: 600 }), cell(item.correctCount, { width: 700 }), cell(item.incorrectCount, { width: 700 }),
      cell(item.difficulty.toFixed(2), { width: 1200 }), cell(item.discrimination === null ? '-' : item.discrimination.toFixed(2), { width: 1400 }),
      cell(status.message, { width: 4760, alignment: AlignmentType.LEFT })
    ] });
  });
  const analysisTable = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [600, 700, 700, 1200, 1400, 4760],
    rows: [new TableRow({ tableHeader: true, children: [
      cell('ข้อที่', { width: 600, bold: true }), cell('ถูก', { width: 700, bold: true }), cell('ผิด', { width: 700, bold: true }),
      cell('ค่าความยาก (P)', { width: 1200, bold: true }), cell('อำนาจจำแนก (D)', { width: 1400, bold: true }), cell('ผลการวิเคราะห์', { width: 4760, bold: true })
    ] }), ...itemRows]
  });
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 28 }, paragraph: { spacing: { line: 300 } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 900, bottom: 850, left: 900 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [text('หน้า ', { size: 22 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] }) },
      children: [
        headerTable,
        labeled('รายวิชา ', analysis.courseName || analysis.title),
        labeled('รหัสวิชา ', analysis.courseCode || '-'),
        labeled('ระดับ/ชั้นเรียน ', [analysis.educationLevel, ...(analysis.assignedClasses || [])].filter(Boolean).join(' · ')),
        labeled('ภาคเรียน ', `${analysis.semesterLabel || analysis.semester || '-'}    ปีการศึกษา ${analysis.academicYear || '-'}`),
        labeled('ผู้สอน ', analysis.teacherName || '-'),
        labeled('สาขาวิชา ', (analysis.programs || []).join(', ') || '-'),
        paragraph('การวิเคราะห์คุณภาพของแบบทดสอบ', { bold: true, size: 34, alignment: AlignmentType.CENTER, before: 160, after: 100 }),
        labeled('กลุ่มผู้เรียน ', [analysis.educationLevel, ...(analysis.assignedClasses || [])].filter(Boolean).join(' · ')),
        labeled('จำนวนผู้ทำข้อสอบ ', `${analysis.respondents} คน`),
        labeled('จำนวนข้อสอบ ', `${analysis.questionCount} ข้อ`),
        labeled('จำนวนตัวเลือก ', `${choicesLabel} ตัวเลือก`),
        paragraph('ผลการวิเคราะห์', { bold: true, size: 30, before: 100, after: 40 }),
        labeled('ข้อสอบที่อยู่ในเกณฑ์มาตรฐาน ', `${summary.standardCount} ข้อ คิดเป็นร้อยละ ${summary.percent}`),
        labeled('ข้อสอบที่ไม่ได้เกณฑ์มาตรฐาน ', `${summary.rejectedCount} ข้อ คิดเป็นร้อยละ ${summary.rejectedPercent}`),
        labeled('ข้อสอบที่สามารถเก็บเข้าคลังข้อสอบได้ ', `${summary.standardCount} ข้อ`),
        labeled('ค่าความเชื่อมั่น ', analysis.reliability === null ? 'ข้อมูลไม่เพียงพอ' : `KR-20 = ${analysis.reliability}`),
        new Paragraph({ children: [new PageBreak()] }),
        paragraph('ผลการวิเคราะห์ข้อสอบรายข้อ', { bold: true, size: 34, alignment: AlignmentType.CENTER, after: 120 }),
        analysisTable,
        paragraph('เกณฑ์ที่ใช้: ค่าความยาก (P) 0.20–0.80 และค่าอำนาจจำแนก (D) ตั้งแต่ 0.20 ขึ้นไป', { size: 22, before: 100 })
      ]
    }]
  });
  return Packer.toBuffer(doc);
}

module.exports = { analysisStatus, buildQuestionAnalysisDocx, buildSummary };
