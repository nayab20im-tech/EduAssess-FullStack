const express = require('express');
const router = express.Router();
const { startQuizSession, updateQuizSession, endQuizSession, getLiveMonitoring } = require('../controllers/activityLog.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(protect);

router.post('/start', startQuizSession);
router.put('/update', updateQuizSession);
router.post('/end', endQuizSession);
router.get('/live', requireRole('Teacher', 'Admin'), getLiveMonitoring);

module.exports = router;
