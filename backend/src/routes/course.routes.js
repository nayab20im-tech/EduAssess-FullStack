const express = require('express');
const router = express.Router();
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse } = require('../controllers/course.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(protect);

router.route('/')
  .get(getCourses)
  .post(requireRole('Admin'), createCourse);

router.route('/:id')
  .get(getCourseById)
  .put(requireRole('Admin'), updateCourse)
  .delete(requireRole('Admin'), deleteCourse);

module.exports = router;
