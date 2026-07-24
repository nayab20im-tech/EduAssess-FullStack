const Subject = require('../models/Subject.model');

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Private
 */
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .populate('courseId', 'name code semester')
      .populate('teacherId', 'name email');
      
    res.status(200).json({
      success: true,
      count: subjects.length,
      subjects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private
 */
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('courseId', 'name code semester')
      .populate('teacherId', 'name email');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    res.status(200).json({
      success: true,
      subject
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subjects for a specific teacher
 * @route   GET /api/subjects/teacher/me
 * @access  Private
 */
const getTeacherSubjects = async (req, res, next) => {
  try {
    const query =
      req.user.role === 'Admin'
        ? { isActive: true }
        : { isActive: true, teacherId: req.user.id };

    const subjects = await Subject.find(query)
      .populate('courseId', 'name code semester department')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new subject
 * @route   POST /api/subjects
 * @access  Private/Admin
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, courseId, teacherId, description, creditHours } = req.body;

    const subjectExists = await Subject.findOne({ code });
    if (subjectExists) {
      return res.status(400).json({
        success: false,
        message: `Subject with code ${code} already exists`
      });
    }

    const subject = new Subject({
      name,
      code,
      courseId,
      teacherId,
      description,
      creditHours
    });

    await subject.save();

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update subject details
 * @route   PUT /api/subjects/:id
 * @access  Private/Admin
 */
const updateSubject = async (req, res, next) => {
  try {
    const { name, code, courseId, teacherId, description, creditHours, enrolledStudents, isActive } = req.body;

    let subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    subject.name = name || subject.name;
    subject.code = code || subject.code;
    subject.courseId = courseId || subject.courseId;
    subject.teacherId = teacherId || subject.teacherId;
    subject.description = description !== undefined ? description : subject.description;
    subject.creditHours = creditHours !== undefined ? creditHours : subject.creditHours;
    subject.enrolledStudents = enrolledStudents || subject.enrolledStudents;
    subject.isActive = isActive !== undefined ? isActive : subject.isActive;

    await subject.save();

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete subject
 * @route   DELETE /api/subjects/:id
 * @access  Private/Admin
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    await Subject.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  getTeacherSubjects,
  createSubject,
  updateSubject,
  deleteSubject
};
