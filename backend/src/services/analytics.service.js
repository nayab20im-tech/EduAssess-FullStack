const mongoose = require('mongoose');
const os = require('os');
const Submission = require('../models/Submission.model');
const Quiz = require('../models/Quiz.model');
const User = require('../models/User.model');
const Subject = require('../models/Subject.model');
const ActivityLog = require('../models/ActivityLog.model');

/**
 * Get student dashboard analytics
 * @param {string} studentId 
 * @returns {Promise<Object>}
 */
const getStudentAnalytics = async (studentId) => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const student = await User.findById(studentObjectId).select('assignedModules');

  const enrolledSubjects = await Subject.find({ isActive: true, enrolledStudents: studentObjectId }).select('_id');
  const subjectIds = [...new Set([...(student?.assignedModules || []).map((id) => id.toString()), ...enrolledSubjects.map((s) => s._id.toString())])].map((id) => new mongoose.Types.ObjectId(id));

  const availableQuizFilter = {
    status: 'published',
    $or: [
      { targetStudents: studentObjectId },
      ...(subjectIds.length ? [{ subject: { $in: subjectIds } }] : [])
    ]
  };

  const quizzesAvailable = await Quiz.countDocuments(availableQuizFilter);
  const studentSubmissions = await Submission.find({ student: studentObjectId }).select('quiz overallStatus percentage submittedAt warnings totalScore maxScore teacherFeedback').populate('quiz', 'title');

  const quizzesAttempted = studentSubmissions.filter((sub) => ['submitted', 'grading', 'fully_graded'].includes(sub.overallStatus)).length;
  const quizzesCompleted = studentSubmissions.filter((sub) => sub.overallStatus === 'fully_graded').length;
  const highestScore = studentSubmissions.reduce((max, sub) => Math.max(max, sub.percentage ?? 0), 0);
  const avgScore = studentSubmissions.length > 0
    ? parseFloat((studentSubmissions.reduce((sum, sub) => sum + (sub.percentage || 0), 0) / studentSubmissions.length).toFixed(1))
    : 0;

  const attemptedQuizIds = studentSubmissions.map((sub) => sub.quiz?._id?.toString()).filter(Boolean);
  const pendingQuizzes = await Quiz.countDocuments({
    ...availableQuizFilter,
    _id: { $nin: attemptedQuizIds }
  });

  const scoreRanking = await Submission.aggregate([
    { $match: { overallStatus: { $in: ['submitted', 'grading', 'fully_graded'] }, percentage: { $ne: null } } },
    { $group: { _id: '$student', avgPercentage: { $avg: '$percentage' } } },
    { $sort: { avgPercentage: -1 } }
  ]);

  const rankIndex = scoreRanking.findIndex((r) => r._id.toString() === studentId);
  const currentRank = rankIndex !== -1 ? rankIndex + 1 : scoreRanking.length + 1;

  const recentGrades = studentSubmissions
    .filter((sub) => sub.submittedAt)
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .slice(0, 5)
    .map((sub) => ({
      submissionId: sub._id,
      quizTitle: sub.quiz?.title || 'Untitled Quiz',
      percentage: sub.percentage ?? 0,
      status: sub.overallStatus,
      feedback: sub.teacherFeedback || '',
      submittedAt: sub.submittedAt
    }));

  const subjectBreakdown = await Submission.aggregate([
    { $match: { student: studentObjectId, overallStatus: { $in: ['submitted', 'grading', 'fully_graded'] }, percentage: { $ne: null } } },
    { $lookup: { from: 'quizzes', localField: 'quiz', foreignField: '_id', as: 'quizInfo' } },
    { $unwind: '$quizInfo' },
    { $group: { _id: '$quizInfo.subject', avgPercentage: { $avg: '$percentage' } } }
  ]);

  const subjectData = [];
  const colors = ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];
  for (let i = 0; i < subjectBreakdown.length; i += 1) {
    const stat = subjectBreakdown[i];
    if (stat._id) {
      const subject = await Subject.findById(stat._id).select('name');
      if (subject) {
        subjectData.push({
          name: subject.name,
          value: parseFloat(stat.avgPercentage.toFixed(1)),
          color: colors[i % colors.length]
        });
      }
    }
  }

  return {
    stats: {
      quizzesAvailable,
      quizzesAttempted,
      quizzesCompleted,
      averageScore: avgScore,
      highestScore,
      currentRank,
      pendingQuizzes
    },
    performanceData: studentSubmissions.length > 0
      ? studentSubmissions
          .filter((sub) => sub.submittedAt && sub.percentage !== null)
          .sort((a, b) => a.submittedAt - b.submittedAt)
          .map((sub) => ({ name: sub.submittedAt.toLocaleDateString(), score: sub.percentage }))
      : [{ name: 'No Data', score: 0 }],
    subjectData: subjectData.length > 0 ? subjectData : [{ name: 'No Data', value: 0, color: '#6b7280' }],
    recentGrades,
    pendingQuizzesList: pendingQuizzes
  };
};


/**
 * Get teacher dashboard analytics
 * @param {string} teacherId 
 * @returns {Promise<Object>}
 */
const getTeacherAnalytics = async (teacherId) => {
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

  const subjects = await Subject.find({ teacherId: teacherObjectId }).select('enrolledStudents');
  const subjectIds = subjects.map((s) => s._id);
  const studentIds = [...new Set(subjects.flatMap((sub) => (sub.enrolledStudents || []).map((id) => id.toString())))];

  const quizzes = await Quiz.find({ createdBy: teacherObjectId }).select('_id status totalMarks subject title publishedAt');
  const quizIds = quizzes.map((quiz) => quiz._id);
  const totalQuizzes = quizIds.length;
  const publishedQuizzes = await Quiz.countDocuments({ createdBy: teacherObjectId, status: 'published' });

  const pendingEvaluations = await Submission.countDocuments({
    quiz: { $in: quizIds },
    overallStatus: { $in: ['grading', 'submitted'] },
    'answers.questionType': 'short',
    'answers.gradingStatus': { $in: ['pending', 'ai_graded'] }
  });

  const completedEvaluations = await Submission.countDocuments({
    quiz: { $in: quizIds },
    overallStatus: 'fully_graded'
  });

  const scoreResults = await Submission.aggregate([
    { $match: { quiz: { $in: quizIds }, overallStatus: { $in: ['grading', 'submitted', 'fully_graded'] }, percentage: { $ne: null } } },
    {
      $group: {
        _id: null,
        avgPercentage: { $avg: '$percentage' },
        totalScore: { $sum: '$totalScore' }
      }
    }
  ]);

  const averageStudentScore = scoreResults.length > 0 ? parseFloat(scoreResults[0].avgPercentage.toFixed(1)) : 0;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeStudentsCount = await Submission.distinct('student', {
    quiz: { $in: quizIds },
    submittedAt: { $gte: thirtyDaysAgo }
  }).then((list) => list.length);

  const recentQuizActivity = await Submission.find({ quiz: { $in: quizIds } })
    .populate('student', 'name rollNo')
    .populate('quiz', 'title')
    .sort({ submittedAt: -1 })
    .limit(6);

  const recentActivities = recentQuizActivity.map((submission) => ({
    studentName: submission.student?.name || 'Unknown',
    rollNo: submission.student?.rollNo || 'N/A',
    quizTitle: submission.quiz?.title || 'Deleted Quiz',
    percentage: submission.percentage ?? 0,
    status: submission.overallStatus,
    submittedAt: submission.submittedAt
  }));

  return {
    stats: {
      totalStudents: studentIds.length,
      totalQuizzes,
      publishedQuizzes,
      pendingEvaluations,
      completedEvaluations,
      averageStudentScore,
      activeStudents: activeStudentsCount
    },
    recentQuizActivity: recentActivities
  };
};

/**
 * Get admin system orchestration analytics
 * @returns {Promise<Object>}
 */
const getAdminAnalytics = async () => {
  // Total user counts
  const totalStudents = await User.countDocuments({ role: 'Student' });
  const totalTeachers = await User.countDocuments({ role: 'Teacher' });
  const totalAdmins = await User.countDocuments({ role: 'Admin' });

  // Get active proctoring instances / monitoring sessions
  // Active means an ActivityLog is quiz-related, updated in the last 5 minutes, and monitoringStatus !== 'completed'
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const activeMonitoringInstances = await ActivityLog.countDocuments({
    isQuizSession: true,
    updatedAt: { $gte: fiveMinsAgo },
    monitoringStatus: { $in: ['active', 'warning', 'critical'] }
  });

  // Average tab switches in active proctoring sessions (real, from ActivityLog).
  const activeSessions = await ActivityLog.find({
    isQuizSession: true,
    updatedAt: { $gte: fiveMinsAgo }
  });
  
  const totalSwitches = activeSessions.reduce((acc, sess) => acc + sess.tabSwitchCount, 0);
  const averageSwitches = activeSessions.length > 0 ? (totalSwitches / activeSessions.length).toFixed(1) : 0;

  // Real system load: 1-minute load average as a percentage of available CPU cores.
  const cpuCount = os.cpus()?.length || 1;
  const [loadAvg1Min] = os.loadavg();
  const systemLoad = Math.min((loadAvg1Min / cpuCount) * 100, 100);

  // Real latency: measure an actual DB round-trip (ping) against MongoDB.
  const latencyStart = Date.now();
  await mongoose.connection.db.admin().ping();
  const systemLatency = Date.now() - latencyStart;

  return {
    stats: {
      activeInstances: `${activeMonitoringInstances} / ${totalStudents}`,
      latency: `${systemLatency}ms`,
      systemLoad: `${systemLoad.toFixed(1)}%`,
      counts: {
        students: totalStudents,
        teachers: totalTeachers,
        admins: totalAdmins
      }
    }
  };
};

module.exports = {
  getStudentAnalytics,
  getTeacherAnalytics,
  getAdminAnalytics
};
