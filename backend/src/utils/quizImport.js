const XLSX = require('xlsx');

const parseCsvRow = (line) => {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const normalizeHeaders = (headers) => headers.map((header) => header.trim().toLowerCase());

const parseCSV = (content) => {
  const lines = content
    .toString()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV import must include a header row and at least one question row.');
  }

  const headers = normalizeHeaders(parseCsvRow(lines[0]));
  const rows = lines.slice(1).map(parseCsvRow).map((row) => {
    const entry = {};
    row.forEach((cell, idx) => {
      entry[headers[idx] || `column_${idx}`] = cell;
    });
    return entry;
  });

  const firstRow = rows[0];
  const questions = rows.map((row, index) => ({
    type: (row.questiontype || row.questionType || row.type || 'short').toLowerCase(),
    text: row.questiontext || row.questionText || row.text || '',
    options: (row.options || '').split(',').map((item) => item.trim()).filter(Boolean),
    correctAnswer: row.correctanswer || row.correctAnswer || row.answer || '',
    marks: parseFloat(row.marks || '1') || 1,
    rubric: row.rubric || '',
    hint: row.hint || ''
  }));

  return {
    title: firstRow.title || firstRow.quiztitle || firstRow.name || 'Imported Quiz',
    description: firstRow.description || firstRow.quizdescription || '',
    category: firstRow.category || firstRow.subject || 'Imported',
    timeLimit: parseInt(firstRow.timelimit || '30', 10) || 30,
    subject: firstRow.subject || firstRow.subjectcode || firstRow.subjectcode || null,
    questions,
  };
};

const parseXlsx = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file must contain at least one worksheet.');
  }
  const worksheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (!json.length) {
    throw new Error('Excel file does not contain any rows.');
  }

  const firstRow = json[0];
  const questions = json.map((row) => ({
    type: (row.questionType || row.type || 'short').toLowerCase(),
    text: row.questionText || row.text || '',
    options: (row.options || row.option || '').toString().split(',').map((item) => item.trim()).filter(Boolean),
    correctAnswer: row.correctAnswer || row.answer || '',
    marks: parseFloat(row.marks || '1') || 1,
    rubric: row.rubric || '',
    hint: row.hint || ''
  }));

  return {
    title: firstRow.title || firstRow.quizTitle || firstRow.name || 'Imported Quiz',
    description: firstRow.description || '',
    category: firstRow.category || firstRow.subject || 'Imported',
    timeLimit: parseInt(firstRow.timeLimit || '30', 10) || 30,
    subject: firstRow.subject || firstRow.subjectCode || null,
    questions,
  };
};

const parseJson = (content) => {
  let jsonPayload = content;
  if (typeof content === 'string') {
    jsonPayload = JSON.parse(content);
  }

  if (Array.isArray(jsonPayload)) {
    jsonPayload = jsonPayload[0] || {};
  }

  if (!jsonPayload || typeof jsonPayload !== 'object') {
    throw new Error('JSON import must contain an object with quiz fields.');
  }

  const questions = (jsonPayload.questions || []).map((question) => ({
    type: (question.type || 'short').toLowerCase(),
    text: question.text || question.questionText || question.prompt || '',
    options: Array.isArray(question.options)
      ? question.options.map((item) => item.toString().trim()).filter(Boolean)
      : (question.options || '').toString().split(',').map((item) => item.trim()).filter(Boolean),
    correctAnswer: question.correctAnswer || question.answer || '',
    marks: parseFloat(question.marks || '1') || 1,
    rubric: question.rubric || question.prompt || '',
    hint: question.hint || ''
  }));

  return {
    title: jsonPayload.title || jsonPayload.quizTitle || 'Imported Quiz',
    description: jsonPayload.description || '',
    category: jsonPayload.category || jsonPayload.subject || 'Imported',
    timeLimit: parseInt(jsonPayload.timeLimit || jsonPayload.timeLimitMinutes || '30', 10) || 30,
    subject: jsonPayload.subject || jsonPayload.subjectCode || null,
    questions,
  };
};

const parseQuizImport = (content, filename) => {
  const key = filename.toString().split('.').pop().toLowerCase();
  if (key === 'csv' || key === 'txt') {
    return parseCSV(content.toString());
  }

  if (key === 'json') {
    return parseJson(content);
  }

  if (key === 'xlsx' || key === 'xls') {
    return parseXlsx(content);
  }

  throw new Error('Unsupported import file type. Use CSV, JSON or Excel (.xlsx/.xls).');
};

module.exports = {
  parseQuizImport,
};
