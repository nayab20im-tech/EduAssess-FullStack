const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'short'],
      required: [true, 'Question type is required'],
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    // MCQ fields
    options: {
      type: [String],
      default: undefined,
    },
    correctAnswer: {
      type: String,
      default: null,
    },
    // Short answer fields
    rubric: {
      type: String,
      default: null,
      trim: true,
    },
    hint: {
      type: String,
      default: null,
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.5, 'Marks must be at least 0.5'],
      default: 1,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ quiz: 1 });
questionSchema.index({ type: 1 });

module.exports = mongoose.model('Question', questionSchema);
