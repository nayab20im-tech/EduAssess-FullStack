const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,

      enum: [
        'quiz_published',
        'quiz_graded',
        'feedback_received',
        'feedback',
        'account_status_changed',
        'new_user_created',
        'quiz_submitted',

        // AI and teacher evaluation notifications
        'ai_grading_completed',
        'manual_grading_pending',
        'teacher_comment',
        'result_email_sent',

        'general'
      ],

      default: 'general'
    },

    isRead: {
      type: Boolean,
      default: false
    },

    relatedQuiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null
    },

    relatedSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null
    },

    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    actionUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({
  recipient: 1,
  isRead: 1
});

notificationSchema.index({
  recipient: 1,
  createdAt: -1
});

notificationSchema.index({
  createdAt: -1
});

module.exports = mongoose.model(
  'Notification',
  notificationSchema
);