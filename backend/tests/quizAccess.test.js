const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAccessCode,
  matchesQuizAccessCode
} = require('../src/services/quizAccess.service');

test('normalizes quiz access codes consistently', () => {
  assert.equal(normalizeAccessCode(' ab-12 cd '), 'AB12CD');
});

test('matches access codes without case or separator differences', () => {
  assert.equal(matchesQuizAccessCode({ accessCode: 'AB12CD34' }, 'ab-12-cd-34'), true);
  assert.equal(matchesQuizAccessCode({ accessCode: 'AB12CD34' }, 'wrong'), false);
});
