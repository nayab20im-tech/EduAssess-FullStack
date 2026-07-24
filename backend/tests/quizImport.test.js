const test = require('node:test');
const assert = require('node:assert/strict');
const { parseQuizImport } = require('../src/utils/quizImport');

test('parses JSON quiz imports into a normalized quiz payload', () => {
  const payload = {
    title: 'Sample Quiz',
    category: 'Midterm',
    timeLimit: 30,
    subject: 'DBMS',
    questions: [
      { type: 'mcq', text: 'What is SQL?', options: ['Language', 'Database'], answer: 'Language', marks: 1 },
      { type: 'short', text: 'Explain normalization', rubric: 'Mention first normal form', marks: 5 }
    ]
  };

  const result = parseQuizImport(payload, 'sample.json');

  assert.equal(result.title, 'Sample Quiz');
  assert.equal(result.category, 'Midterm');
  assert.equal(result.timeLimit, 30);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].type, 'mcq');
  assert.equal(result.questions[1].type, 'short');
});

test('parses CSV quiz imports into a normalized quiz payload', () => {
  const csv = [
    'title,category,timeLimit,questionType,questionText,options,correctAnswer,marks,rubric,hint',
    'Imported Quiz,Midterm,20,mcq,What is a primary key?,"Key,Identifier",Identifier,1,,',
    'Imported Quiz,Midterm,20,short,Explain indexing,, ,5,Discuss performance benefits,'
  ].join('\n');

  const result = parseQuizImport(csv, 'import.csv');

  assert.equal(result.title, 'Imported Quiz');
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].type, 'mcq');
  assert.equal(result.questions[1].type, 'short');
  assert.equal(result.questions[0].options.length, 2);
});
