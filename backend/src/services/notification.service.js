const Notification = require('../models/Notification.model');
const User = require('../models/User.model');

/**
 * Creates a notification for a user
 * @param {string} recipient - ID of the User to receive the notification
 * @param {string} message - Notification text
 * @param {string} type - Notification type (e.g. 'quiz_published', 'quiz_graded', 'feedback', 'account_status', 'system')
 * @param {string} [relatedQuiz] - Optional related Quiz ID
 * @returns {Promise<Object>} Created notification object
 */
const getNotificationTitle = (type) => {
  const titles = {
    quiz_published: 'New Quiz Published',
    quiz_graded: 'Quiz Graded',
    feedback_received: 'Feedback Received',
    feedback: 'Feedback Received',
    account_status_changed: 'Account Status Updated',
    new_user_created: 'New User Created',
    quiz_submitted: 'Quiz Submitted',
    ai_grading_completed: 'AI Grading Completed',
    manual_grading_pending: 'Manual Grading Pending',
    teacher_comment: 'Teacher Comment Added',
    result_email_sent: 'Result Email Sent',
    general: 'Notification'
  };

  return titles[type] || titles.general;
};

const createNotification = async (recipient, message, type, relatedQuiz = null, title = null, relatedSubmission = null) => {
  try {
    const notification = new Notification({
      recipient,
      title: title || getNotificationTitle(type),
      message,
      type,
      relatedQuiz,
      relatedSubmission,
      isRead: false
    });
    await notification.save();

    try {
      await User.findByIdAndUpdate(recipient, { $inc: { notificationCount: 1 } });
    } catch (err) {
      console.error('Error incrementing user notification count:', err.message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
    throw error;
  }
};

/**
 * Creates notifications for all students enrolled in a subject or course
 * @param {Array<string>} studentIds - Array of student IDs
 * @param {string} message - Notification text
 * @param {string} type - Notification type
 * @param {string} [relatedQuiz] - Optional related Quiz ID
 */
const notifyManyStudents = async (studentIds, message, type, relatedQuiz = null, title = null) => {
  try {
    if (!studentIds || studentIds.length === 0) return;
    
    const notifications = studentIds.map(studentId => ({
      recipient: studentId,
      title: title || getNotificationTitle(type),
      message,
      type,
      relatedQuiz,
      isRead: false
    }));

    const inserted = await Notification.insertMany(notifications);

    // Increment notification count for users so UI indicators update
    try {
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $inc: { notificationCount: 1 } }
      );
    } catch (err) {
      console.error('Error incrementing user notification counts:', err.message);
    }

    console.log(`Created ${inserted.length} notifications for ${studentIds.length} recipients`);
  } catch (error) {
    console.error('Error creating bulk notifications:', error.message);
  }
};

module.exports = {
  createNotification,
  notifyManyStudents,
  getNotificationTitle
};
