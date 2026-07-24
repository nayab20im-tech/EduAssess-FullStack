const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
    },
    loginTime: {
      type: Date,
      default: null,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    sessionDuration: {
      type: Number,
      default: null,
      comment: 'In seconds',
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    warnings: {
      type: Number,
      default: 0,
    },
    suspiciousActivity: {
      type: [String],
      default: [],
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    isQuizSession: {
      type: Boolean,
      default: false,
    },
    // Live monitoring status
    monitoringStatus: {
      type: String,
      enum: ['active', 'warning', 'critical', 'disconnected', 'completed'],
      default: 'active',
    },
    currentActivity: {
      type: String,
      default: 'Idle',
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ submissionId: 1 });
activityLogSchema.index({ quizId: 1 });
activityLogSchema.index({ loginTime: -1 });
activityLogSchema.index({ monitoringStatus: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
