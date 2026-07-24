const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    questionType: {
      type: String,
      enum: ['mcq', 'short'],
      required: true,
    },
    answer: {
      type: String,
      default: '',
    },
    // MCQ grading (auto)
    isCorrect: {
      type: Boolean,
      default: null,
    },
    // Short answer AI grading
    aiScore: {
      type: Number,
      default: null,
    },
    aiConfidence: {
      type: Number,
      default: null,
    },
    aiFeedback: {
      type: String,
      default: null,
    },
    aiMissingConcepts: {
      type: [String],
      default: [],
    },
    // Teacher final grade
    teacherScore: {
      type: Number,
      default: null,
    },
    teacherComment: {
      type: String,
      default: null,
    },
    gradingStatus: {
      type: String,
      enum: ['pending', 'ai_graded', 'teacher_graded'],
      default: 'pending',
    },
    maxMarks: {
      type: Number,
      default: 1,
    },
    // Computed final score (MCQ: 0|marks, Short: teacherScore ?? aiScore)
    finalScore: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    answers: [answerSchema],
    // Quiz session tracking
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    timeTaken: {
      type: Number,
      default: null,
      comment: 'In seconds',
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    // Proctoring
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    warnings: {
      type: Number,
      default: 0,
    },
    suspiciousFlags: {
      type: [String],
      default: [],
    },
    // Grading
    totalScore: {
      type: Number,
      default: null,
    },
    maxScore: {
      type: Number,
      default: null,
    },
    percentage: {
      type: Number,
      default: null,
    },
    overallStatus: {
      type: String,
      enum: ['in_progress', 'submitted', 'grading', 'fully_graded'],
      default: 'in_progress',
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    // AI overall feedback
    aiFeedbackSummary: {
      type: String,
      default: null,
    },
    // Teacher overall feedback
    teacherFeedback: {
      type: String,
      default: null,
    },
    resultEmailSentAt: {
      type: Date,
      default: null,
    },
    resultEmailSentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resultEmailMessageId: {
      type: String,
      default: null,
    },
    // File attachments (for essay-type submissions)
    attachments: [
      {
        filename: String,
        url: String,
        publicId: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate submissions (same student + quiz + attempt number)
submissionSchema.index({ student: 1, quiz: 1, attemptNumber: 1 }, { unique: true });
submissionSchema.index({ quiz: 1 });
submissionSchema.index({ student: 1 });
submissionSchema.index({ overallStatus: 1 });
submissionSchema.index({ submittedAt: -1 });
submissionSchema.index({ 'answers.gradingStatus': 1 });

module.exports = mongoose.model('Submission', submissionSchema);
