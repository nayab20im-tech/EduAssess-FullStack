const express = require('express');
const router = express.Router();
const { getSubjects, getSubjectById, getTeacherSubjects, createSubject, updateSubject, deleteSubject } = require('../controllers/subject.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(protect);

router.get('/teacher/me', requireRole('Teacher'), getTeacherSubjects);

router.route('/')
  .get(getSubjects)
  .post(requireRole('Admin'), createSubject);

router.route('/:id')
  .get(getSubjectById)
  .put(requireRole('Admin'), updateSubject)
  .delete(requireRole('Admin'), deleteSubject);

module.exports = router;
