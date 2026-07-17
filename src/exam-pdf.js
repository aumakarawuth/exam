const PDFDocument = require('pdfkit');
const path = require('path');

const fontRoot = path.dirname(require.resolve('font-th-sarabun-new/package.json'));
const regularFont = path.join(fontRoot, 'fonts', 'THSarabunNew-webfont.ttf');
const boldFont = path.join(fontRoot, 'fonts', 'THSarabunNew_bold-webfont.ttf');

function safeText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function writeMixed(doc, value, options = {}) {
  const text = safeText(value);
  if (!text) return;
  doc.font(options.bold ? 'bold' : 'regular').fontSize(options.size || 10.5).fillColor(options.color || '#1e293b').text(text, { ...options, bold: undefined, size: undefined, color: undefined });
}

function scoreTotal(set) {
  const mc = (set.sections?.mc?.questions || []).reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const matching = (set.sections?.matching?.left || []).length * (Number(set.sections?.matching?.pointsEach) || 0);
  const written = (set.sections?.written?.questions || []).reduce((sum, question) => sum + (Number(question.maxPoints) || 0), 0);
  return Math.round((mc + matching + written) * 100) / 100;
}

function questionResourceLines(question) {
  const resources = question?.resources;
  if (!resources || typeof resources !== 'object') return [];
  const lines = [];
  if (resources.code) {
    lines.push(`โค้ดประกอบโจทย์: ${safeText(resources.code)}`);
  }
  if (resources.table) {
    lines.push(`ตารางประกอบโจทย์: ${safeText(resources.table)}`);
  }
  const attachments = Array.isArray(resources.attachments) ? resources.attachments : [];
  attachments.forEach(item => {
    if (!item?.url) return;
    lines.push(`เอกสาร/รูปประกอบ: ${safeText(item.name) || item.url}`);
  });
  return lines;
}

function buildExamPdf(set) {
  const margin = 32;
  const gap = 18;
  const doc = new PDFDocument({ size: 'A4', margin, bufferPages: true, info: { Title: safeText(set.title) || 'ต้นฉบับข้อสอบ', Author: safeText(set.subjectTeacherName) || 'Exam System' } });
  doc.registerFont('regular', regularFont);
  doc.registerFont('bold', boldFont);
  const pageWidth = doc.page.width;
  const columnWidth = (pageWidth - (margin * 2) - gap) / 2;
  const bottom = () => doc.page.height - 36;
  let column = 0;
  let columnY = 0;
  let contentTop = 0;
  const columnX = () => margin + (column * (columnWidth + gap));
  const rule = (y, x = margin, width = pageWidth - (margin * 2)) => doc.moveTo(x, y).lineTo(x + width, y).strokeColor('#cbd5e1').lineWidth(.55).stroke();
  const textHeight = (text, options = {}) => {
    doc.font(options.bold ? 'bold' : 'regular').fontSize(options.size || 10.5);
    return doc.heightOfString(safeText(text), { width: columnWidth, lineGap: options.lineGap ?? 1 });
  };
  const drawPageHeader = first => {
    doc.x = margin; doc.y = margin;
    if (first) {
      writeMixed(doc, 'ต้นฉบับข้อสอบ', { bold: true, size: 18, color: '#1d4ed8', width: pageWidth - (margin * 2), align: 'center' });
      writeMixed(doc, safeText(set.courseName) || safeText(set.title), { bold: true, size: 15, color: '#0f172a', width: pageWidth - (margin * 2), align: 'center' });
      if (safeText(set.title) !== safeText(set.courseName)) writeMixed(doc, safeText(set.title), { size: 10.5, color: '#475569', width: pageWidth - (margin * 2), align: 'center' });
      doc.moveDown(.45);
      rule(doc.y);
      doc.moveDown(.35);
      writeMixed(doc, `ประเภทข้อสอบ: ${safeText(set.examType) || '-'}     ระดับ: ${safeText(set.educationLevel) || '-'}`, { size: 10.5, color: '#334155', width: pageWidth - (margin * 2) });
      writeMixed(doc, `ผู้สอน: ${safeText(set.subjectTeacherName) || '-'}     คะแนนเต็ม: ${scoreTotal(set)} คะแนน`, { size: 10.5, color: '#334155', width: pageWidth - (margin * 2) });
      if (set.desc) writeMixed(doc, `คำอธิบาย: ${safeText(set.desc)}`, { size: 10.5, color: '#475569', width: pageWidth - (margin * 2) });
      doc.moveDown(.25);
      rule(doc.y);
      doc.moveDown(.28);
      writeMixed(doc, 'ชื่อ-สกุล ........................................................................ ชั้น/ห้อง .............. เลขที่ ..............', { size: 10.5, color: '#334155', width: pageWidth - (margin * 2) });
      doc.moveDown(.35);
      rule(doc.y);
    } else {
      writeMixed(doc, safeText(set.courseName) || safeText(set.title), { bold: true, size: 10.5, color: '#334155', width: pageWidth - (margin * 2) });
      rule(doc.y + 4);
      doc.moveDown(.55);
    }
    return doc.y + 8;
  };
  const newColumnPage = () => {
    doc.addPage();
    contentTop = drawPageHeader(false);
    column = 0;
    columnY = contentTop;
  };
  const ensureColumnSpace = height => {
    if (columnY + height <= bottom()) return;
    if (column === 0) { column = 1; columnY = contentTop; return; }
    newColumnPage();
  };
  const writeColumn = (text, options = {}) => {
    const { skipEnsure, ...renderOptions } = options;
    const height = textHeight(text, options);
    if (!skipEnsure) ensureColumnSpace(height + (options.after ?? 4));
    doc.x = columnX(); doc.y = columnY;
    writeMixed(doc, text, { size: 10.5, color: '#1e293b', lineGap: 1, width: columnWidth, ...renderOptions });
    columnY = doc.y + (options.after ?? 4);
  };

  contentTop = drawPageHeader(true);
  columnY = contentTop;

  const mc = set.sections?.mc || {};
  if ((mc.questions || []).length) {
    writeColumn(mc.title || 'ส่วนที่ 1 - ปรนัย', { bold: true, size: 14, color: '#0f172a', after: 2 });
    if (mc.desc) writeColumn(safeText(mc.desc), { color: '#475569', after: 5 });
    mc.questions.forEach((question, index) => {
      const resources = questionResourceLines(question);
      const questionText = `${index + 1}. ${safeText(question.text)}`;
      const groupHeight = textHeight(questionText, { bold: true }) + 2
        + resources.reduce((sum, resource) => sum + textHeight(resource, { size: 8.5, indent: 10 }) + 2, 0)
        + (question.choices || []).reduce((sum, choice, choiceIndex) => sum + textHeight(`${String.fromCharCode(65 + choiceIndex)}. ${safeText(choice)}`, { indent: 14 }) + 1, 0)
        + 5;
      ensureColumnSpace(groupHeight);
      writeColumn(questionText, { bold: true, color: '#0f172a', after: 2, skipEnsure: true });
      resources.forEach(resource => writeColumn(resource, { color: '#475569', size: 8.5, indent: 10, after: 2, skipEnsure: true }));
      (question.choices || []).forEach((choice, choiceIndex) => writeColumn(`${String.fromCharCode(65 + choiceIndex)}. ${safeText(choice)}`, { indent: 14, after: 1, skipEnsure: true }));
      columnY += 5;
    });
  }

  const matching = set.sections?.matching || {};
  if ((matching.left || []).length) {
    writeColumn(matching.title || 'ส่วนที่ 2 - จับคู่', { bold: true, size: 14, color: '#0f172a', after: 2 });
    if (matching.desc) writeColumn(safeText(matching.desc), { color: '#475569', after: 5 });
    (matching.left || []).forEach((item, index) => {
      writeColumn(`${index + 1}. ............ ${safeText(item.text)}`, { after: 1 });
    });
    columnY += 4;
    writeColumn('ตัวเลือกสำหรับจับคู่', { bold: true, color: '#475569', after: 2 });
    (matching.right || []).forEach((item, index) => {
      writeColumn(`${String.fromCharCode(65 + index)}. ${safeText(item.text)}`, { indent: 14, after: 1 });
    });
    columnY += 5;
  }

  const written = set.sections?.written || {};
  if ((written.questions || []).length) {
    writeColumn(written.title || 'ส่วนที่ 3 - อัตนัย', { bold: true, size: 14, color: '#0f172a', after: 2 });
    if (written.desc) writeColumn(safeText(written.desc), { color: '#475569', after: 5 });
    written.questions.forEach((question, index) => {
      writeColumn(`${index + 1}. ${safeText(question.text)}`, { bold: true, color: '#0f172a', after: 2 });
      questionResourceLines(question).forEach(resource => writeColumn(resource, { color: '#475569', size: 8.5, indent: 10, after: 2 }));
      ensureColumnSpace(62);
      for (let lineNumber = 0; lineNumber < 4; lineNumber += 1) {
        columnY += 13;
        rule(columnY, columnX() + 4, columnWidth - 8);
      }
      columnY += 8;
    });
  }

  return doc;
}

module.exports = { buildExamPdf };
