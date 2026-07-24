const Submission = require('../models/Submission.model');
const Quiz = require('../models/Quiz.model');
const Question = require('../models/Question.model');
const {
  evaluateShortAnswersBatch,
  gradeMCQAnswer
} = require('../services/grading.service');
const { createNotification } = require('../services/notification.service');
const { matchesQuizAccessCode } = require('../services/quizAccess.service');
const {
  buildSubmissionReportPdf,
  buildTeacherReportPdf
} = require('../services/report.service');
const {
  sendSubmissionResultEmail
} = require('../services/email.service');

const safeFilename = (value, fallback = 'report') => {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
};

const notifyWithoutFailingRequest = async (...args) => {
  try {
    await createNotification(...args);
  } catch (error) {
    console.error('Notification could not be created:', error.message);
  }
};

const recalculateSubmissionTotals = (submission) => {
  const calculatedScore = (submission.answers || []).reduce(
    (total, answer) => total + (Number(answer.finalScore) || 0),
    0
  );

  submission.totalScore = parseFloat(calculatedScore.toFixed(2));
  submission.percentage = submission.maxScore > 0
    ? parseFloat(((calculatedScore / submission.maxScore) * 100).toFixed(1))
    : 0;
};

const teacherOwnsSubmission = (submission, user) =>
  user.role === 'Admin' ||
  submission.quiz?.createdBy?.toString() === user.id;

/**
 * @desc    Submit quiz answers (Student)
 * @route   POST /api/submissions
 * @access  Private/Student
 */
const submitQuiz = async (req, res, next) => {
  try {
    const {
      quizId,
      accessCode,
      answers,
      startedAt,
      timeTaken,
      tabSwitchCount,
      warnings,
      suspiciousFlags
    } = req.body;

    if (!quizId) {
      return res.status(400).json({ success: false, message: 'Quiz ID is required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'This quiz is not currently available.'
      });
    }

    if (quiz.expiresAt && new Date(quiz.expiresAt) <= new Date()) {
      return res.status(410).json({ success: false, message: 'This quiz has expired.' });
    }

    if (!matchesQuizAccessCode(quiz, accessCode)) {
      return res.status(403).json({
        success: false,
        message: 'The quiz access code is incorrect or missing.'
      });
    }

    const existingSubmission = await Submission.findOne({
      student: req.user.id,
      quiz: quizId
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already attempted this quiz. Only one attempt is permitted.'
      });
    }

    const quizQuestions = await Question.find({ quiz: quizId }).sort({ orderIndex: 1 });
    if (quizQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This quiz has no questions.'
      });
    }


    const startTime = startedAt
      ? new Date(startedAt)
      : new Date(Date.now() - (Number(timeTaken) || 0) * 1000);
    const safeStartTime = Number.isNaN(startTime.getTime()) ? new Date() : startTime;
    const limitMs = quiz.timeLimit * 60 * 1000;
    const elapsedTime = Math.max(0, Date.now() - safeStartTime.getTime());
    const isExpired = elapsedTime > limitMs + 45 * 1000;

    const suppliedAnswers = Array.isArray(answers) ? answers : [];
    const answerByQuestion = new Map(
      suppliedAnswers.map((answer) => [String(answer.questionId), answer])
    );

    const gradedAnswers = [];
    const shortAnswerRequests = [];
    const shortAnswerByQuestion = new Map();
    let hasShortAnswers = false;

    for (const question of quizQuestions) {
      if (question.type !== 'short') continue;

      const submittedAnswer = answerByQuestion.get(question._id.toString());
      const answerText = String(submittedAnswer?.answer || '').trim();
      hasShortAnswers = true;
      shortAnswerByQuestion.set(question._id.toString(), answerText);
      shortAnswerRequests.push({
        questionId: question._id.toString(),
        question: question.text,
        studentAnswer: answerText,
        rubric: question.rubric,
        maxMarks: question.marks
      });
    }

    const shortEvaluationResults = await evaluateShortAnswersBatch(shortAnswerRequests);
    const shortEvaluationByQuestion = new Map(
      shortAnswerRequests.map((request, index) => [
        request.questionId,
        shortEvaluationResults[index]
      ])
    );

    for (const question of quizQuestions) {
      const submittedAnswer = answerByQuestion.get(question._id.toString());
      const answerText = String(submittedAnswer?.answer || '').trim();

      if (question.type === 'mcq') {
        const gradingResult = gradeMCQAnswer(
          answerText,
          question.correctAnswer,
          question.marks
        );

        gradedAnswers.push({
          question: question._id,
          questionType: 'mcq',
          answer: answerText,
          isCorrect: gradingResult.isCorrect,
          finalScore: gradingResult.score,
          gradingStatus: 'teacher_graded',
          maxMarks: question.marks
        });
        continue;
      }

      const aiResult = shortEvaluationByQuestion.get(question._id.toString()) || {
        score: 0,
        confidence: 100,
        feedback: 'No answer submitted.',
        missingConcepts: []
      };

      gradedAnswers.push({
        question: question._id,
        questionType: 'short',
        answer: shortAnswerByQuestion.get(question._id.toString()) || answerText,
        aiScore: aiResult.score,
        aiConfidence: aiResult.confidence,
        aiFeedback: aiResult.feedback,
        aiMissingConcepts: aiResult.missingConcepts || [],
        finalScore: aiResult.score,
        gradingStatus: 'ai_graded',
        maxMarks: question.marks
      });
    }

    const automaticEvaluation = quiz.evaluationMode === 'automatic';
    const overallStatus = !hasShortAnswers || automaticEvaluation
      ? 'fully_graded'
      : 'grading';

    const submission = new Submission({
      student: req.user.id,
      quiz: quizId,
      answers: gradedAnswers,
      startedAt: safeStartTime,
      submittedAt: new Date(),
      timeTaken: Number(timeTaken) || Math.round(elapsedTime / 1000),
      isExpired,
      tabSwitchCount: Number(tabSwitchCount) || 0,
      warnings: Number(warnings) || 0,
      suspiciousFlags: Array.isArray(suspiciousFlags) ? suspiciousFlags : [],
      maxScore: quiz.totalMarks,
      overallStatus,
      gradedAt: overallStatus === 'fully_graded' ? new Date() : null,
      aiFeedbackSummary: hasShortAnswers
        ? automaticEvaluation
          ? 'Short answers were automatically evaluated by AI. The teacher may review and override these marks.'
          : 'AI suggestions are ready and waiting for teacher review.'
        : 'Multiple-choice answers were graded automatically.'
    });

    recalculateSubmissionTotals(submission);
    await submission.save();

    await notifyWithoutFailingRequest(
      quiz.createdBy,
      automaticEvaluation
        ? `Student ${req.user.name} submitted "${quiz.title}". Automatic evaluation completed with a provisional score of ${submission.percentage}%.`
        : `Student ${req.user.name} submitted "${quiz.title}". AI suggestions are ready for teacher review.`,
      automaticEvaluation ? 'ai_grading_completed' : 'quiz_submitted',
      quiz._id,
      null,
      submission._id
    );

    if (overallStatus === 'fully_graded') {
      await notifyWithoutFailingRequest(
        req.user.id,
        `Your quiz "${quiz.title}" has been evaluated. Score: ${submission.percentage}%. Your teacher may still revise AI-generated marks.`,
        'quiz_graded',
        quiz._id,
        null,
        submission._id
      );
    }

    return res.status(201).json({
      success: true,
      message: overallStatus === 'fully_graded'
        ? 'Quiz submitted and evaluated successfully.'
        : 'Quiz submitted successfully. AI suggestions are waiting for teacher approval.',
      submission
    });
  } catch (error) {
    // Treat a repeated network retry as an idempotent success instead of
    // showing the student a server error after the first save completed.
    if (error?.code === 11000 && req.body?.quizId && req.user?.id) {
      const existingSubmission = await Submission.findOne({
        student: req.user.id,
        quiz: req.body.quizId
      });

      if (existingSubmission) {
        return res.status(200).json({
          success: true,
          message: 'This quiz was already submitted successfully.',
          submission: existingSubmission
        });
      }
    }

    next(error);
  }
};

/**
 * @desc    Get student's own submissions
 * @route   GET /api/submissions/my
 * @access  Private/Student
 */
const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ student: req.user.id })
      .populate({
        path: 'quiz',
        select: 'title category timeLimit totalMarks subject evaluationMode',
        populate: { path: 'subject', select: 'name code' }
      })
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    next(error);
  }
};

const loadDetailedSubmission = (id) =>
  Submission.findById(id)
    .populate('student', 'name rollNo email')
    .populate({
      path: 'quiz',
      select: 'title category timeLimit totalMarks subject questions createdBy evaluationMode',
      populate: [
        { path: 'subject', select: 'name code' },
        { path: 'questions' }
      ]
    });

/**
 * @desc    Get a student's single submission result details
 * @route   GET /api/submissions/:id
 * @access  Private
 */
const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await loadDetailedSubmission(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (
      req.user.role === 'Student' &&
      submission.student._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (
      req.user.role === 'Teacher' &&
      submission.quiz.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const quizDetails = submission.quiz.toJSON();
    const questionsWithAnswers = quizDetails.questions.map((question) => {
      const answer = submission.answers.find(
        (item) => item.question.toString() === question._id.toString()
      );

      const sanitizedQuestion = { ...question };
      if (req.user.role === 'Student' && submission.overallStatus !== 'fully_graded') {
        delete sanitizedQuestion.correctAnswer;
        delete sanitizedQuestion.rubric;
      }

      return {
        question: sanitizedQuestion,
        studentAnswer: answer?.answer || '',
        isCorrect: answer?.isCorrect ?? null,
        aiScore: answer?.aiScore ?? null,
        aiConfidence: answer?.aiConfidence ?? null,
        aiFeedback: answer?.aiFeedback ?? null,
        aiMissingConcepts: answer?.aiMissingConcepts || [],
        teacherScore: answer?.teacherScore ?? null,
        teacherComment: answer?.teacherComment ?? null,
        finalScore: answer?.finalScore ?? 0,
        gradingStatus: answer?.gradingStatus || 'pending'
      };
    });

    return res.status(200).json({
      success: true,
      submission: {
        _id: submission._id,
        student: submission.student,
        quiz: {
          _id: quizDetails._id,
          title: quizDetails.title,
          category: quizDetails.category,
          subject: quizDetails.subject,
          totalMarks: quizDetails.totalMarks,
          evaluationMode: quizDetails.evaluationMode
        },
        startedAt: submission.startedAt,
        submittedAt: submission.submittedAt,
        timeTaken: submission.timeTaken,
        isExpired: submission.isExpired,
        tabSwitchCount: submission.tabSwitchCount,
        warnings: submission.warnings,
        suspiciousFlags: submission.suspiciousFlags,
        totalScore: submission.totalScore,
        maxScore: submission.maxScore,
        percentage: submission.percentage,
        overallStatus: submission.overallStatus,
        aiFeedbackSummary: submission.aiFeedbackSummary,
        teacherFeedback: submission.teacherFeedback,
        gradedAt: submission.gradedAt,
        questionsWithAnswers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending short-answer evaluations (Teacher)
 * @route   GET /api/submissions/pending
 * @access  Private/Teacher
 */
const getPendingEvaluations = async (req, res, next) => {
  try {
    const quizFilter = req.user.role === 'Admin' ? {} : { createdBy: req.user.id };
    const quizzes = await Quiz.find(quizFilter).select('_id');
    const quizIds = quizzes.map((quiz) => quiz._id);

    const submissions = await Submission.find({
      quiz: { $in: quizIds },
      overallStatus: 'grading',
      'answers.questionType': 'short',
      'answers.gradingStatus': { $in: ['pending', 'ai_graded'] }
    })
      .populate('student', 'name rollNo email')
      .populate('quiz', 'title totalMarks subject evaluationMode')
      .populate({ path: 'answers.question', select: 'text marks rubric' })
      .sort({ submittedAt: 1 });

    const pendingEvaluations = submissions.flatMap((submission) =>
      (submission.answers || [])
        .filter(
          (answer) =>
            answer?.questionType === 'short' &&
            answer.gradingStatus !== 'teacher_graded'
        )
        .map((answer) => ({
          submissionId: submission._id,
          questionId: answer.question?._id?.toString() || answer.question?.toString?.() || '',
          questionText: answer.question?.text || 'Short answer response',
          rubric: answer.question?.rubric || '',
          studentAnswer: answer.answer || '',
          studentName: submission.student?.name || 'Unknown Student',
          studentRollNo: submission.student?.rollNo || '',
          studentEmail: submission.student?.email || '',
          quizTitle: submission.quiz?.title || 'Untitled Quiz',
          evaluationMode: submission.quiz?.evaluationMode || 'teacher_review',
          submittedAt: submission.submittedAt,
          maxMarks: answer.maxMarks ?? answer.question?.marks ?? 10,
          aiScore: answer.aiScore ?? 0,
          aiConfidence: answer.aiConfidence ?? 0,
          aiFeedback: answer.aiFeedback || 'Awaiting AI feedback',
          aiMissingConcepts: answer.aiMissingConcepts || [],
          teacherScore: answer.teacherScore ?? answer.aiScore ?? 0,
          teacherComments: answer.teacherComment || answer.aiFeedback || ''
        }))
    );

    return res.status(200).json({
      success: true,
      count: pendingEvaluations.length,
      pendingEvaluations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get completed and automatically evaluated submissions (Teacher)
 * @route   GET /api/submissions/completed
 * @access  Private/Teacher
 */
const getCompletedEvaluations = async (req, res, next) => {
  try {
    const quizFilter = req.user.role === 'Admin' ? {} : { createdBy: req.user.id };
    const quizzes = await Quiz.find(quizFilter).select('_id');
    const quizIds = quizzes.map((quiz) => quiz._id);

    const submissions = await Submission.find({
      quiz: { $in: quizIds },
      overallStatus: 'fully_graded'
    })
      .populate('student', 'name rollNo email')
      .populate('quiz', 'title totalMarks subject evaluationMode')
      .populate({ path: 'answers.question', select: 'text marks rubric type' })
      .sort({ gradedAt: -1, submittedAt: -1 });

    const completedEvaluations = submissions.flatMap((submission) =>
      (submission.answers || [])
        .filter((answer) => answer?.questionType === 'short')
        .map((answer) => ({
          submissionId: submission._id,
          questionId: answer.question?._id?.toString() || answer.question?.toString?.() || '',
          questionText: answer.question?.text || 'Short answer response',
          rubric: answer.question?.rubric || '',
          studentAnswer: answer.answer || '',
          studentName: submission.student?.name || 'Unknown Student',
          studentRollNo: submission.student?.rollNo || '',
          studentEmail: submission.student?.email || '',
          resultEmailSentAt: submission.resultEmailSentAt || null,
          quizTitle: submission.quiz?.title || 'Untitled Quiz',
          evaluationMode: submission.quiz?.evaluationMode || 'teacher_review',
          submittedAt: submission.submittedAt,
          maxMarks: answer.maxMarks ?? answer.question?.marks ?? 10,
          aiScore: answer.aiScore ?? 0,
          aiConfidence: answer.aiConfidence ?? 0,
          aiFeedback: answer.aiFeedback || '',
          aiMissingConcepts: answer.aiMissingConcepts || [],
          teacherScore: answer.teacherScore ?? answer.finalScore ?? answer.aiScore ?? 0,
          teacherComments: answer.teacherComment || answer.aiFeedback || '',
          gradingStatus: answer.gradingStatus,
          finalScore: answer.finalScore ?? 0
        }))
    );

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
      completedEvaluations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Commit or override grades (Teacher)
 * @route   PUT /api/submissions/:id/grade
 * @access  Private/Teacher
 */
const gradeSubmission = async (req, res, next) => {
  try {
    const {
      answers,
      teacherFeedback,
      questionId,
      teacherScore,
      teacherComment
    } = req.body;

    const overrides = Array.isArray(answers)
      ? answers
      : questionId
        ? [{ questionId, teacherScore, teacherComment }]
        : [];

    if (overrides.length === 0 && teacherFeedback === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one grade or feedback update.'
      });
    }

    const submission = await Submission.findById(req.params.id).populate(
      'quiz',
      'title createdBy evaluationMode'
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (!teacherOwnsSubmission(submission, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade submissions for this quiz'
      });
    }

    for (const override of overrides) {
      const answer = submission.answers.find(
        (item) => item.question.toString() === String(override.questionId)
      );

      if (!answer || answer.questionType !== 'short') continue;

      const score = Number(override.teacherScore);
      if (!Number.isFinite(score) || score < 0 || score > answer.maxMarks) {
        return res.status(400).json({
          success: false,
          message: `Score must be between 0 and ${answer.maxMarks}.`
        });
      }

      answer.teacherScore = score;
      answer.teacherComment = String(override.teacherComment || '').trim();
      answer.finalScore = score;
      answer.gradingStatus = 'teacher_graded';
    }

    if (teacherFeedback !== undefined) {
      submission.teacherFeedback = String(teacherFeedback || '').trim();
    }

    recalculateSubmissionTotals(submission);

    const requiresApproval = submission.quiz.evaluationMode !== 'automatic';
    const stillPending = submission.answers.some(
      (answer) =>
        answer.questionType === 'short' &&
        answer.gradingStatus !== 'teacher_graded'
    );

    if (requiresApproval && stillPending) {
      submission.overallStatus = 'grading';
      submission.gradedAt = null;
    } else {
      submission.overallStatus = 'fully_graded';
      submission.gradedAt = new Date();
    }

    await submission.save();

    await notifyWithoutFailingRequest(
      submission.student,
      `Your result for "${submission.quiz.title}" was updated by ${req.user.name}. Current score: ${submission.percentage}%.`,
      'teacher_comment',
      submission.quiz._id,
      null,
      submission._id
    );

    return res.status(200).json({
      success: true,
      message: submission.overallStatus === 'fully_graded'
        ? 'Evaluation saved and the student was notified.'
        : 'Evaluation saved. More short answers still require review.',
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export teacher grade data as JSON rows
 * @route   GET /api/submissions/export
 * @access  Private/Teacher
 */
const exportSubmissionGrades = async (req, res, next) => {
  try {
    const quizFilter = req.user.role === 'Admin' ? {} : { createdBy: req.user.id };
    const teacherQuizzes = await Quiz.find(quizFilter).select('_id');
    const quizIds = teacherQuizzes.map((quiz) => quiz._id);

    if (quizIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, rows: [] });
    }

    const query = { quiz: { $in: quizIds } };
    if (req.query.quizId) {
      if (!quizIds.some((id) => id.toString() === String(req.query.quizId))) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      query.quiz = req.query.quizId;
    }

    const submissions = await Submission.find(query)
      .populate('student', 'name rollNo email')
      .populate('quiz', 'title totalMarks evaluationMode')
      .sort({ submittedAt: -1 });

    const rows = submissions.map((submission) => ({
      submissionId: submission._id,
      studentName: submission.student?.name || 'Unknown',
      rollNumber: submission.student?.rollNo || 'N/A',
      email: submission.student?.email || '',
      quizName: submission.quiz?.title || 'Deleted Quiz',
      evaluationMode: submission.quiz?.evaluationMode || 'teacher_review',
      marksObtained: submission.totalScore ?? 0,
      totalMarks: submission.maxScore ?? submission.quiz?.totalMarks ?? 0,
      percentage: submission.percentage ?? 0,
      submissionDate: submission.submittedAt?.toISOString() || null,
      evaluationStatus: submission.overallStatus
    }));

    return res.status(200).json({
      success: true,
      count: rows.length,
      rows
    });
  } catch (error) {
    next(error);
  }
};

const getQuizSubmissions = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access these submissions'
      });
    }

    const submissions = await Submission.find({ quiz: quiz._id })
      .populate('student', 'name rollNo email')
      .sort({ percentage: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download one detailed assessment PDF
 * @route   GET /api/submissions/:id/report
 * @access  Private
 */
const downloadSubmissionReport = async (req, res, next) => {
  try {
    const submission = await loadDetailedSubmission(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (
      req.user.role === 'Student' &&
      submission.student._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (
      req.user.role === 'Teacher' &&
      submission.quiz.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const pdf = buildSubmissionReportPdf(submission);
    const filename = `${safeFilename(submission.quiz.title)}-${safeFilename(
      submission.student.name,
      'student'
    )}-report.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download a teacher-wide PDF report
 * @route   GET /api/submissions/reports/teacher
 * @access  Private/Teacher
 */
const downloadTeacherReport = async (req, res, next) => {
  try {
    const quizFilter = req.user.role === 'Admin' ? {} : { createdBy: req.user.id };
    const quizzes = await Quiz.find(quizFilter).select('_id');
    const quizIds = quizzes.map((quiz) => quiz._id);

    const submissions = await Submission.find({ quiz: { $in: quizIds } })
      .populate('student', 'name rollNo email')
      .populate('quiz', 'title totalMarks evaluationMode')
      .sort({ submittedAt: -1 });

    const pdf = buildTeacherReportPdf({
      teacherName: req.user.name,
      submissions
    });

    const filename = `eduassess-${safeFilename(req.user.name, 'teacher')}-report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Email a reviewed result and detailed PDF to the student
 * @route   POST /api/submissions/:id/email-result
 * @access  Private/Teacher
 */
const emailSubmissionResult = async (req, res, next) => {
  try {
    const submission = await loadDetailedSubmission(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (
      req.user.role === 'Teacher' &&
      submission.quiz.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!submission.student?.email) {
      return res.status(400).json({
        success: false,
        message: 'This student account does not have an email address.'
      });
    }

    if (submission.overallStatus !== 'fully_graded') {
      return res.status(400).json({
        success: false,
        message: 'Complete all required reviews before emailing the final result.'
      });
    }

    const pdf = buildSubmissionReportPdf(submission);
    const reportFilename = `${safeFilename(submission.quiz.title)}-${safeFilename(
      submission.student.name,
      'student'
    )}-report.pdf`;

    const info = await sendSubmissionResultEmail({
      to: submission.student.email,
      studentName: submission.student.name,
      teacherName: req.user.name,
      quizTitle: submission.quiz.title,
      subject: submission.quiz.subject?.name || submission.quiz.category,
      score: submission.totalScore ?? 0,
      maxScore: submission.maxScore ?? submission.quiz.totalMarks ?? 0,
      percentage: submission.percentage ?? 0,
      teacherFeedback: submission.teacherFeedback,
      reportBuffer: pdf,
      reportFilename
    });

    submission.resultEmailSentAt = new Date();
    submission.resultEmailSentBy = req.user.id;
    submission.resultEmailMessageId = info.messageId || null;
    await submission.save();

    await notifyWithoutFailingRequest(
      submission.student._id,
      `Your reviewed result for "${submission.quiz.title}" was emailed to ${submission.student.email}.`,
      'result_email_sent',
      submission.quiz._id,
      null,
      submission._id
    );

    return res.status(200).json({
      success: true,
      message: `Result email sent successfully to ${submission.student.email}.`,
      sentTo: submission.student.email,
      sentAt: submission.resultEmailSentAt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitQuiz,
  getMySubmissions,
  getSubmissionById,
  getPendingEvaluations,
  getCompletedEvaluations,
  gradeSubmission,
  exportSubmissionGrades,
  getQuizSubmissions,
  downloadSubmissionReport,
  downloadTeacherReport,
  emailSubmissionResult
};
