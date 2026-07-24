const Course = require('../models/Course.model');

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Private
 */
const getCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ isActive: true }).populate('enrolledStudents', 'name email');
    res.status(200).json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Private
 */
const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('enrolledStudents', 'name email');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    res.status(200).json({
      success: true,
      course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new course
 * @route   POST /api/courses
 * @access  Private/Admin
 */
const createCourse = async (req, res, next) => {
  try {
    const { name, code, semester, department, description } = req.body;

    const courseExists = await Course.findOne({ code });
    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: `Course with code ${code} already exists`
      });
    }

    const course = new Course({
      name,
      code,
      semester,
      department,
      description
    });

    await course.save();

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update course details
 * @route   PUT /api/courses/:id
 * @access  Private/Admin
 */
const updateCourse = async (req, res, next) => {
  try {
    const { name, code, semester, department, description, enrolledStudents, isActive } = req.body;

    let course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    course.name = name || course.name;
    course.code = code || course.code;
    course.semester = semester || course.semester;
    course.department = department || course.department;
    course.description = description !== undefined ? description : course.description;
    course.enrolledStudents = enrolledStudents || course.enrolledStudents;
    course.isActive = isActive !== undefined ? isActive : course.isActive;

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete course
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
