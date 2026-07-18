/* ======================================================================
   Exam System Backend
   - Express REST API
   - SQLite database (using Node.js built-in SQLite support)
   - Grading happens SERVER-SIDE ONLY. The public /api/sets endpoint never
     sends answer keys (correct choice / correct pairs / keywords) to the
     browser, since these are now formal midterm/final exams where scores
     must stay confidential until the teacher announces them.
   - Serves separate frontend pages for students, teachers, administrators,
     and object-analysis assignments.
   ====================================================================== */
require('dotenv').config();
const express = require('express');
const { PORT, ADMIN_KEY, EXAM_TYPES, PUBLIC_DIR, SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_STORAGE_BUCKET, GOOGLE_FORMS_CLIENT_ID, GOOGLE_FORMS_CLIENT_SECRET, GOOGLE_FORMS_REDIRECT_URI } = require('./src/config');
const { readDB, writeDB, mutateDB, closeDatabase, databaseReady } = require('./src/database');
const { hashPassword, verifyPassword, requireTeacher, requireAdmin, requireStudent, createTeacherSession, createStudentSession, removeTeacherSessions, teacherSessions } = require('./src/auth');
const { round2, gradeMC, gradeMatching, gradeWritten, getExamSchedule, hasExamAccess, isPastDeadline, isBeforeStart, sanitizeSetForStudent } = require('./src/grading');
const { registerPages, registerFallback, registerErrorHandler } = require('./src/pages');
const { registerRoutes } = require('./src/routes');
const { buildResultsWorkbook: buildResultsWorkbookModule, buildGradebookWorkbook } = require('./src/results-workbook');
const { buildQuestionAnalysis, buildQuestionAnalysisWorkbook } = require('./src/question-analysis');
const { applySecurityHeaders } = require('./src/security');
const { newId } = require('./src/ids');
const { createAssetStorage } = require('./src/asset-storage');
const { applyAcademicPeriod } = require('./src/academic-calendar');
const { createShutdownHandler, registerShutdownSignals } = require('./src/shutdown');
const { createRuntimeMetrics } = require('./src/runtime-metrics');
const { createSubmissionGate } = require('./src/submission-gate');

if (ADMIN_KEY === 'changeme123') {
  console.warn('[WARNING] Using the default ADMIN_KEY. Set ADMIN_KEY in your .env file before deploying for real use.');
}
/* Seed one example exam set (full score = 20) + example students on first run */
async function seedIfEmpty() {
  await databaseReady;
  const db = readDB();
  if (db.sets.length > 0) return;
  const now = new Date().toISOString();
  db.sets.push({
    key: 'set_seed_sample1',
    title: 'ความรู้พื้นฐานคอมพิวเตอร์ (ตัวอย่าง)',
    courseName: 'ความรู้พื้นฐานคอมพิวเตอร์',
    tagline: 'Sample Question Set',
    desc: 'ชุดข้อสอบตัวอย่างสำหรับทดสอบระบบ ผู้ดูแลระบบสามารถแก้ไขหรือลบชุดนี้ได้ คะแนนเต็มรวม 20 คะแนน',
    examType: 'กลางภาค',
    teacherId: null,
    assignedClasses: [],
    subjectTeacherName: 'อาจารย์ตัวอย่าง',
    subjectTeacherEmail: '',
    sections: {
      mc: {
        title: 'ส่วนที่ 1 — ปรนัย (เลือกตอบ)',
        desc: 'เลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียวในแต่ละข้อ',
        questions: [
          { id: 'mc1', text: 'อุปกรณ์ใดต่อไปนี้ทำหน้าที่เป็นหน่วยประมวลผลกลางของคอมพิวเตอร์?', choices: ['RAM', 'CPU', 'HDD', 'PSU'], answer: 1, points: 2 },
          { id: 'mc2', text: 'ข้อใดคือความหมายของคำว่า "Software"?', choices: ['อุปกรณ์ที่จับต้องได้ของคอมพิวเตอร์', 'ชุดคำสั่งหรือโปรแกรมที่สั่งให้คอมพิวเตอร์ทำงาน', 'สายไฟที่เชื่อมต่ออุปกรณ์', 'จอแสดงผล'], answer: 1, points: 2 },
          { id: 'mc3', text: 'หน่วยความจำชนิดใดที่ข้อมูลจะหายไปเมื่อปิดเครื่อง?', choices: ['ROM', 'RAM', 'Hard Disk', 'Flash Drive'], answer: 1, points: 2 },
          { id: 'mc4', text: 'ระบบปฏิบัติการ (Operating System) มีหน้าที่หลักคืออะไร?', choices: ['จัดการทรัพยากรของเครื่องและเป็นตัวกลางระหว่างผู้ใช้กับฮาร์ดแวร์', 'ต่ออินเทอร์เน็ตเท่านั้น', 'พิมพ์เอกสารเท่านั้น', 'เล่นเกมเท่านั้น'], answer: 0, points: 2 },
          { id: 'mc5', text: 'ข้อใดเป็นตัวอย่างของอุปกรณ์ Input?', choices: ['จอภาพ', 'เครื่องพิมพ์', 'คีย์บอร์ด', 'ลำโพง'], answer: 2, points: 2 }
        ]
      },
      matching: {
        title: 'ส่วนที่ 2 — จับคู่',
        desc: 'คลิกเลือกรายการทางซ้าย แล้วคลิกรายการทางขวาที่สัมพันธ์กัน เพื่อจับคู่',
        left: [{ id: 'l1', text: 'CPU' }, { id: 'l2', text: 'RAM' }, { id: 'l3', text: 'Hard Disk' }, { id: 'l4', text: 'Keyboard' }, { id: 'l5', text: 'Monitor' }],
        right: [{ id: 'r1', text: 'อุปกรณ์แสดงผลภาพ' }, { id: 'r2', text: 'หน่วยประมวลผลกลาง' }, { id: 'r3', text: 'อุปกรณ์รับข้อมูลชนิดปุ่มกด' }, { id: 'r4', text: 'หน่วยความจำสำรองแบบถาวร' }, { id: 'r5', text: 'หน่วยความจำหลักชั่วคราว' }],
        correctMap: { l1: 'r2', l2: 'r5', l3: 'r4', l4: 'r3', l5: 'r1' },
        pointsEach: 1
      },
      written: {
        title: 'ส่วนที่ 3 — อัตนัย (เขียนตอบ)',
        desc: 'ตอบคำถามด้วยคำพูดของตนเองให้ครบถ้วน',
        questions: [
          { id: 'w1', text: 'จงอธิบายความแตกต่างระหว่าง Hardware และ Software พร้อมยกตัวอย่างอย่างละ 2 ชนิด', keywords: ['ฮาร์ดแวร์', 'Hardware', 'ซอฟต์แวร์', 'Software', 'จับต้องได้', 'คำสั่ง', 'โปรแกรม'], maxPoints: 2.5 },
          { id: 'w2', text: 'เพราะเหตุใดคอมพิวเตอร์จึงจำเป็นต้องมีทั้งหน่วยความจำหลัก (RAM) และหน่วยความจำสำรอง (Storage)?', keywords: ['RAM', 'ชั่วคราว', 'ถาวร', 'ความเร็ว', 'เก็บข้อมูล', 'ปิดเครื่อง', 'หาย'], maxPoints: 2.5 }
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
  await writeDB(db);
}
const seedReady = seedIfEmpty();

/* ---------------------------- APP SETUP ---------------------------- */
const app = express();
app.ready = Promise.all([databaseReady, seedReady]);
// Railway sits behind a reverse proxy; trust its first hop so login rate limits use the visitor IP.
app.set('trust proxy', 1);
app.use(applySecurityHeaders);
const runtimeMetrics = createRuntimeMetrics();
const submissionGate = createSubmissionGate();
app.use(runtimeMetrics.middleware);
app.use(express.json({ limit: '2mb' }));

/* ---------------------------- PAGES ---------------------------- */
registerPages(app, PUBLIC_DIR, express);

const assetStorage = createAssetStorage({ url: SUPABASE_URL, serviceRoleKey: SUPABASE_SECRET_KEY, bucket: SUPABASE_STORAGE_BUCKET });
console.log(`Supabase Storage: ${assetStorage.configured ? 'configured' : 'not configured'} (URL: ${SUPABASE_URL ? 'present' : 'missing'}, secret key: ${SUPABASE_SECRET_KEY ? 'present' : 'missing'})`);
registerRoutes(app, { ready: app.ready, ADMIN_KEY, EXAM_TYPES, readDB, writeDB, mutateDB, hashPassword, verifyPassword, requireAdmin, requireTeacher, requireStudent, createTeacherSession, createStudentSession, removeTeacherSessions, teacherSessions, newId, sanitizeSetForStudent, getExamSchedule, hasExamAccess, isPastDeadline, isBeforeStart, gradeMC, gradeMatching, gradeWritten, round2, applyAcademicPeriod, buildResultsWorkbook: buildResultsWorkbookModule, buildGradebookWorkbook, buildQuestionAnalysis, buildQuestionAnalysisWorkbook, assetStorage, runtimeMetrics, submissionGate, googleFormsConfig: { clientId: GOOGLE_FORMS_CLIENT_ID, clientSecret: GOOGLE_FORMS_CLIENT_SECRET, redirectUri: GOOGLE_FORMS_REDIRECT_URI } });

registerFallback(app, PUBLIC_DIR);
registerErrorHandler(app);

if (require.main === module) {
  Promise.all([databaseReady, seedReady])
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(`Exam system backend running at http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin)`);
      });
      registerShutdownSignals(createShutdownHandler({ server, closeDatabase }));
    })
    .catch(error => {
      console.error('Database initialization failed.', error);
      process.exitCode = 1;
    });
}

module.exports = app;
