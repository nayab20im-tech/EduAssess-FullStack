const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.warn(`⚠️ Could not load .env file from ${envPath}:`, envResult.error.message);
} else {
  console.log(`✅ Loaded environment variables from ${envPath}`);
}

const mongoose = require('mongoose');
const User = require('../models/User.model');
const Course = require('../models/Course.model');
const Subject = require('../models/Subject.model');
const Quiz = require('../models/Quiz.model');
const Question = require('../models/Question.model');
const Submission = require('../models/Submission.model');
const ActivityLog = require('../models/ActivityLog.model');
const Notification = require('../models/Notification.model');

const seedDB = async () => {
  if (process.env.SEED_CONFIRM !== 'YES') {
    console.error(
      '❌ Seeding is destructive and clears existing collections. Run with SEED_CONFIRM=YES only when you intend to replace the database data.'
    );
    process.exit(1);
  }

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Connected to database for seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing collections...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Subject.deleteMany({});
    await Quiz.deleteMany({});
    await Question.deleteMany({});
    await Submission.deleteMany({});
    await ActivityLog.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Collections cleared.');

    // 1. Create Users
    console.log('👥 Creating Users...');
    
    // Admin
    const admin = new User({
      name: 'Root System Admin',
      email: 'admin@smarteval.edu',
      password: 'Admin@1234',
      role: 'Admin',
      department: 'IT Administration',
      status: 'Active'
    });
    await admin.save();

    // Teachers
    const teacherWaqas = new User({
      name: 'Mr. Waqas Ilyas',
      email: 'waqas@smarteval.edu',
      password: 'Teacher@1234',
      role: 'Teacher',
      department: 'Computer Science',
      status: 'Active'
    });
    await teacherWaqas.save();

    const teacherTayyab = new User({
      name: 'Dr. Tayyab Khan',
      email: 'tayyab@smarteval.edu',
      password: 'Teacher@1234',
      role: 'Teacher',
      department: 'Information Technology',
      status: 'Active'
    });
    await teacherTayyab.save();

    // Students
    const studentNayab = new User({
      name: 'Nayab Nasir',
      email: 'nayab@student.edu',
      password: 'Student@1234',
      role: 'Student',
      rollNo: '231980059',
      department: 'Computer Science',
      status: 'Active'
    });
    await studentNayab.save();

    const studentAyesha = new User({
      name: 'Ayesha Khan',
      email: 'ayesha@student.edu',
      password: 'Student@1234',
      role: 'Student',
      rollNo: '231980012',
      department: 'Computer Science',
      status: 'Active'
    });
    await studentAyesha.save();

    const studentBilal = new User({
      name: 'Bilal Ahmed',
      email: 'bilal@student.edu',
      password: 'Student@1234',
      role: 'Student',
      rollNo: '231980015',
      department: 'Computer Science',
      status: 'Active'
    });
    await studentBilal.save();

    const studentZain = new User({
      name: 'Zain Malik',
      email: 'zain@student.edu',
      password: 'Student@1234',
      role: 'Student',
      rollNo: '231980022',
      department: 'Information Technology',
      status: 'Active'
    });
    await studentZain.save();

    const studentHamza = new User({
      name: 'Hamza Yousaf',
      email: 'hamza@student.edu',
      password: 'Student@1234',
      role: 'Student',
      rollNo: '231980031',
      department: 'Information Technology',
      status: 'Active'
    });
    await studentHamza.save();

    console.log('✅ Users created.');

    // 2. Create Courses
    console.log('📚 Creating Courses...');
    
    // BS Computer Science Curriculum (HEC)
    const bscsSemstered = [
      { name: 'Bachelor of Science in Computer Science - 1st Semester', code: 'BSCS-1', semester: '1st' },
      { name: 'Bachelor of Science in Computer Science - 2nd Semester', code: 'BSCS-2', semester: '2nd' },
      { name: 'Bachelor of Science in Computer Science - 3rd Semester', code: 'BSCS-3', semester: '3rd' },
      { name: 'Bachelor of Science in Computer Science - 4th Semester', code: 'BSCS-4', semester: '4th' },
      { name: 'Bachelor of Science in Computer Science - 5th Semester', code: 'BSCS-5', semester: '5th' },
      { name: 'Bachelor of Science in Computer Science - 6th Semester', code: 'BSCS-6', semester: '6th' },
      { name: 'Bachelor of Science in Computer Science - 7th Semester', code: 'BSCS-7', semester: '7th' },
      { name: 'Bachelor of Science in Computer Science - 8th Semester', code: 'BSCS-8', semester: '8th' }
    ];
    
    // BS Data Science Curriculum (HEC)
    const bsdsSemstered = [
      { name: 'Bachelor of Science in Data Science - 1st Semester', code: 'BSDS-1', semester: '1st' },
      { name: 'Bachelor of Science in Data Science - 2nd Semester', code: 'BSDS-2', semester: '2nd' },
      { name: 'Bachelor of Science in Data Science - 3rd Semester', code: 'BSDS-3', semester: '3rd' },
      { name: 'Bachelor of Science in Data Science - 4th Semester', code: 'BSDS-4', semester: '4th' },
      { name: 'Bachelor of Science in Data Science - 5th Semester', code: 'BSDS-5', semester: '5th' },
      { name: 'Bachelor of Science in Data Science - 6th Semester', code: 'BSDS-6', semester: '6th' },
      { name: 'Bachelor of Science in Data Science - 7th Semester', code: 'BSDS-7', semester: '7th' },
      { name: 'Bachelor of Science in Data Science - 8th Semester', code: 'BSDS-8', semester: '8th' }
    ];

    const savedCoursesBS = [];
    for (const courseData of bscsSemstered) {
      const course = new Course({
        name: courseData.name,
        code: courseData.code,
        semester: courseData.semester,
        department: 'Computer Science',
        description: `BS Computer Science - ${courseData.semester} Semester curriculum`,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      });
      await course.save();
      savedCoursesBS.push(course);
    }

    const savedCoursesBSDS = [];
    for (const courseData of bsdsSemstered) {
      const course = new Course({
        name: courseData.name,
        code: courseData.code,
        semester: courseData.semester,
        department: 'Data Science',
        description: `BS Data Science - ${courseData.semester} Semester curriculum`,
        enrolledStudents: [studentZain._id, studentHamza._id]
      });
      await course.save();
      savedCoursesBSDS.push(course);
    }
    
    console.log('✅ Courses created.');

    // 3. Create Subjects (HEC Curriculum)
    console.log('📖 Creating Subjects...');
    
    // BS CS 1st Semester Subjects
    const subBSCS1 = [
      new Subject({
        name: 'Calculus and Analytical Geometry',
        code: 'CS-101',
        courseId: savedCoursesBS[0]._id,
        teacherId: teacherWaqas._id,
        description: 'Differential and integral calculus, vector spaces, and analytical geometry.',
        creditHours: 3,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      }),
      new Subject({
        name: 'Introduction to Programming',
        code: 'CS-102',
        courseId: savedCoursesBS[0]._id,
        teacherId: teacherWaqas._id,
        description: 'Fundamentals of programming using C/C++, problem-solving techniques.',
        creditHours: 4,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      }),
      new Subject({
        name: 'Digital Logic Design',
        code: 'CS-103',
        courseId: savedCoursesBS[0]._id,
        teacherId: teacherTayyab._id,
        description: 'Boolean algebra, logic gates, combinational and sequential circuits.',
        creditHours: 3,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      })
    ];
    
    // BS CS 6th Semester Subjects
    const subBSCS6 = [
      new Subject({
        name: 'Database Management Systems',
        code: 'CS-601',
        courseId: savedCoursesBS[5]._id,
        teacherId: teacherWaqas._id,
        description: 'Relational databases, SQL, transactions, normalization and database design.',
        creditHours: 4,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      }),
      new Subject({
        name: 'Object Oriented Programming',
        code: 'CS-602',
        courseId: savedCoursesBS[5]._id,
        teacherId: teacherWaqas._id,
        description: 'Classes, encapsulation, inheritance, polymorphism, and abstraction.',
        creditHours: 3,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      }),
      new Subject({
        name: 'Web Technologies',
        code: 'CS-603',
        courseId: savedCoursesBS[5]._id,
        teacherId: teacherTayyab._id,
        description: 'HTML, CSS, JavaScript, client-server architecture, web frameworks.',
        creditHours: 3,
        enrolledStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
      })
    ];
    
    // BS Data Science 1st Semester Subjects
    const subBSDS1 = [
      new Subject({
        name: 'Calculus and Linear Algebra',
        code: 'DS-101',
        courseId: savedCoursesBSDS[0]._id,
        teacherId: teacherWaqas._id,
        description: 'Differential calculus, linear algebra, matrices, and eigenvalues.',
        creditHours: 4,
        enrolledStudents: [studentZain._id, studentHamza._id]
      }),
      new Subject({
        name: 'Introduction to Data Science',
        code: 'DS-102',
        courseId: savedCoursesBSDS[0]._id,
        teacherId: teacherTayyab._id,
        description: 'Data fundamentals, exploratory data analysis, visualization techniques.',
        creditHours: 3,
        enrolledStudents: [studentZain._id, studentHamza._id]
      }),
      new Subject({
        name: 'Programming for Data Science',
        code: 'DS-103',
        courseId: savedCoursesBSDS[0]._id,
        teacherId: teacherWaqas._id,
        description: 'Python programming, data structures, and libraries for data science.',
        creditHours: 4,
        enrolledStudents: [studentZain._id, studentHamza._id]
      })
    ];
    
    // BS Data Science 6th Semester Subjects
    const subBSDS6 = [
      new Subject({
        name: 'Machine Learning',
        code: 'DS-601',
        courseId: savedCoursesBSDS[5]._id,
        teacherId: teacherTayyab._id,
        description: 'Supervised/unsupervised learning, classification, regression, clustering.',
        creditHours: 4,
        enrolledStudents: [studentZain._id, studentHamza._id]
      }),
      new Subject({
        name: 'Big Data Analytics',
        code: 'DS-602',
        courseId: savedCoursesBSDS[5]._id,
        teacherId: teacherWaqas._id,
        description: 'Hadoop, MapReduce, Spark, distributed computing frameworks.',
        creditHours: 3,
        enrolledStudents: [studentZain._id, studentHamza._id]
      }),
      new Subject({
        name: 'Data Visualization',
        code: 'DS-603',
        courseId: savedCoursesBSDS[5]._id,
        teacherId: teacherTayyab._id,
        description: 'Interactive visualizations, dashboards, storytelling with data.',
        creditHours: 3,
        enrolledStudents: [studentZain._id, studentHamza._id]
      })
    ];

    const allSubjects = [...subBSCS1, ...subBSCS6, ...subBSDS1, ...subBSDS6];
    for (const subject of allSubjects) {
      await subject.save();
    }

    // Link subjects to users
    studentNayab.assignedModules = [subBSCS6[0]._id, subBSCS6[1]._id];
    await studentNayab.save();
    studentAyesha.assignedModules = [subBSCS6[0]._id, subBSCS6[1]._id];
    await studentAyesha.save();
    studentBilal.assignedModules = [subBSCS6[0]._id, subBSCS6[1]._id];
    await studentBilal.save();
    studentZain.assignedModules = [subBSDS6[0]._id];
    await studentZain.save();
    studentHamza.assignedModules = [subBSDS6[0]._id];
    await studentHamza.save();

    teacherWaqas.assignedModules = [...subBSCS1.map(s => s._id), ...subBSCS6.map(s => s._id), ...subBSDS1.map(s => s._id)];
    await teacherWaqas.save();
    teacherTayyab.assignedModules = [...subBSCS1.map(s => s._id), ...subBSCS6.map(s => s._id), ...subBSDS1.map(s => s._id), ...subBSDS6.map(s => s._id)];
    await teacherTayyab.save();

    console.log('✅ Subjects created.');

    // 4. Create Quizzes & Questions
    console.log('📝 Creating Quizzes & Questions...');
    
    // Quiz 1: DBMS Normalization
    const quizDBMS = new Quiz({
      title: 'DBMS Relational Normalization Model',
      description: 'Covers Functional Dependencies, 1NF, 2NF, 3NF, and Boyce-Codd Normal Form (BCNF).',
      subject: subBSCS6[0]._id,
      category: 'Midterm Assessment',
      timeLimit: 10, // 10 minutes
      difficulty: 'Intermediate',
      createdBy: teacherWaqas._id,
      status: 'published',
      publishedAt: new Date(Date.now() - 3600000 * 24), // 24 hours ago
      expiresAt: new Date(Date.now() + 3600000 * 48), // expires in 48 hours
      allowedAttempts: 1,
      accessCode: 'DBMS2026',
      evaluationMode: 'teacher_review',
      targetStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
    });
    await quizDBMS.save();

    const qDBMS1 = new Question({
      quiz: quizDBMS._id,
      type: 'mcq',
      text: 'Which normal form deals with removing partial functional dependency?',
      options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
      correctAnswer: 'Second Normal Form (2NF)',
      marks: 5,
      orderIndex: 0
    });
    await qDBMS1.save();

    const qDBMS2 = new Question({
      quiz: quizDBMS._id,
      type: 'short',
      text: 'Explain the difference between 3NF and BCNF with respect to functional dependencies.',
      rubric: 'BCNF, superkey, trivial, dependency, candidate key, strict',
      hint: 'Mention candidate keys and the condition for LHS of dependencies.',
      marks: 15,
      orderIndex: 1
    });
    await qDBMS2.save();

    quizDBMS.questions = [qDBMS1._id, qDBMS2._id];
    quizDBMS.totalMarks = 20;
    await quizDBMS.save();

    // Quiz 2: OOP Abstraction
    const quizOOP = new Quiz({
      title: 'OOP Abstraction & Encapsulation Frameworks',
      description: 'Covers data hiding, access modifiers, interface design, and abstract classes.',
      subject: subBSCS6[1]._id,
      category: 'Class Quiz',
      timeLimit: 15,
      difficulty: 'Intermediate',
      createdBy: teacherWaqas._id,
      status: 'published',
      publishedAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      expiresAt: new Date(Date.now() + 3600000 * 72),
      allowedAttempts: 1,
      accessCode: 'OOP2026A',
      evaluationMode: 'automatic',
      targetStudents: [studentNayab._id, studentAyesha._id, studentBilal._id]
    });
    await quizOOP.save();

    const qOOP1 = new Question({
      quiz: quizOOP._id,
      type: 'mcq',
      text: 'Which concept refers to wrapping data and code that manipulates it into a single unit, protecting it from outside interference?',
      options: ['Abstraction', 'Inheritance', 'Polymorphism', 'Encapsulation'],
      correctAnswer: 'Encapsulation',
      marks: 5,
      orderIndex: 0
    });
    await qOOP1.save();

    const qOOP2 = new Question({
      quiz: quizOOP._id,
      type: 'short',
      text: 'Describe how encapsulation achieves data hiding and protects data integrity in OOP.',
      rubric: 'private, public, getters, setters, mutator, access modifier, protect, validation',
      hint: 'Discuss access modifiers and utility functions.',
      marks: 15,
      orderIndex: 1
    });
    await qOOP2.save();

    quizOOP.questions = [qOOP1._id, qOOP2._id];
    quizOOP.totalMarks = 20;
    await quizOOP.save();

    // Quiz 3: Machine Learning (BS Data Science)
    const quizML = new Quiz({
      title: 'Machine Learning Fundamentals',
      description: 'Covers supervised/unsupervised learning, classification, regression, and clustering.',
      subject: subBSDS6[0]._id,
      category: 'Midterm Assessment',
      timeLimit: 15,
      difficulty: 'Intermediate',
      createdBy: teacherTayyab._id,
      status: 'draft',
      allowedAttempts: 1,
      accessCode: 'ML2026DS',
      evaluationMode: 'teacher_review',
      targetStudents: [studentZain._id, studentHamza._id]
    });
    await quizML.save();

    const qML1 = new Question({
      quiz: quizML._id,
      type: 'mcq',
      text: 'Which technique is used to find patterns in data without labeled output?',
      options: ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning', 'Transfer Learning'],
      correctAnswer: 'Unsupervised Learning',
      marks: 5,
      orderIndex: 0
    });
    await qML1.save();

    const qML2 = new Question({
      quiz: quizML._id,
      type: 'short',
      text: 'Explain the difference between classification and regression in machine learning.',
      rubric: 'discrete, continuous, supervised, output, labels, categories',
      hint: 'Classification outputs discrete labels, regression outputs continuous values.',
      marks: 15,
      orderIndex: 1
    });
    await qML2.save();

    quizML.questions = [qML1._id, qML2._id];
    quizML.totalMarks = 20;
    await quizML.save();

    console.log('✅ Quizzes & Questions created.');

    // 5. Create Submissions
    console.log('✏️ Creating Submissions...');
    
    // Ayesha Khan attempts DBMS (Graded - Score: 18.5/20)
    const subAyesha = new Submission({
      student: studentAyesha._id,
      quiz: quizDBMS._id,
      answers: [
        {
          question: qDBMS1._id,
          questionType: 'mcq',
          answer: 'Second Normal Form (2NF)',
          isCorrect: true,
          finalScore: 5,
          gradingStatus: 'teacher_graded',
          maxMarks: 5
        },
        {
          question: qDBMS2._id,
          questionType: 'short',
          answer: 'BCNF is a stricter, stronger version of 3NF. Under BCNF, for every functional dependency X -> Y, the left hand side X must be a superkey of the relation. In 3NF, the dependency is allowed if Y is a prime attribute, which can still cause minor redundancy. Therefore BCNF resolves all dependencies based on candidate/super keys.',
          aiScore: 13.5,
          aiConfidence: 90,
          aiFeedback: 'Excellent explanation. Accurately identifies that the left-hand side must be a superkey in BCNF, compared to the prime attribute allowance in 3NF.',
          aiMissingConcepts: ['trivial'],
          finalScore: 13.5,
          gradingStatus: 'ai_graded',
          maxMarks: 15
        }
      ],
      startedAt: new Date(Date.now() - 3600000 * 23 - 600000), // 23 hours ago, took 10 mins
      submittedAt: new Date(Date.now() - 3600000 * 23),
      timeTaken: 340, // 5m 40s
      isExpired: false,
      tabSwitchCount: 0,
      warnings: 0,
      totalScore: 18.5,
      maxScore: 20,
      percentage: 92.5,
      overallStatus: 'fully_graded',
      gradedAt: new Date(Date.now() - 3600000 * 22)
    });
    await subAyesha.save();

    // Bilal Ahmed attempts DBMS (Graded - Score: 11/20)
    const subBilal = new Submission({
      student: studentBilal._id,
      quiz: quizDBMS._id,
      answers: [
        {
          question: qDBMS1._id,
          questionType: 'mcq',
          answer: 'Third Normal Form (3NF)', // Incorrect
          isCorrect: false,
          finalScore: 0,
          gradingStatus: 'teacher_graded',
          maxMarks: 5
        },
        {
          question: qDBMS2._id,
          questionType: 'short',
          answer: '3NF allows dependency X -> Y if Y is prime. BCNF does not allow this. It requires X to be a super key. Thus BCNF is stricter normal form.',
          aiScore: 11.0,
          aiConfidence: 85,
          aiFeedback: 'Good attempt, correctly covers BCNF superkey condition. Misses depth on trivial dependencies.',
          aiMissingConcepts: ['trivial', 'candidate key'],
          finalScore: 11.0,
          gradingStatus: 'ai_graded',
          maxMarks: 15
        }
      ],
      startedAt: new Date(Date.now() - 3600000 * 23 - 1000000),
      submittedAt: new Date(Date.now() - 3600000 * 23),
      timeTaken: 480, // 8 minutes
      isExpired: false,
      tabSwitchCount: 3,
      warnings: 2,
      suspiciousFlags: ['Tab switches detected', 'Window lost focus'],
      totalScore: 11.0,
      maxScore: 20,
      percentage: 55.0,
      overallStatus: 'fully_graded',
      gradedAt: new Date(Date.now() - 3600000 * 22)
    });
    await subBilal.save();

    // Nayab Nasir attempts DBMS (Pending Manual review - Score: 16.5/20 AI Suggests)
    const subNayab = new Submission({
      student: studentNayab._id,
      quiz: quizDBMS._id,
      answers: [
        {
          question: qDBMS1._id,
          questionType: 'mcq',
          answer: 'Second Normal Form (2NF)', // Correct
          isCorrect: true,
          finalScore: 5,
          gradingStatus: 'teacher_graded',
          maxMarks: 5
        },
        {
          question: qDBMS2._id,
          questionType: 'short',
          answer: '3NF is for removing transitive dependencies. BCNF is a stricter form where every non-trivial functional dependency must have a super key on the left-hand side. In 3NF, we have an exception where the right hand side can be prime. BCNF removes this exception.',
          aiScore: 12.5,
          aiConfidence: 95,
          aiFeedback: 'AI Suggests: High accuracy. Identified the key difference (prime exception in 3NF versus absolute superkey requirement on LHS in BCNF). Covers non-trivial functional dependency.',
          aiMissingConcepts: [],
          finalScore: 12.5,
          gradingStatus: 'ai_graded',
          maxMarks: 15
        }
      ],
      startedAt: new Date(Date.now() - 600000), // 10 mins ago
      submittedAt: new Date(Date.now() - 50000), // 50 secs ago
      timeTaken: 550, // 9m 10s
      isExpired: false,
      tabSwitchCount: 1,
      warnings: 1,
      suspiciousFlags: ['Tab switches detected'],
      totalScore: 17.5,
      maxScore: 20,
      percentage: 87.5,
      overallStatus: 'grading' // PENDING TEACHER VERIFICATION
    });
    await subNayab.save();

    console.log('✅ Submissions created.');

    // 6. Create Proctoring Logs / ActivityLogs
    console.log('📊 Creating Activity Logs...');
    
    // Live active proctoring session for student Zain Malik taking a quiz (or just active log)
    const activeLogZain = new ActivityLog({
      userId: studentZain._id,
      quizId: quizOOP._id, // attempting OOP quiz
      loginTime: new Date(Date.now() - 300000), // started 5 mins ago
      isQuizSession: true,
      monitoringStatus: 'warning',
      currentActivity: 'Reading Question 2',
      tabSwitchCount: 2,
      warnings: 1,
      suspiciousActivity: ['Tab switched to browser'],
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    await activeLogZain.save();

    const activeLogHamza = new ActivityLog({
      userId: studentHamza._id,
      quizId: quizOOP._id, // attempting OOP quiz
      loginTime: new Date(Date.now() - 100000), // started 1 min ago
      isQuizSession: true,
      monitoringStatus: 'active',
      currentActivity: 'Attempting Question 1 (MCQ)',
      tabSwitchCount: 0,
      warnings: 0,
      ipAddress: '192.168.1.60',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    await activeLogHamza.save();

    console.log('✅ Activity Logs created.');

    // 7. Create Notifications
    console.log('🔔 Creating Notifications...');
    
    // For Nayab
    const notifNayab = new Notification({
      recipient: studentNayab._id,
      title: 'New Quiz Published',
      message: 'New assessment "OOP Abstraction & Encapsulation Frameworks" has been published.',
      type: 'quiz_published',
      relatedQuiz: quizOOP._id
    });
    await notifNayab.save();

    // For Waqas (Teacher)
    const notifWaqas = new Notification({
      recipient: teacherWaqas._id,
      title: 'Submission Pending Review',
      message: 'New submission for "DBMS Relational Normalization Model" from student Nayab Nasir requires manual grading review.',
      type: 'feedback_received',
      relatedQuiz: quizDBMS._id
    });
    await notifWaqas.save();

    console.log('✅ Notifications created.');

    console.log('🌟 Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error.message);
    process.exit(1);
  }
};

seedDB();
