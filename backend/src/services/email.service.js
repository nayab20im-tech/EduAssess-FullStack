const getEmailConfiguration = () => {
  const user = String(process.env.EMAIL_USER || '').trim();
  const appPassword = String(process.env.EMAIL_APP_PASSWORD || '').trim();
  const password = appPassword
    ? appPassword.replace(/\s+/g, '')
    : String(process.env.EMAIL_PASSWORD || '').trim();
  const service = String(process.env.EMAIL_SERVICE || '').trim();
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const from = String(process.env.EMAIL_FROM || user).trim();

  return { user, password, service, host, port, secure, from };
};

const isEmailConfigured = () => {
  const config = getEmailConfiguration();
  return Boolean(config.user && config.password && (config.service || config.host));
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    const error = new Error(
      'Email is not configured. Add EMAIL_USER, EMAIL_APP_PASSWORD and either EMAIL_SERVICE or SMTP_HOST to backend/.env.'
    );
    error.statusCode = 503;
    throw error;
  }

  let nodemailer;
  try {
    // Lazy loading keeps the rest of the API usable if dependencies have not yet been installed.
    // eslint-disable-next-line global-require
    nodemailer = require('nodemailer');
  } catch {
    const error = new Error(
      'The email package is missing. Run npm install in the backend folder.'
    );
    error.statusCode = 503;
    throw error;
  }

  const config = getEmailConfiguration();
  const transportOptions = config.service
    ? {
        service: config.service,
        auth: {
          user: config.user,
          pass: config.password
        }
      }
    : {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password
        }
      };

  return {
    transporter: nodemailer.createTransport(transportOptions),
    from: config.from
  };
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const sendSubmissionResultEmail = async ({
  to,
  studentName,
  teacherName,
  quizTitle,
  subject,
  score,
  maxScore,
  percentage,
  teacherFeedback,
  reportBuffer,
  reportFilename
}) => {
  const { transporter, from } = getTransporter();
  const safeStudentName = escapeHtml(studentName || 'Student');
  const safeQuizTitle = escapeHtml(quizTitle || 'Assessment');
  const safeTeacherName = escapeHtml(teacherName || 'Your teacher');
  const safeSubject = escapeHtml(subject || 'Assessment');
  const safeFeedback = escapeHtml(
    teacherFeedback || 'Your detailed question feedback is included in the attached report.'
  );

  const info = await transporter.sendMail({
    from: `EduAssess <${from}>`,
    to,
    subject: `Your EduAssess result: ${quizTitle}`,
    text: [
      `Hello ${studentName || 'Student'},`,
      '',
      `${teacherName || 'Your teacher'} has reviewed your result for ${quizTitle}.`,
      `Score: ${score} / ${maxScore} (${percentage}%)`,
      `Feedback: ${teacherFeedback || 'See the attached detailed report.'}`,
      '',
      'The detailed PDF report is attached.',
      '',
      'EduAssess'
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px 16px;background:#f3f4f9;font-family:Arial,sans-serif;color:#24273a">
        <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;box-shadow:0 22px 60px rgba(43,34,91,.14)">
          <div style="padding:30px;background:linear-gradient(135deg,#292344,#4b3a80 58%,#23616b);color:#ffffff">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#c6baff">EduAssess result</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2">${safeQuizTitle}</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.68)">${safeSubject}</p>
          </div>
          <div style="padding:30px">
            <p style="margin:0 0 18px;font-size:16px">Hello <strong>${safeStudentName}</strong>,</p>
            <p style="margin:0 0 22px;color:#6f7385;line-height:1.7">${safeTeacherName} has reviewed your assessment result.</p>
            <div style="padding:22px;border-radius:18px;background:#f4f1ff;text-align:center">
              <div style="font-size:13px;color:#777b8d">Final score</div>
              <div style="margin-top:8px;font-size:34px;font-weight:800;color:#5e49d7">${escapeHtml(score)} / ${escapeHtml(maxScore)}</div>
              <div style="margin-top:5px;font-size:17px;font-weight:700;color:#2f7e6a">${escapeHtml(percentage)}%</div>
            </div>
            <div style="margin-top:22px;padding:18px;border-left:4px solid #7057ff;border-radius:12px;background:#f8f8fb">
              <div style="font-size:12px;font-weight:800;color:#5f4bd8;text-transform:uppercase;letter-spacing:.08em">Teacher feedback</div>
              <p style="margin:9px 0 0;color:#666a7c;line-height:1.65">${safeFeedback}</p>
            </div>
            <p style="margin:22px 0 0;color:#8b8f9f;font-size:13px;line-height:1.6">Your complete question-by-question report is attached as a PDF.</p>
          </div>
          <div style="padding:18px 30px;border-top:1px solid #ececf2;color:#999cab;font-size:12px">Sent securely by EduAssess</div>
        </div>
      </div>
    `,
    attachments: reportBuffer
      ? [
          {
            filename: reportFilename || 'eduassess-result.pdf',
            content: reportBuffer,
            contentType: 'application/pdf'
          }
        ]
      : []
  });

  return info;
};

module.exports = {
  isEmailConfigured,
  sendSubmissionResultEmail
};
