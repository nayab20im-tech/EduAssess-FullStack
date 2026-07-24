const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboard.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getLeaderboard);

module.exports = router;
