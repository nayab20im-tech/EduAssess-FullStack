const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [150, 'Course name cannot exceed 150 characters'],
    },

    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    semester: {
      type: String,
      required: [true, 'Semester is required'],
      enum: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
    },

    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Additional indexes
courseSchema.index({ department: 1 });
courseSchema.index({ semester: 1 });

module.exports = mongoose.model('Course', courseSchema);