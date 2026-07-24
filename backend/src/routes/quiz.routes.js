const express = require('express');
const router = express.Router();
const {
  getQuizzes,
  getQuizById,
  findQuizByAccessCode,
  accessQuiz,
  regenerateQuizAccessCode,
  createQuiz,
  updateQuiz,
  publishQuiz,
  deleteQuiz,
  generateQuizQuestionsWithAI,
  uploadQuizAttachment,
  importQuizFile
} = require('../controllers/quiz.controller');
const { upload } = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(protect);

router
  .route('/')
  .get(getQuizzes)
  .post(requireRole('Teacher', 'Admin'), createQuiz);

router.post(
  '/generate-ai',
  requireRole('Teacher', 'Admin'),
  generateQuizQuestionsWithAI
);
router.post(
  '/upload',
  requireRole('Teacher', 'Admin'),
  upload.single('attachment'),
  uploadQuizAttachment
);
router.post(
  '/import',
  requireRole('Teacher', 'Admin'),
  upload.single('file'),
  importQuizFile
);

router.post(
  '/access/by-code',
  requireRole('Student'),
  findQuizByAccessCode
);
router.post(
  '/:id/access',
  requireRole('Student'),
  accessQuiz
);
router.patch(
  '/:id/access-code/regenerate',
  requireRole('Teacher', 'Admin'),
  regenerateQuizAccessCode
);

router
  .route('/:id')
  .get(getQuizById)
  .put(requireRole('Teacher', 'Admin'), updateQuiz)
  .delete(requireRole('Teacher', 'Admin'), deleteQuiz);

router.patch('/:id/publish', requireRole('Teacher', 'Admin'), publishQuiz);

module.exports = router;
