const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'teacher-main.js'), 'utf8');

test('teacher exam list matches admin schedule ordering and statuses', () => {
  assert.match(source, /sort\(\(a,b\)=>examOpenTimestamp\(a\)-examOpenTimestamp\(b\)/);
  assert.match(source, /function examOpenDateLabel\(/);
  assert.match(source, /function examScheduleStatus\(/);
  for (const label of ['ยังไม่สอบ', 'กำลังสอบ', 'สอบแล้ว']) assert.match(source, new RegExp(label));
  assert.match(source, /exam-date-pill/);
  assert.match(source, /exam-status-pill/);
});

test('teacher results retain the same grouped subject presentation as admin', () => {
  assert.match(source, /function renderResultGroups\(/);
  assert.match(source, /data-publish-set=/);
  assert.match(source, /function resultScoreColumns\(/);
  assert.match(source, /class="result-row-actions"/);
});
