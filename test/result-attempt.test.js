const test = require('node:test');
const assert = require('node:assert/strict');
const { resultAttemptKey } = require('../src/result-attempt');

test('normal and resit submissions receive stable distinct attempt keys', () => {
  assert.equal(resultAttemptKey('10001', 'set-a'), '10001::set-a::normal');
  assert.equal(resultAttemptKey('10001', 'set-a', 'resit-1'), '10001::set-a::resit:resit-1');
  assert.notEqual(resultAttemptKey('10001', 'set-a'), resultAttemptKey('10001', 'set-a', 'resit-1'));
});

test('attempt keys require both student and exam identifiers', () => {
  assert.equal(resultAttemptKey('', 'set-a'), null);
  assert.equal(resultAttemptKey('10001', ''), null);
});
