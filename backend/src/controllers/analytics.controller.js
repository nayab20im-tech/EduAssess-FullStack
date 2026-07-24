const { getStudentAnalytics, getTeacherAnalytics, getAdminAnalytics } = require('../services/analytics.service');

/**
 * @desc    Get Student Dashboard data
 * @route   GET /api/analytics/student
 * @access  Private
 */
const getStudentDashboard = async (req, res, next) => {
  try {
    // If student, check own analytics. If teacher/admin, accept custom studentId in query
    let studentId = req.user.id;
    if ((req.user.role === 'Teacher' || req.user.role === 'Admin') && req.query.studentId) {
      studentId = req.query.studentId;
    }

    const data = await getStudentAnalytics(studentId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Teacher Dashboard data
 * @route   GET /api/analytics/teacher
 * @access  Private/Teacher
 */
const getTeacherDashboard = async (req, res, next) => {
  try {
    const data = await getTeacherAnalytics(req.user.id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Admin System dashboard metrics
 * @route   GET /api/analytics/admin
 * @access  Private/Admin
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await getAdminAnalytics();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard,
  getTeacherDashboard,
  getAdminDashboard
};
