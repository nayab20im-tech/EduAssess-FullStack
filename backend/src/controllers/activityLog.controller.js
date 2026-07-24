const ActivityLog = require('../models/ActivityLog.model');
const Submission = require('../models/Submission.model');
const Quiz = require('../models/Quiz.model');

/**
 * @desc    Start a quiz proctoring session
 * @route   POST /api/activity/start
 * @access  Private
 */
const startQuizSession = async (req, res, next) => {
  try {
    const { quizId, submissionId } = req.body;

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID is required'
      });
    }

    // Create a new activity log for this quiz session
    const log = new ActivityLog({
      userId: req.user.id,
      quizId,
      submissionId: submissionId || null,
      loginTime: new Date(),
      isQuizSession: true,
      monitoringStatus: 'active',
      currentActivity: 'Started Quiz',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    });

    await log.save();

    res.status(201).json({
      success: true,
      message: 'Proctoring session started',
      log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update proctoring activities (tab switch, warning, etc.)
 * @route   PUT /api/activity/update
 * @access  Private
 */
const updateQuizSession = async (req, res, next) => {
  try {
    const { quizId, tabSwitchCount, warnings, suspiciousActivity, monitoringStatus, currentActivity } = req.body;

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID is required'
      });
    }

    // Find the latest active quiz session log for this student
    const log = await ActivityLog.findOne({
      userId: req.user.id,
      quizId,
      isQuizSession: true
    }).sort({ createdAt: -1 });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Active proctoring log not found'
      });
    }

    // Update log metrics
    if (tabSwitchCount !== undefined) log.tabSwitchCount = tabSwitchCount;
    if (warnings !== undefined) log.warnings = warnings;
    if (monitoringStatus) log.monitoringStatus = monitoringStatus;
    if (currentActivity) log.currentActivity = currentActivity;
    
    if (suspiciousActivity) {
      log.suspiciousActivity.push(suspiciousActivity);
    }

    await log.save();

    // Sync with corresponding Submission if exists
    if (log.submissionId) {
      await Submission.findByIdAndUpdate(log.submissionId, {
        $set: {
          tabSwitchCount: log.tabSwitchCount,
          warnings: log.warnings
        },
        $addToSet: {
          suspiciousFlags: suspiciousActivity || []
        }
      });
    }

    res.status(200).json({
      success: true,
      log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End a proctoring session (e.g. on submit or quit)
 * @route   POST /api/activity/end
 * @access  Private
 */
const endQuizSession = async (req, res, next) => {
  try {
    const { quizId } = req.body;

    const log = await ActivityLog.findOne({
      userId: req.user.id,
      quizId,
      isQuizSession: true
    }).sort({ createdAt: -1 });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Active proctoring log not found'
      });
    }

    log.logoutTime = new Date();
    log.monitoringStatus = 'completed';
    log.currentActivity = 'Quiz Submitted';
    
    if (log.loginTime) {
      log.sessionDuration = Math.round((log.logoutTime.getTime() - log.loginTime.getTime()) / 1000);
    }

    await log.save();

    res.status(200).json({
      success: true,
      message: 'Proctoring session ended',
      log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live monitoring data (Teacher)
 * @route   GET /api/activity/live
 * @access  Private/Teacher
 */
const getLiveMonitoring = async (req, res, next) => {
  try {
    const quizFilter = req.user.role === 'Admin' ? {} : { createdBy: req.user.id };
    const teacherQuizzes = await Quiz.find(quizFilter).select('_id title evaluationMode');
    const quizIds = teacherQuizzes.map((quiz) => quiz._id);

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    const logs = await ActivityLog.find({
      quizId: { $in: quizIds },
      isQuizSession: true,
      updatedAt: { $gte: fifteenMinsAgo },
      monitoringStatus: { $ne: 'completed' }
    })
      .populate('userId', 'name rollNo department')
      .populate('quizId', 'title totalMarks evaluationMode')
      .sort({ updatedAt: -1 });

    const liveData = logs.map((log) => ({
      _id: log._id,
      studentId: log.userId?._id || null,
      studentName: log.userId?.name || 'Unknown Student',
      rollNo: log.userId?.rollNo || 'N/A',
      department: log.userId?.department || 'N/A',
      quizTitle: log.quizId?.title || 'Deleted Assessment',
      evaluationMode: log.quizId?.evaluationMode || 'teacher_review',
      warnings: log.warnings,
      tabSwitches: log.tabSwitchCount,
      suspiciousActivity: log.suspiciousActivity,
      status: log.monitoringStatus,
      activity: log.currentActivity,
      lastUpdated: log.updatedAt
    }));

    const recentEvaluations = await Submission.find({
      quiz: { $in: quizIds },
      submittedAt: { $gte: fifteenMinsAgo }
    })
      .populate('student', 'name rollNo')
      .populate('quiz', 'title evaluationMode totalMarks')
      .sort({ submittedAt: -1 })
      .limit(20);

    const evaluationData = recentEvaluations.map((submission) => ({
      _id: submission._id,
      studentName: submission.student?.name || 'Unknown Student',
      rollNo: submission.student?.rollNo || 'N/A',
      quizTitle: submission.quiz?.title || 'Deleted Assessment',
      evaluationMode: submission.quiz?.evaluationMode || 'teacher_review',
      totalScore: submission.totalScore ?? 0,
      maxScore: submission.maxScore ?? submission.quiz?.totalMarks ?? 0,
      percentage: submission.percentage ?? 0,
      overallStatus: submission.overallStatus,
      submittedAt: submission.submittedAt,
      aiEvaluatedAnswers: (submission.answers || []).filter(
        (answer) => answer.questionType === 'short' && answer.aiScore !== null
      ).length,
      teacherOverrides: (submission.answers || []).filter(
        (answer) => answer.questionType === 'short' && answer.teacherScore !== null
      ).length
    }));

    return res.status(200).json({
      success: true,
      count: liveData.length,
      liveData,
      recentEvaluations: evaluationData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startQuizSession,
  updateQuizSession,
  endQuizSession,
  getLiveMonitoring
};
