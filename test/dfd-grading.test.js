const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { gradeDfdLevel } = require('../src/dfd-grader');

function loadGrader() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'object-analysis-design.html'), 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const questionBank = source
    .slice(source.indexOf('const QUESTIONS'), source.indexOf('const LEVEL_TITLES'))
    .replace('const QUESTIONS', 'var QUESTIONS');
  const grading = source.slice(source.indexOf('function gradeDiagram'), source.indexOf('/* ============ EXPORT RENDERING'));
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${questionBank}; var app={questionKey:'coffee',level:0}; function currentQuestion(){return QUESTIONS[app.questionKey]} function currentLevelData(){return currentQuestion().levels[app.level]} ${grading}`, context);
  return context;
}

test('DFD grader awards 100 for each complete reference diagram', () => {
  const grader = loadGrader();
  for (const level of [0, 1, 2]) {
    grader.app.level = level;
    const expected = grader.QUESTIONS.coffee.levels[level];
    const result = grader.gradeDiagram(
      expected.shapes.map(shape => ({ ...shape })),
      expected.connections.map(connection => ({ fromId: connection.from, toId: connection.to }))
    );
    assert.equal(result.total, 100, `Level ${level}: ${JSON.stringify(result.breakdown)}`);
  }
});

test('DFD grader awards zero for a blank diagram', () => {
  const grader = loadGrader();
  for (const level of [0, 1, 2]) {
    grader.app.level = level;
    assert.equal(grader.gradeDiagram([], []).total, 0, `Level ${level}`);
  }
});

test('server recalculates the same DFD scores as the reference diagrams', () => {
  const grader = loadGrader();
  for (const level of [0, 1, 2]) {
    const expected = grader.QUESTIONS.coffee.levels[level];
    const result = gradeDfdLevel(
      level,
      expected.shapes.map(shape => ({ ...shape })),
      expected.connections.map(connection => ({ fromId: connection.from, toId: connection.to }))
    );
    assert.equal(result.total, 100, `Level ${level}: ${JSON.stringify(result.breakdown)}`);
    assert.equal(gradeDfdLevel(level, [], []).total, 0, `Level ${level}: blank diagram`);
  }
});
