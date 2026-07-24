const crypto = require('crypto');
const Quiz = require('../models/Quiz.model');

const ACCESS_CODE_LENGTH = 8;

const normalizeAccessCode = (value = '') =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const generateCandidate = () =>
  crypto
    .randomBytes(6)
    .toString('base64url')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ACCESS_CODE_LENGTH);

const generateUniqueAccessCode = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateCandidate();
    if (candidate.length !== ACCESS_CODE_LENGTH) continue;

    const exists = await Quiz.exists({ accessCode: candidate });
    if (!exists) return candidate;
  }

  throw new Error('Unable to generate a unique quiz access code. Please try again.');
};

const matchesQuizAccessCode = (quiz, providedCode) =>
  Boolean(
    quiz?.accessCode &&
      normalizeAccessCode(providedCode) === normalizeAccessCode(quiz.accessCode)
  );

const backfillQuizAccessCodes = async () => {
  const quizzes = await Quiz.find({
    $or: [
      { accessCode: { $exists: false } },
      { accessCode: null },
      { accessCode: '' }
    ]
  }).select('_id accessCode evaluationMode');

  for (const quiz of quizzes) {
    quiz.accessCode = await generateUniqueAccessCode();
    if (!quiz.evaluationMode) quiz.evaluationMode = 'teacher_review';
    await quiz.save();
  }

  if (quizzes.length > 0) {
    console.log(`✅ Generated access codes for ${quizzes.length} existing quiz(es).`);
  }
};

module.exports = {
  ACCESS_CODE_LENGTH,
  normalizeAccessCode,
  generateUniqueAccessCode,
  matchesQuizAccessCode,
  backfillQuizAccessCodes
};
