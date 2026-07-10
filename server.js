/* ======================================================================
   Exam System Backend
   - Express REST API
   - Simple JSON-file database (no native modules required)
   - Serves two separate frontend pages:
       /        -> public/student.html  (students)
       /admin   -> public/admin.html    (teachers / admin)
   ====================================================================== */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const XLSX = require('xlsx');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'aunaum11';
if (ADMIN_KEY === 'aunaum11') {
  console.warn('[WARNING] Using the default ADMIN_KEY. Set ADMIN_KEY in your .env file before deploying for real use.');
}

/* ---------------------------- DATABASE (JSON file) ---------------------------- */
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readDB() {
  if (!fs.existsSync(DB_PATH)) return { sets: [], results: [], students: [] };
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.sets)) db.sets = [];
    if (!Array.isArray(db.results)) db.results = [];
    if (!Array.isArray(db.students)) db.students = [];
    return db;
  } catch (e) {
    console.error('Failed to read database file, starting with an empty database.', e);
    return { sets: [], results: [], students: [] };
  }
}
let writeChain = Promise.resolve();
function writeDB(db) {
  writeChain = writeChain.then(() => new Promise((resolve, reject) => {
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFile(tmpPath, JSON.stringify(db, null, 2), (err) => {
      if (err) return reject(err);
      fs.rename(tmpPath, DB_PATH, (err2) => err2 ? reject(err2) : resolve());
    });
  }));
  return writeChain;
}
function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

/* Seed one example exam set + a couple of example students on first run */
function seedIfEmpty() {
  const db = readDB();
  if (db.sets.length > 0) return;
  const now = new Date().toISOString();
  db.sets.push({
    key: 'set_seed_sample1',
    title: 'ความรู้พื้นฐานคอมพิวเตอร์ (ตัวอย่าง)',
    tagline: 'Sample Question Set',
    desc: 'ชุดข้อสอบตัวอย่างสำหรับทดสอบระบบ ผู้ดูแลระบบสามารถแก้ไขหรือลบชุดนี้ได้',
    assignedClasses: [],
    subjectTeacherName: 'อาจารย์ตัวอย่าง',
    subjectTeacherEmail: '',
    sections: {
      mc: {
        title: 'ส่วนที่ 1 — ปรนัย (เลือกตอบ)',
        desc: 'เลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียวในแต่ละข้อ',
        questions: [
          { id: 'mc1', text: 'อุปกรณ์ใดต่อไปนี้ทำหน้าที่เป็นหน่วยประมวลผลกลางของคอมพิวเตอร์?', choices: ['RAM', 'CPU', 'HDD', 'PSU'], answer: 1, points: 20 },
          { id: 'mc2', text: 'ข้อใดคือความหมายของคำว่า "Software"?', choices: ['อุปกรณ์ที่จับต้องได้ของคอมพิวเตอร์', 'ชุดคำสั่งหรือโปรแกรมที่สั่งให้คอมพิวเตอร์ทำงาน', 'สายไฟที่เชื่อมต่ออุปกรณ์', 'จอแสดงผล'], answer: 1, points: 20 },
          { id: 'mc3', text: 'หน่วยความจำชนิดใดที่ข้อมูลจะหายไปเมื่อปิดเครื่อง?', choices: ['ROM', 'RAM', 'Hard Disk', 'Flash Drive'], answer: 1, points: 20 },
          { id: 'mc4', text: 'ระบบปฏิบัติการ (Operating System) มีหน้าที่หลักคืออะไร?', choices: ['จัดการทรัพยากรของเครื่องและเป็นตัวกลางระหว่างผู้ใช้กับฮาร์ดแวร์', 'ต่ออินเทอร์เน็ตเท่านั้น', 'พิมพ์เอกสารเท่านั้น', 'เล่นเกมเท่านั้น'], answer: 0, points: 20 },
          { id: 'mc5', text: 'ข้อใดเป็นตัวอย่างของอุปกรณ์ Input?', choices: ['จอภาพ', 'เครื่องพิมพ์', 'คีย์บอร์ด', 'ลำโพง'], answer: 2, points: 20 }
        ]
      },
      matching: {
        title: 'ส่วนที่ 2 — จับคู่',
        desc: 'คลิกเลือกรายการทางซ้าย แล้วคลิกรายการทางขวาที่สัมพันธ์กัน เพื่อจับคู่',
        left: [{ id: 'l1', text: 'CPU' }, { id: 'l2', text: 'RAM' }, { id: 'l3', text: 'Hard Disk' }, { id: 'l4', text: 'Keyboard' }, { id: 'l5', text: 'Monitor' }],
        right: [{ id: 'r1', text: 'อุปกรณ์แสดงผลภาพ' }, { id: 'r2', text: 'หน่วยประมวลผลกลาง' }, { id: 'r3', text: 'อุปกรณ์รับข้อมูลชนิดปุ่มกด' }, { id: 'r4', text: 'หน่วยความจำสำรองแบบถาวร' }, { id: 'r5', text: 'หน่วยความจำหลักชั่วคราว' }],
        correctMap: { l1: 'r2', l2: 'r5', l3: 'r4', l4: 'r3', l5: 'r1' },
        pointsEach: 20
      },
      written: {
        title: 'ส่วนที่ 3 — อัตนัย (เขียนตอบ)',
        desc: 'ตอบคำถามด้วยคำพูดของตนเองให้ครบถ้วน',
        questions: [
          { id: 'w1', text: 'จงอธิบายความแตกต่างระหว่าง Hardware และ Software พร้อมยกตัวอย่างอย่างละ 2 ชนิด', keywords: ['ฮาร์ดแวร์', 'Hardware', 'ซอฟต์แวร์', 'Software', 'จับต้องได้', 'คำสั่ง', 'โปรแกรม'], maxPoints: 50 },
          { id: 'w2', text: 'เพราะเหตุใดคอมพิวเตอร์จึงจำเป็นต้องมีทั้งหน่วยความจำหลัก (RAM) และหน่วยความจำสำรอง (Storage)?', keywords: ['RAM', 'ชั่วคราว', 'ถาวร', 'ความเร็ว', 'เก็บข้อมูล', 'ปิดเครื่อง', 'หาย'], maxPoints: 50 }
        ]
      }
    },
    createdAt: now,
    updatedAt: now
  });
  db.students.push(
    { studentId: '10001', firstName: 'สมชาย', lastName: 'ใจดี', classRoom: 'ม.3/1', createdAt: now },
    { studentId: '10002', firstName: 'สมหญิง', lastName: 'รักเรียน', classRoom: 'ม.3/1', createdAt: now },
    { studentId: '10003', firstName: 'วิชัย', lastName: 'ตั้งใจ', classRoom: 'ม.3/2', createdAt: now }
  );
  writeDB(db);
}
seedIfEmpty();

/* ---------------------------- APP SETUP ---------------------------- */
const app = express();
app.use(express.json({ limit: '2mb' }));

function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized', message: 'ต้องระบุรหัสผู้ดูแลระบบที่ถูกต้อง' });
  }
  next();
}

/* ---------------------------- PAGES ---------------------------- */
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------------------- ADMIN AUTH ---------------------------- */
app.post('/api/admin/verify', (req, res) => {
  const key = req.get('x-admin-key');
  if (key === ADMIN_KEY) return res.json({ ok: true });
  return res.status(401).json({ ok: false });
});

/* ---------------------------- STUDENTS (ROSTER) ---------------------------- */
// Public: student types their student ID to log in -> look up name/surname/class
app.get('/api/students/:studentId', (req, res) => {
  const db = readDB();
  const s = db.students.find(x => x.studentId === req.params.studentId.trim());
  if (!s) return res.status(404).json({ error: 'not_found', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ กรุณาตรวจสอบรหัส หรือติดต่อผู้ดูแลระบบ' });
  res.json(s);
});

// Admin: list all students (optionally filter by classRoom)
app.get('/api/students', requireAdmin, (req, res) => {
  const db = readDB();
  let list = db.students;
  if (req.query.classRoom) list = list.filter(s => s.classRoom === req.query.classRoom);
  list = [...list].sort((a, b) => (a.classRoom + a.studentId).localeCompare(b.classRoom + b.studentId));
  res.json(list);
});

// Admin: add one student
app.post('/api/students', requireAdmin, async (req, res) => {
  const b = req.body;
  if (!b || !b.studentId || !b.firstName || !b.lastName || !b.classRoom) {
    return res.status(400).json({ error: 'invalid_payload', message: 'กรอกข้อมูลนักเรียนไม่ครบ (รหัส, ชื่อ, นามสกุล, ห้อง)' });
  }
  const db = readDB();
  if (db.students.some(s => s.studentId === b.studentId)) {
    return res.status(409).json({ error: 'duplicate', message: 'มีรหัสนักเรียนนี้อยู่ในระบบแล้ว' });
  }
  db.students.push({ studentId: b.studentId.trim(), firstName: b.firstName.trim(), lastName: b.lastName.trim(), classRoom: b.classRoom.trim(), createdAt: new Date().toISOString() });
  await writeDB(db);
  res.status(201).json({ ok: true });
});

// Admin: bulk import (paste CSV / tab-separated text: studentId, firstName, lastName, classRoom per line)
app.post('/api/students/bulk', requireAdmin, async (req, res) => {
  const text = (req.body && req.body.text) || '';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const db = readDB();
  const byId = new Map(db.students.map(s => [s.studentId, s]));
  let imported = 0, updated = 0;
  const errors = [];
  lines.forEach((line, i) => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    const [studentId, firstName, lastName, classRoom] = parts.map(p => (p || '').trim());
    if (!studentId || !firstName || !lastName || !classRoom) {
      errors.push(`บรรทัดที่ ${i + 1}: ข้อมูลไม่ครบ ("${line}")`);
      return;
    }
    if (byId.has(studentId)) {
      Object.assign(byId.get(studentId), { firstName, lastName, classRoom });
      updated++;
    } else {
      const rec = { studentId, firstName, lastName, classRoom, createdAt: new Date().toISOString() };
      byId.set(studentId, rec);
      db.students.push(rec);
      imported++;
    }
  });
  await writeDB(db);
  res.json({ imported, updated, errors });
});

// Admin: edit a student
app.put('/api/students/:studentId', requireAdmin, async (req, res) => {
  const db = readDB();
  const s = db.students.find(x => x.studentId === req.params.studentId);
  if (!s) return res.status(404).json({ error: 'not_found' });
  const b = req.body;
  Object.assign(s, { firstName: b.firstName ?? s.firstName, lastName: b.lastName ?? s.lastName, classRoom: b.classRoom ?? s.classRoom });
  await writeDB(db);
  res.json({ ok: true });
});

// Admin: delete a student
app.delete('/api/students/:studentId', requireAdmin, async (req, res) => {
  const db = readDB();
  db.students = db.students.filter(x => x.studentId !== req.params.studentId);
  await writeDB(db);
  res.json({ ok: true });
});

// Admin: distinct list of classrooms currently in the roster (for the "assign classes" picker)
app.get('/api/classes', requireAdmin, (req, res) => {
  const db = readDB();
  const classes = [...new Set(db.students.map(s => s.classRoom))].sort();
  res.json(classes);
});

/* ---------------------------- EXAM SETS ---------------------------- */
// Public: list exam sets. Optional ?classRoom=xxx to only return sets that classroom is eligible for.
app.get('/api/sets', (req, res) => {
  const db = readDB();
  let list = db.sets.map(s => ({
    key: s.key, title: s.title, tagline: s.tagline, desc: s.desc, sections: s.sections,
    assignedClasses: s.assignedClasses || [], subjectTeacherName: s.subjectTeacherName || ''
  }));
  if (req.query.classRoom) {
    const cr = req.query.classRoom;
    list = list.filter(s => !s.assignedClasses.length || s.assignedClasses.includes(cr));
  }
  res.json(list);
});

app.get('/api/sets/:key', (req, res) => {
  const db = readDB();
  const s = db.sets.find(x => x.key === req.params.key);
  if (!s) return res.status(404).json({ error: 'not_found' });
  res.json(s);
});

app.post('/api/sets', requireAdmin, async (req, res) => {
  const body = req.body;
  if (!body || !body.title || !body.sections) return res.status(400).json({ error: 'invalid_payload', message: 'ข้อมูลชุดข้อสอบไม่ครบถ้วน' });
  const db = readDB();
  const key = body.key || newId('set');
  const now = new Date().toISOString();
  db.sets.push({
    key, title: body.title, tagline: body.tagline || '', desc: body.desc || '',
    assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : [],
    subjectTeacherName: body.subjectTeacherName || '', subjectTeacherEmail: body.subjectTeacherEmail || '',
    sections: body.sections, createdAt: now, updatedAt: now
  });
  await writeDB(db);
  res.status(201).json({ key });
});

app.put('/api/sets/:key', requireAdmin, async (req, res) => {
  const db = readDB();
  const idx = db.sets.findIndex(x => x.key === req.params.key);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  const body = req.body;
  const now = new Date().toISOString();
  db.sets[idx] = Object.assign({}, db.sets[idx], {
    title: body.title, tagline: body.tagline || '', desc: body.desc || '',
    assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : [],
    subjectTeacherName: body.subjectTeacherName || '', subjectTeacherEmail: body.subjectTeacherEmail || '',
    sections: body.sections, updatedAt: now
  });
  await writeDB(db);
  res.json({ ok: true });
});

app.post('/api/sets/:key/duplicate', requireAdmin, async (req, res) => {
  const db = readDB();
  const orig = db.sets.find(x => x.key === req.params.key);
  if (!orig) return res.status(404).json({ error: 'not_found' });
  const now = new Date().toISOString();
  const copy = JSON.parse(JSON.stringify(orig));
  copy.key = newId('set');
  copy.title = orig.title + ' (สำเนา)';
  copy.createdAt = now; copy.updatedAt = now;
  db.sets.push(copy);
  await writeDB(db);
  res.status(201).json({ key: copy.key });
});

app.delete('/api/sets/:key', requireAdmin, async (req, res) => {
  const db = readDB();
  db.sets = db.sets.filter(x => x.key !== req.params.key);
  await writeDB(db);
  res.json({ ok: true });
});

/* ---------------------------- RESULTS ---------------------------- */
app.post('/api/results', async (req, res) => {
  const r = req.body;
  if (!r || !r.studentId || !r.questionKey) return res.status(400).json({ error: 'invalid_payload', message: 'ข้อมูลผลสอบไม่ครบถ้วน' });
  const db = readDB();
  const record = {
    id: newId('result'),
    studentId: r.studentId,
    studentName: r.studentName,
    classRoom: r.classRoom || '',
    questionKey: r.questionKey,
    questionTitle: r.questionTitle || '-',
    subjectTeacherName: r.subjectTeacherName || '',
    subjectTeacherEmail: r.subjectTeacherEmail || '',
    overallScore20: r.overallScore20 || 0,
    sectionScores: {
      mc: r.sectionScores?.mc ?? null,
      matching: r.sectionScores?.matching ?? null,
      written: r.sectionScores?.written ?? null
    },
    tabSwitches: r.tabSwitches || 0,
    reloadCount: r.reloadCount || 0,
    detail: r.detail || {},
    submittedAt: new Date().toISOString()
  };
  db.results.push(record);
  await writeDB(db);
  res.status(201).json({ id: record.id });
});

app.get('/api/results', requireAdmin, (req, res) => {
  const db = readDB();
  let rows = [...db.results];
  if (req.query.setKey) rows = rows.filter(r => r.questionKey === req.query.setKey);
  rows.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(rows);
});

app.delete('/api/results/:id', requireAdmin, async (req, res) => {
  const db = readDB();
  db.results = db.results.filter(x => x.id !== req.params.id);
  await writeDB(db);
  res.json({ ok: true });
});

/* ---------------------------- EXCEL EXPORT ---------------------------- */
app.get('/api/export/results.xlsx', requireAdmin, (req, res) => {
  const db = readDB();
  let rows = [...db.results];
  if (req.query.setKey) rows = rows.filter(r => r.questionKey === req.query.setKey);
  rows.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  const sheetData = rows.map(r => ({
    'รหัสนักเรียน': r.studentId,
    'ชื่อ-สกุล': r.studentName,
    'ห้อง': r.classRoom,
    'รายวิชา': r.questionTitle,
    'อาจารย์ประจำวิชา': r.subjectTeacherName,
    'ปรนัย (/100)': r.sectionScores.mc,
    'จับคู่ (/100)': r.sectionScores.matching,
    'อัตนัย (/100)': r.sectionScores.written,
    'คะแนนรวม (/20)': r.overallScore20,
    'สลับแท็บ (ครั้ง)': r.tabSwitches,
    'โหลดหน้าใหม่ (ครั้ง)': r.reloadCount,
    'วันเวลาที่ส่ง': new Date(r.submittedAt).toLocaleString('th-TH')
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData.length ? sheetData : [{ 'หมายเหตุ': 'ยังไม่มีผลสอบ' }]);
  ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ผลสอบ');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const setTitle = req.query.setKey ? (db.sets.find(s => s.key === req.query.setKey)?.title || 'ผลสอบ') : 'ผลสอบทั้งหมด';
  const filename = `${setTitle.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]+/g, '_')}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

/* ---------------------------- FALLBACK ---------------------------- */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));

app.listen(PORT, () => {
  console.log(`Exam system backend running at http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin)`);
});
