const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, toggleUserStatus, deleteUser } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Apply protection and Admin requirement to all user routes
router.use(protect);
router.use(requireRole('Admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/status', toggleUserStatus);

module.exports = router;
