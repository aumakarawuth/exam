const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadQuestionBank() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'object-analysis-design-main.js'), 'utf8');
  const start = source.indexOf('const QUESTIONS =');
  const end = source.indexOf('const LEVEL_TITLES');
  if (start < 0 || end < 0) throw new Error('Unable to load DFD answer key');
  const context = {};
  vm.runInNewContext(source.slice(start, end).replace('const QUESTIONS', 'var QUESTIONS'), context);
  return context.QUESTIONS;
}

const QUESTIONS = loadQuestionBank();

function gradeDfdLevel(level, submittedShapes, submittedConnections) {
  const answerKey = QUESTIONS.coffee?.levels?.[level];
  if (!answerKey) throw new Error(`Unknown DFD level: ${level}`);
  const shapes = Array.isArray(submittedShapes) ? submittedShapes : [];
  const connections = Array.isArray(submittedConnections) ? submittedConnections : [];
  const processes = shapes.filter(shape => shape.type === 'process');
  const entities = shapes.filter(shape => shape.type === 'entity');
  const stores = shapes.filter(shape => shape.type === 'store');
  const expectedProcesses = answerKey.shapes.filter(shape => shape.type === 'process');
  const expectedStores = answerKey.shapes.filter(shape => shape.type === 'store');
  const expectedEntityKeys = answerKey.shapes.filter(shape => shape.type === 'entity').map(shape => shape.label);
  const expectedConnections = answerKey.connections;

  let processScore = processes.length === expectedProcesses.length ? 5 : (processes.length ? 2 : 0);
  let inOutOk = 0;
  for (const process of processes) {
    const expected = expectedProcesses.find(item => item.num && item.num === process.num);
    const needsIn = !expected || expectedConnections.some(connection => connection.to === expected.id);
    const needsOut = !expected || expectedConnections.some(connection => connection.from === expected.id);
    const hasIn = connections.some(connection => connection.toId === process.id);
    const hasOut = connections.some(connection => connection.fromId === process.id);
    if ((!needsIn || hasIn) && (!needsOut || hasOut)) inOutOk++;
  }
  processScore += processes.length ? Math.round(inOutOk / processes.length * 15) : 0;

  const matchedKeywords = expectedEntityKeys.filter(keyword => entities.some(entity => String(entity.label || '').includes(keyword)));
  const entityScore = Math.round(matchedKeywords.length / expectedEntityKeys.length * 10);
  let storeScore;
  if (!shapes.length) storeScore = 0;
  else if (!expectedStores.length) storeScore = stores.length === 0 ? 10 : Math.max(0, 10 - stores.length * 5);
  else storeScore = Math.max(0, 10 - Math.abs(stores.length - expectedStores.length) * 5);

  const entityIds = new Set(entities.map(shape => shape.id));
  const storeIds = new Set(stores.map(shape => shape.id));
  let violations = 0;
  for (const connection of connections) {
    if (entityIds.has(connection.fromId) && entityIds.has(connection.toId)) violations++;
    if ((entityIds.has(connection.fromId) && storeIds.has(connection.toId)) || (storeIds.has(connection.fromId) && entityIds.has(connection.toId))) violations++;
    if (storeIds.has(connection.fromId) && storeIds.has(connection.toId)) violations++;
  }
  let structureScore = 0;
  if (connections.length) {
    const coverage = expectedConnections.length ? Math.min(1, connections.length / expectedConnections.length) : 1;
    structureScore = Math.min(30, Math.round(coverage * 15) + Math.max(0, 15 - violations * 7));
  }

  const labelOf = id => {
    const shape = shapes.find(item => item.id === id);
    if (!shape) return '';
    if (shape.type === 'process' || shape.type === 'store') return shape.num || shape.label || '';
    return expectedEntityKeys.find(keyword => String(shape.label || '').includes(keyword)) || shape.label || '';
  };
  let flowScore = 0;
  const perFlow = 25 / expectedConnections.length;
  for (const expected of expectedConnections) {
    const match = connections.find(connection => labelOf(connection.fromId) === expected.keyFrom && labelOf(connection.toId) === expected.keyTo);
    const reverse = !match && connections.find(connection => labelOf(connection.fromId) === expected.keyTo && labelOf(connection.toId) === expected.keyFrom);
    if (match) flowScore += perFlow;
    else if (reverse) flowScore += perFlow * 0.5;
  }
  flowScore = Math.round(flowScore);

  const properlyNumbered = processes.filter(process => level === 0 ? process.num === '0' : /^\d+(\.\d+)?$/.test(process.num || ''));
  let namingScore = processes.length ? Math.round(properlyNumbered.length / processes.length * 3) : 0;
  const namedProperly = shapes.filter(shape => shape.label && !['Entity', 'Process', 'Data Store'].includes(shape.label)).length;
  namingScore += Math.min(2, shapes.length ? Math.round(namedProperly / shapes.length * 2) : 0);
  namingScore = Math.min(5, namingScore);

  const total = Math.min(100, Math.round(processScore + entityScore + storeScore + structureScore + flowScore + namingScore));
  return { total, breakdown: { structure: { score: structureScore, max: 30 }, dataflow: { score: flowScore, max: 25 }, process: { score: processScore, max: 20 }, datastore: { score: storeScore, max: 10 }, entity: { score: entityScore, max: 10 }, naming: { score: namingScore, max: 5 } } };
}

module.exports = { gradeDfdLevel };
