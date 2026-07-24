const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;

const safeText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');

const escapePdfText = (value) =>
  safeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapText = (value, maxChars = 88) => {
  const text = safeText(value).trim();
  if (!text) return [''];

  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }

    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (seconds = 0) => {
  const total = Number(seconds) || 0;
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}m ${remaining}s`;
};

class PdfDocumentBuilder {
  constructor() {
    this.pages = [[]];
    this.currentY = PAGE_HEIGHT - MARGIN;
  }

  get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  newPage() {
    this.pages.push([]);
    this.currentY = PAGE_HEIGHT - MARGIN;
  }

  ensureSpace(height = 20) {
    if (this.currentY - height < MARGIN) this.newPage();
  }

  text(value, options = {}) {
    const {
      size = 10,
      bold = false,
      x = MARGIN,
      lineHeight = size + 4,
      maxChars = 88,
      gapAfter = 0
    } = options;

    const lines = wrapText(value, maxChars);
    this.ensureSpace(lines.length * lineHeight + gapAfter);

    lines.forEach((line) => {
      this.currentPage.push({
        text: line,
        x,
        y: this.currentY,
        size,
        bold
      });
      this.currentY -= lineHeight;
    });

    this.currentY -= gapAfter;
  }

  rule(gapBefore = 3, gapAfter = 10) {
    this.currentY -= gapBefore;
    this.ensureSpace(12);
    this.currentPage.push({
      line: true,
      x1: MARGIN,
      x2: PAGE_WIDTH - MARGIN,
      y: this.currentY
    });
    this.currentY -= gapAfter;
  }

  spacer(height = 10) {
    this.currentY -= height;
  }

  build() {
    const objects = [];
    const addObject = (content) => {
      objects.push(Buffer.from(content, 'binary'));
      return objects.length;
    };

    const catalogId = addObject('');
    const pagesId = addObject('');
    const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const pageIds = [];

    this.pages.forEach((pageCommands) => {
      const streamParts = [];

      pageCommands.forEach((command) => {
        if (command.line) {
          streamParts.push(
            `0.75 w ${command.x1} ${command.y} m ${command.x2} ${command.y} l S`
          );
          return;
        }

        streamParts.push(
          `BT /${command.bold ? 'F2' : 'F1'} ${command.size} Tf 1 0 0 1 ${command.x} ${command.y} Tm (${escapePdfText(command.text)}) Tj ET`
        );
      });

      const stream = streamParts.join('\n');
      const contentId = addObject(
        `<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`
      );
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, 'binary');
    objects[pagesId - 1] = Buffer.from(
      `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(' ')}] >>`,
      'binary'
    );

    const chunks = [Buffer.from('%PDF-1.4\n%EduAssess\n', 'binary')];
    const offsets = [0];
    let offset = chunks[0].length;

    objects.forEach((object, index) => {
      offsets[index + 1] = offset;
      const prefix = Buffer.from(`${index + 1} 0 obj\n`, 'binary');
      const suffix = Buffer.from('\nendobj\n', 'binary');
      chunks.push(prefix, object, suffix);
      offset += prefix.length + object.length + suffix.length;
    });

    const xrefOffset = offset;
    const xrefLines = [
      'xref',
      `0 ${objects.length + 1}`,
      '0000000000 65535 f '
    ];

    for (let index = 1; index <= objects.length; index += 1) {
      xrefLines.push(`${String(offsets[index]).padStart(10, '0')} 00000 n `);
    }

    const trailer = [
      ...xrefLines,
      'trailer',
      `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>`,
      'startxref',
      String(xrefOffset),
      '%%EOF'
    ].join('\n');

    chunks.push(Buffer.from(trailer, 'binary'));
    return Buffer.concat(chunks);
  }
}

const addBrandHeader = (doc, subtitle) => {
  doc.text('EduAssess', { size: 22, bold: true, lineHeight: 25 });
  doc.text(subtitle, { size: 12, bold: true, gapAfter: 3 });
  doc.text(`Generated ${formatDate(new Date())}`, { size: 8, gapAfter: 5 });
  doc.rule();
};

const buildSubmissionReportPdf = (submission) => {
  const doc = new PdfDocumentBuilder();
  const quiz = submission.quiz || {};
  const student = submission.student || {};

  addBrandHeader(doc, 'Student Assessment Report');
  doc.text(`Student: ${student.name || 'Student'}`, { bold: true });
  doc.text(`Roll number: ${student.rollNo || 'N/A'}`);
  doc.text(`Email: ${student.email || 'N/A'}`);
  doc.text(`Assessment: ${quiz.title || 'Untitled Quiz'}`, { bold: true });
  doc.text(`Subject / topic: ${quiz.subject?.name || quiz.category || 'N/A'}`);
  doc.text(`Submitted: ${formatDate(submission.submittedAt)}`);
  doc.text(`Time used: ${formatDuration(submission.timeTaken)}`);
  doc.spacer(6);
  doc.text(
    `Final result: ${submission.totalScore ?? 0} / ${submission.maxScore ?? quiz.totalMarks ?? 0} (${submission.percentage ?? 0}%)`,
    { size: 14, bold: true, gapAfter: 2 }
  );
  doc.text(`Evaluation status: ${String(submission.overallStatus || '').replaceAll('_', ' ')}`);
  if (submission.teacherFeedback) {
    doc.text(`Teacher feedback: ${submission.teacherFeedback}`, { gapAfter: 3 });
  }
  doc.rule();
  doc.text('Question-by-question review', { size: 14, bold: true, gapAfter: 5 });

  const questionById = new Map(
    (quiz.questions || []).map((question) => [question._id.toString(), question])
  );

  (submission.answers || []).forEach((answer, index) => {
    const question = questionById.get(answer.question?.toString()) || answer.question || {};
    doc.ensureSpace(90);
    doc.text(`${index + 1}. ${question.text || 'Question'}`, {
      size: 11,
      bold: true,
      maxChars: 82
    });
    doc.text(`Type: ${answer.questionType === 'short' ? 'Short answer' : 'Multiple choice'}`, {
      size: 8
    });
    doc.text(`Student answer: ${answer.answer || 'No answer submitted'}`, {
      maxChars: 92
    });
    doc.text(`Score: ${answer.finalScore ?? 0} / ${answer.maxMarks ?? question.marks ?? 0}`, {
      bold: true
    });
    const feedback = answer.teacherComment || answer.aiFeedback;
    if (feedback) doc.text(`Feedback: ${feedback}`, { maxChars: 92 });
    if (Array.isArray(answer.aiMissingConcepts) && answer.aiMissingConcepts.length) {
      doc.text(`Missing concepts: ${answer.aiMissingConcepts.join(', ')}`, { maxChars: 92 });
    }
    doc.rule(2, 8);
  });

  doc.text('This report was generated by EduAssess.', { size: 8 });
  return doc.build();
};

const buildTeacherReportPdf = ({ teacherName, submissions }) => {
  const doc = new PdfDocumentBuilder();
  addBrandHeader(doc, 'Teacher Assessment Performance Report');
  doc.text(`Teacher: ${teacherName || 'Teacher'}`, { bold: true });
  doc.text(`Total submissions: ${submissions.length}`);

  const graded = submissions.filter((submission) => submission.overallStatus === 'fully_graded');
  const average = graded.length
    ? graded.reduce((sum, submission) => sum + (Number(submission.percentage) || 0), 0) /
      graded.length
    : 0;

  doc.text(`Fully graded: ${graded.length}`);
  doc.text(`Average graded score: ${average.toFixed(1)}%`, { gapAfter: 3 });
  doc.rule();
  doc.text('Submission summary', { size: 14, bold: true, gapAfter: 5 });

  submissions.forEach((submission, index) => {
    doc.ensureSpace(75);
    doc.text(
      `${index + 1}. ${submission.student?.name || 'Unknown Student'} - ${submission.quiz?.title || 'Deleted Quiz'}`,
      { size: 11, bold: true, maxChars: 82 }
    );
    doc.text(`Roll number: ${submission.student?.rollNo || 'N/A'}`);
    doc.text(
      `Result: ${submission.totalScore ?? 0} / ${submission.maxScore ?? submission.quiz?.totalMarks ?? 0} (${submission.percentage ?? 0}%)`
    );
    doc.text(`Status: ${String(submission.overallStatus || '').replaceAll('_', ' ')}`);
    doc.text(`Submitted: ${formatDate(submission.submittedAt)}`);
    doc.rule(2, 8);
  });

  doc.text('This report was generated by EduAssess.', { size: 8 });
  return doc.build();
};

module.exports = {
  buildSubmissionReportPdf,
  buildTeacherReportPdf
};
