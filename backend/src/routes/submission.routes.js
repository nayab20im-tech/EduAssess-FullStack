const express = require('express');
const router = express.Router();
const {
  submitQuiz,
  getMySubmissions,
  getSubmissionById,
  getPendingEvaluations,
  getCompletedEvaluations,
  gradeSubmission,
  exportSubmissionGrades,
  getQuizSubmissions,
  downloadSubmissionReport,
  downloadTeacherReport,
  emailSubmissionResult
} = require('../controllers/submission.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(protect);

router.post('/', requireRole('Student'), submitQuiz);
router.get('/my', requireRole('Student'), getMySubmissions);
router.get('/pending', requireRole('Teacher', 'Admin'), getPendingEvaluations);
router.get('/completed', requireRole('Teacher', 'Admin'), getCompletedEvaluations);
router.get('/export', requireRole('Teacher', 'Admin'), exportSubmissionGrades);
router.get('/reports/teacher', requireRole('Teacher', 'Admin'), downloadTeacherReport);
router.get('/quiz/:quizId', requireRole('Teacher', 'Admin'), getQuizSubmissions);
router.get('/:id/report', downloadSubmissionReport);
router.post('/:id/email-result', requireRole('Teacher', 'Admin'), emailSubmissionResult);
router.get('/:id', getSubmissionById);
router.put('/:id/grade', requireRole('Teacher', 'Admin'), gradeSubmission);

module.exports = router;
