const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../src/auth');

test('password hashes verify only the original password', () => {
  const hash = hashPassword('correct-password');
  assert.notEqual(hash, 'correct-password');
  assert.equal(verifyPassword('correct-password', hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
});
