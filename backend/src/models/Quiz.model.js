const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    timeLimit: {
      type: Number,
      required: [true, 'Time limit is required'],
      min: [1, 'Time limit must be at least 1 minute'],
      comment: 'In minutes',
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    allowedAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    accessCode: {
      type: String,
      required: [true, 'Quiz access code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [6, 'Access code must contain at least 6 characters'],
      maxlength: [12, 'Access code cannot exceed 12 characters'],
    },
    evaluationMode: {
      type: String,
      enum: ['automatic', 'teacher_review'],
      default: 'teacher_review',
    },
    targetStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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

quizSchema.index({ createdBy: 1 });
quizSchema.index({ status: 1 });
quizSchema.index({ subject: 1 });
quizSchema.index({ createdAt: -1 });
quizSchema.index({ expiresAt: 1 });
quizSchema.index({ evaluationMode: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
