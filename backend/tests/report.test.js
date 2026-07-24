const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSubmissionReportPdf,
  buildTeacherReportPdf
} = require('../src/services/report.service');

const questionId = { toString: () => 'question-1' };
const submission = {
  student: { name: 'Student One', rollNo: '231', email: 'student@example.com' },
  quiz: {
    title: 'Sample Assessment',
    category: 'Testing',
    totalMarks: 5,
    questions: [{ _id: questionId, text: 'Explain testing.', marks: 5 }]
  },
  answers: [
    {
      question: questionId,
      questionType: 'short',
      answer: 'Testing verifies expected behavior.',
      finalScore: 4,
      maxMarks: 5,
      aiFeedback: 'Good answer.'
    }
  ],
  submittedAt: new Date('2026-07-23T10:00:00Z'),
  timeTaken: 90,
  totalScore: 4,
  maxScore: 5,
  percentage: 80,
  overallStatus: 'fully_graded'
};

test('creates a valid-looking student PDF buffer', () => {
  const pdf = buildSubmissionReportPdf(submission);
  assert.equal(Buffer.isBuffer(pdf), true);
  assert.equal(pdf.subarray(0, 8).toString('binary'), '%PDF-1.4');
  assert.ok(pdf.length > 500);
});

test('creates a valid-looking teacher PDF buffer', () => {
  const pdf = buildTeacherReportPdf({ teacherName: 'Teacher One', submissions: [submission] });
  assert.equal(Buffer.isBuffer(pdf), true);
  assert.equal(pdf.subarray(0, 8).toString('binary'), '%PDF-1.4');
  assert.ok(pdf.length > 500);
});
