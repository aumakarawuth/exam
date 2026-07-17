const PDFDocument = require('pdfkit');
const path = require('path');

const fontRoot = path.dirname(require.resolve('@fontsource/noto-sans-thai/package.json'));
const regularFont = path.join(fontRoot, 'files', 'noto-sans-thai-thai-400-normal.woff');
const boldFont = path.join(fontRoot, 'files', 'noto-sans-thai-thai-700-normal.woff');

function safeText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function isThai(char) {
  const code = char.codePointAt(0);
  return (code >= 0x0e00 && code <= 0x0e7f) || code === 0x200c || code === 0x200d;
}

// The web font is intentionally split into Thai and Latin files. PDFKit has no
// automatic fallback, so write each script with the matching embedded font.
function writeMixed(doc, value, options = {}) {
  const text = safeText(value);
  if (!text) return;
  const chunks = [];
  for (const char of text) {
    const family = isThai(char) ? (options.bold ? 'bold' : 'regular') : (options.bold ? 'Helvetica-Bold' : 'Helvetica');
    const last = chunks[chunks.length - 1];
    if (last && last.family === family) last.text += char;
    else chunks.push({ family, text: char });
  }
  const textOptions = { ...options, bold: undefined, size: undefined, color: undefined };
  const originalX = doc.x;
  // PDFKit centers every continued chunk independently. Position a mixed-script
  // line ourselves so Thai and English stay together in headings and footers.
  if (chunks.length > 1 && textOptions.align) {
    const availableWidth = textOptions.width || (doc.page.width - doc.x - doc.page.margins.right);
    const textWidth = chunks.reduce((total, chunk) => total + doc.font(chunk.family).fontSize(options.size || 10.5).widthOfString(chunk.text), 0);
    if (textOptions.align === 'center') doc.x += Math.max(0, (availableWidth - textWidth) / 2);
    if (textOptions.align === 'right') doc.x += Math.max(0, availableWidth - textWidth);
    delete textOptions.align;
    delete textOptions.width;
  }
  chunks.forEach((chunk, index) => {
    doc.font(chunk.family).fontSize(options.size || 10.5).fillColor(options.color || '#1e293b').text(chunk.text, { ...textOptions, continued: index < chunks.length - 1 });
  });
  if (options.align && chunks.length > 1) doc.x = originalX;
}

function scoreTotal(set) {
  const mc = (set.sections?.mc?.questions || []).reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const matching = (set.sections?.matching?.left || []).length * (Number(set.sections?.matching?.pointsEach) || 0);
  const written = (set.sections?.written?.questions || []).reduce((sum, question) => sum + (Number(question.maxPoints) || 0), 0);
  return Math.round((mc + matching + written) * 100) / 100;
}

function questionResources(doc, question, ensureSpace) {
  const resources = question?.resources;
  if (!resources || typeof resources !== 'object') return;
  if (resources.code) {
    ensureSpace(65);
    writeMixed(doc, `โค้ดประกอบโจทย์: ${safeText(resources.code)}`, { size: 8.5, color: '#334155', indent: 14, lineGap: 2 });
  }
  if (resources.table) {
    ensureSpace(34);
    writeMixed(doc, `ตารางประกอบโจทย์: ${safeText(resources.table)}`, { size: 8.5, color: '#334155', indent: 14, lineGap: 2 });
  }
  const attachments = Array.isArray(resources.attachments) ? resources.attachments : [];
  attachments.forEach(item => {
    if (!item?.url) return;
    ensureSpace(22);
    writeMixed(doc, `เอกสาร/รูปประกอบ: ${safeText(item.name) || item.url}`, { size: 8.5, color: '#2563eb', indent: 14 });
  });
}

function buildExamPdf(set) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: safeText(set.title) || 'ต้นฉบับข้อสอบ', Author: safeText(set.subjectTeacherName) || 'Exam System' } });
  doc.registerFont('regular', regularFont);
  doc.registerFont('bold', boldFont);
  const pageWidth = doc.page.width;
  const bottom = () => doc.page.height - 62;
  const ensureSpace = height => { if (doc.y + height > bottom()) doc.addPage(); };
  const line = () => { doc.moveTo(48, doc.y).lineTo(pageWidth - 48, doc.y).strokeColor('#cbd5e1').lineWidth(.6).stroke(); doc.moveDown(.55); };
  const heading = (text, size = 14) => { ensureSpace(32); writeMixed(doc, text, { bold: true, size, color: '#0f172a' }); doc.moveDown(.28); };
  const body = (text, options = {}) => writeMixed(doc, text, { lineGap: options.lineGap ?? 3, ...options });

  writeMixed(doc, 'ต้นฉบับข้อสอบ', { bold: true, size: 18, color: '#1d4ed8', align: 'center' });
  writeMixed(doc, safeText(set.courseName) || safeText(set.title), { bold: true, size: 15, color: '#0f172a', align: 'center' });
  writeMixed(doc, safeText(set.title), { size: 10, color: '#475569', align: 'center' });
  doc.moveDown(.8);
  line();
  body(`ประเภทข้อสอบ: ${safeText(set.examType) || '-'}     ระดับ: ${safeText(set.educationLevel) || '-'}`);
  body(`ผู้สอน: ${safeText(set.subjectTeacherName) || '-'}     คะแนนเต็ม: ${scoreTotal(set)} คะแนน`);
  if (set.desc) body(`คำอธิบาย: ${safeText(set.desc)}`, { color: '#475569' });
  doc.moveDown(.45);
  line();
  doc.moveDown(.25);
  body('ชื่อ-สกุล .............................................................................................................. ชั้น/ห้อง .................... เลขที่ ............', { size: 10 });
  doc.moveDown(1);

  const mc = set.sections?.mc || {};
  if ((mc.questions || []).length) {
    heading(mc.title || 'ส่วนที่ 1 - ปรนัย');
    if (mc.desc) body(safeText(mc.desc), { color: '#475569', size: 9.5 });
    doc.moveDown(.45);
    mc.questions.forEach((question, index) => {
      ensureSpace(94);
      writeMixed(doc, `${index + 1}. ${safeText(question.text)} (${Number(question.points) || 0} คะแนน)`, { bold: true, size: 10.5, color: '#0f172a', lineGap: 3 });
      questionResources(doc, question, ensureSpace);
      (question.choices || []).forEach((choice, choiceIndex) => body(`${String.fromCharCode(65 + choiceIndex)}. ${safeText(choice)}`, { indent: 18, size: 10 }));
      doc.moveDown(.6);
    });
  }

  const matching = set.sections?.matching || {};
  if ((matching.left || []).length) {
    ensureSpace(100);
    heading(matching.title || 'ส่วนที่ 2 - จับคู่');
    if (matching.desc) body(safeText(matching.desc), { color: '#475569', size: 9.5 });
    body(`ข้อละ ${Number(matching.pointsEach) || 0} คะแนน`, { color: '#475569', size: 9.5 });
    doc.moveDown(.45);
    (matching.left || []).forEach((item, index) => {
      ensureSpace(24);
      body(`${index + 1}. ............ ${safeText(item.text)}`);
    });
    doc.moveDown(.5);
    body('ตัวเลือกสำหรับจับคู่', { color: '#475569', size: 9.5 });
    (matching.right || []).forEach((item, index) => {
      ensureSpace(24);
      body(`${String.fromCharCode(65 + index)}. ${safeText(item.text)}`, { indent: 18 });
    });
    doc.moveDown(.8);
  }

  const written = set.sections?.written || {};
  if ((written.questions || []).length) {
    ensureSpace(100);
    heading(written.title || 'ส่วนที่ 3 - อัตนัย');
    if (written.desc) body(safeText(written.desc), { color: '#475569', size: 9.5 });
    doc.moveDown(.45);
    written.questions.forEach((question, index) => {
      ensureSpace(115);
      writeMixed(doc, `${index + 1}. ${safeText(question.text)} (${Number(question.maxPoints) || 0} คะแนน)`, { bold: true, size: 10.5, color: '#0f172a', lineGap: 3 });
      questionResources(doc, question, ensureSpace);
      for (let lineNumber = 0; lineNumber < 5; lineNumber += 1) {
        ensureSpace(16);
        doc.moveDown(.65); doc.moveTo(60, doc.y).lineTo(pageWidth - 60, doc.y).strokeColor('#cbd5e1').lineWidth(.45).stroke();
      }
      doc.moveDown(.7);
    });
  }

  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(index);
    doc.save(); doc.x = 48; doc.y = doc.page.height - 56; writeMixed(doc, `เอกสารต้นฉบับข้อสอบ - หน้า ${index + 1}     พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}`, { size: 7.5, color: '#64748b', width: pageWidth - 96, align: 'center', lineBreak: false }); doc.restore();
  }
  return doc;
}

module.exports = { buildExamPdf };
