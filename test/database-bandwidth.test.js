const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'database.js'), 'utf8');

function functionBody(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `missing ${name}`);
  return source.slice(start, end);
}

test('ordinary PostgreSQL writes never download the full database', () => {
  const write = functionBody('writeDB', 'mutateDB');
  const mutate = functionBody('mutateDB', 'mutateExamDraft');
  assert.doesNotMatch(write, /readPostgresDatabase\s*\(/);
  assert.doesNotMatch(mutate, /readPostgresDatabase\s*\(/);
});

test('exam draft autosave performs no PostgreSQL read query', () => {
  const draft = functionBody('mutateExamDraft', 'replaceDB');
  assert.doesNotMatch(draft, /SELECT\s+data\s+FROM\s+exam_drafts/i);
  assert.match(draft, /INSERT INTO exam_drafts/);
});

test('only startup and explicit full restore may read all PostgreSQL tables', () => {
  const calls = [...source.matchAll(/readPostgresDatabase\s*\(/g)].length;
  assert.equal(calls, 3);
});
