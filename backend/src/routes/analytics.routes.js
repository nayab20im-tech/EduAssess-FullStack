const express = require('express');
const router = express.Router();
const { getStudentDashboard, getTeacherDashboard, getAdminDashboard } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(protect);

router.get('/student', getStudentDashboard);
router.get('/teacher', requireRole('Teacher', 'Admin'), getTeacherDashboard);
router.get('/admin', requireRole('Admin'), getAdminDashboard);

module.exports = router;
