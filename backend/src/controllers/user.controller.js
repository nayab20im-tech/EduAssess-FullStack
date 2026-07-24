const User = require('../models/User.model');

/**
 * @desc    Get all users with filtering and search
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = {};

    // Filter by role
    if (role && ['Admin', 'Teacher', 'Student'].includes(role)) {
      query.role = role;
    }

    // Search by name, email, or rollNo
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, rollNo, department } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check rollNo unique constraint if role is Student
    if (role === 'Student' && rollNo) {
      const rollExists = await User.findOne({ rollNo });
      if (rollExists) {
        return res.status(400).json({
          success: false,
          message: 'Student with this roll number already exists'
        });
      }
    }

    const user = new User({
      name,
      email,
      password,
      role,
      rollNo: role === 'Student' ? rollNo : undefined,
      department
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, rollNo, department, password } = req.body;
    
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if updating admin to other role
    if (user.role === 'Admin' && role && role !== 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot demote or change Admin role'
      });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.department = department !== undefined ? department : user.department;

    if (user.role === 'Student') {
      user.rollNo = rollNo || user.rollNo;
    } else {
      user.rollNo = undefined;
    }

    if (password) {
      user.password = password; // pre-save hook will hash it
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user status (Active/Suspended)
 * @route   PATCH /api/users/:id/status
 * @access  Private/Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Do not suspend admins
    if (user.role === 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend Administrator accounts'
      });
    }

    user.status = user.status === 'Active' ? 'Suspended' : 'Active';
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status changed to ${user.status}`,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Do not delete admins or self
    if (user.role === 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Administrator accounts'
      });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
};
