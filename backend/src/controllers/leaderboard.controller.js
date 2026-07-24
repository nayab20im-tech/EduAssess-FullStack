const Submission = require('../models/Submission.model');
const User = require('../models/User.model');

/**
 * @desc    Get leaderboard rankings
 * @route   GET /api/leaderboard
 * @access  Private
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const standings = await Submission.aggregate([
      {
        $match: {
          overallStatus: { $in: ['submitted', 'grading', 'fully_graded'] },
          percentage: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$student',
          avgPercentage: { $avg: '$percentage' },
          totalPercentage: { $sum: '$percentage' },
          totalScore: { $sum: '$totalScore' },
          quizzesAttempted: { $sum: 1 },
          quizzesCompleted: {
            $sum: {
              $cond: [{ $eq: ['$overallStatus', 'fully_graded'] }, 1, 0]
            }
          },
          totalWarnings: { $sum: '$warnings' }
        }
      }
    ]);

    const studentIds = standings.map((s) => s._id);
    const studentsById = new Map(
      (await User.find({ _id: { $in: studentIds } }).select('name rollNo department email'))
        .map((s) => [s._id.toString(), s])
    );

    const leaderboard = [];
    for (let i = 0; i < standings.length; i += 1) {
      const standing = standings[i];
      const student = studentsById.get(standing._id.toString());
      if (student) {
        leaderboard.push({
          studentId: student._id,
          name: student.name,
          rollNo: student.rollNo || 'N/A',
          department: student.department || 'N/A',
          avgPercentage: parseFloat(standing.avgPercentage.toFixed(1)),
          totalPercentage: parseFloat(standing.totalPercentage.toFixed(1)),
          totalScore: parseFloat((standing.totalScore || 0).toFixed(1)),
          quizzesAttempted: standing.quizzesAttempted,
          quizzesCompleted: standing.quizzesCompleted,
          warnings: standing.totalWarnings
        });
      }
    }

    const activeStudentIds = new Set(leaderboard.map((l) => l.studentId.toString()));
    const allStudents = await User.find({ role: 'Student', status: 'Active' }).sort({ name: 1 });

    allStudents.forEach((student) => {
      if (!activeStudentIds.has(student._id.toString())) {
        leaderboard.push({
          studentId: student._id,
          name: student.name,
          rollNo: student.rollNo || 'N/A',
          department: student.department || 'N/A',
          avgPercentage: 0.0,
          totalPercentage: 0.0,
          totalScore: 0.0,
          quizzesAttempted: 0,
          quizzesCompleted: 0,
          warnings: 0
        });
      }
    });

    // Rank by Total Score, then Average Score, then Completed Quizzes (per spec)
    leaderboard.sort((a, b) =>
      b.totalScore - a.totalScore
      || b.avgPercentage - a.avgPercentage
      || b.quizzesCompleted - a.quizzesCompleted
      || a.name.localeCompare(b.name)
    );
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaderboard
};
