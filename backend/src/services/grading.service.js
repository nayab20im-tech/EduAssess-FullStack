const axios = require('axios');

/**
 * Gemini AI Grading Service
 * Evaluates short answers against teacher rubrics.
 *
 * Production safeguards:
 * - batches every student's short answers into one Gemini request;
 * - spaces requests through a small in-process queue to reduce free-tier bursts;
 * - retries temporary 429/5xx responses;
 * - falls back to deterministic keyword matching when AI is unavailable.
 */

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const geminiQueue = [];
let activeGeminiRequests = 0;
let nextGeminiStartAt = 0;
let queueTimer = null;

const getGeminiConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

  return {
    apiKey,
    model,
    url: apiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      : null,
    minimumIntervalMs: Math.max(
      0,
      Number(process.env.GEMINI_MIN_INTERVAL_MS) || 1500
    ),
    concurrency: Math.max(1, Number(process.env.GEMINI_CONCURRENCY) || 2),
    maxAttempts: Math.max(1, Number(process.env.GEMINI_MAX_ATTEMPTS) || 3),
  };
};

const processGeminiQueue = () => {
  if (queueTimer) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }

  const { concurrency, minimumIntervalMs } = getGeminiConfig();
  if (activeGeminiRequests >= concurrency || geminiQueue.length === 0) return;

  const delay = Math.max(0, nextGeminiStartAt - Date.now());
  if (delay > 0) {
    queueTimer = setTimeout(processGeminiQueue, delay);
    return;
  }

  const item = geminiQueue.shift();
  activeGeminiRequests += 1;
  nextGeminiStartAt = Date.now() + minimumIntervalMs;

  Promise.resolve()
    .then(item.task)
    .then(item.resolve, item.reject)
    .finally(() => {
      activeGeminiRequests -= 1;
      processGeminiQueue();
    });

  // A second task may start after the configured spacing when concurrency
  // permits it, rather than waiting for the first request to finish.
  processGeminiQueue();
};

const scheduleGeminiRequest = (task) => {
  const scheduled = new Promise((resolve, reject) => {
    geminiQueue.push({ task, resolve, reject });
  });

  processGeminiQueue();
  return scheduled;
};

const extractJson = (rawText) => {
  const cleaned = String(rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid Gemini response format');
    return JSON.parse(jsonMatch[0]);
  }
};

const postToGemini = async (prompt) => {
  const config = getGeminiConfig();
  if (!config.apiKey || !config.url) {
    throw new Error('Gemini API key is not configured.');
  }

  return scheduleGeminiRequest(async () => {
    let lastError;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
      try {
        const response = await axios.post(
          config.url,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          },
          { timeout: 90000 }
        );

        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const retryable = status === 429 || status === 500 || status === 502 || status === 503;

        if (!retryable || attempt === config.maxAttempts) break;

        const retryAfterSeconds = Number(error.response?.headers?.['retry-after']);
        const retryDelay = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : attempt * 2500;
        await sleep(retryDelay);
      }
    }

    throw lastError || new Error('Gemini evaluation failed.');
  });
};

/**
 * Fallback keyword-matching grading when Gemini is unavailable.
 */
const keywordMatchingFallback = (studentAnswer, rubric, maxMarks) => {
  if (!studentAnswer || studentAnswer.trim().length < 10) {
    return {
      score: 0,
      confidence: 95,
      feedback: 'Answer is too short or empty.',
      missingConcepts: rubric ? rubric.split(',').map((keyword) => keyword.trim()) : [],
      strengths: '',
      weakAreas: 'The response needs more detail.',
      provider: 'keyword_fallback',
    };
  }

  const keywords = rubric
    ? rubric
        .split(/[,\.\n]/)
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 2)
    : [];

  if (keywords.length === 0) {
    const wordCount = studentAnswer.trim().split(/\s+/).length;
    const baseScore = Math.min(wordCount / 50, 1) * maxMarks;
    return {
      score: parseFloat(baseScore.toFixed(1)),
      confidence: 40,
      feedback: 'Auto-graded based on response completeness. Teacher review is recommended.',
      missingConcepts: [],
      strengths: wordCount >= 20 ? 'The response provides useful detail.' : '',
      weakAreas: wordCount < 20 ? 'Add more explanation and supporting detail.' : '',
      provider: 'keyword_fallback',
    };
  }

  const answerLower = studentAnswer.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) => answerLower.includes(keyword));
  const matchRatio = matchedKeywords.length / keywords.length;
  const rawScore = matchRatio * maxMarks;

  const missingConcepts = keywords
    .filter((keyword) => !answerLower.includes(keyword))
    .map((keyword) => keyword.charAt(0).toUpperCase() + keyword.slice(1));

  let feedback;
  if (matchRatio >= 0.8) {
    feedback = `Excellent response. It covers ${matchedKeywords.length} of ${keywords.length} key concepts.`;
  } else if (matchRatio >= 0.5) {
    feedback = `Good attempt. It covers ${matchedKeywords.length} of ${keywords.length} key concepts; review the missing areas.`;
  } else if (matchRatio >= 0.2) {
    feedback = `Partial answer. It addresses ${matchedKeywords.length} of ${keywords.length} key concepts.`;
  } else {
    feedback = 'The answer needs improvement and is missing most key concepts.';
  }

  return {
    score: parseFloat(rawScore.toFixed(1)),
    confidence: 65 + Math.floor(matchRatio * 20),
    feedback,
    missingConcepts,
    strengths: matchedKeywords.length > 0
      ? `Correctly mentions: ${matchedKeywords.join(', ')}.`
      : '',
    weakAreas: missingConcepts.length > 0
      ? `Review: ${missingConcepts.join(', ')}.`
      : '',
    provider: 'keyword_fallback',
  };
};

const normalizeEvaluation = (result, item) => ({
  score: Math.min(
    Math.max(Number.parseFloat(result?.score) || 0, 0),
    Number(item.maxMarks) || 0
  ),
  confidence: Math.min(Math.max(Number.parseInt(result?.confidence, 10) || 75, 0), 100),
  feedback: result?.feedback || 'No feedback was provided.',
  missingConcepts: Array.isArray(result?.missingConcepts)
    ? result.missingConcepts.map(String)
    : [],
  strengths: result?.strengths || '',
  weakAreas: result?.weakAreas || '',
  provider: 'gemini',
});

/**
 * Evaluate all short answers for one submission in a single AI request.
 */
const evaluateShortAnswersBatch = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const fallbackResults = () =>
    items.map((item) =>
      keywordMatchingFallback(item.studentAnswer, item.rubric, item.maxMarks)
    );

  if (!getGeminiConfig().apiKey) return fallbackResults();

  const promptPayload = items.map((item, index) => ({
    index,
    question: item.question,
    studentAnswer: item.studentAnswer,
    rubric: item.rubric || '',
    maximumMarks: Number(item.maxMarks) || 0,
  }));

  const prompt = `You are an academic evaluator for a university assessment platform.
Evaluate every answer independently using its rubric and maximum marks.
Be fair, concise, and evidence-based. Never award more than maximumMarks.

INPUT:
${JSON.stringify(promptPayload)}

Return JSON only in this exact structure:
{
  "evaluations": [
    {
      "index": 0,
      "score": 0,
      "confidence": 0,
      "feedback": "",
      "missingConcepts": [],
      "strengths": "",
      "weakAreas": ""
    }
  ]
}

Return exactly one evaluation for every input index.`;

  try {
    const rawText = await postToGemini(prompt);
    const parsed = extractJson(rawText);
    const evaluations = Array.isArray(parsed?.evaluations) ? parsed.evaluations : [];
    const byIndex = new Map(
      evaluations.map((evaluation) => [Number(evaluation.index), evaluation])
    );

    return items.map((item, index) => {
      const evaluation = byIndex.get(index);
      return evaluation
        ? normalizeEvaluation(evaluation, item)
        : keywordMatchingFallback(item.studentAnswer, item.rubric, item.maxMarks);
    });
  } catch (error) {
    console.warn(
      'Gemini batch evaluation failed; using keyword matching fallback:',
      error.message
    );
    return fallbackResults();
  }
};

const evaluateShortAnswer = async (
  question,
  studentAnswer,
  rubric,
  maxMarks = 10
) => {
  const [result] = await evaluateShortAnswersBatch([
    { question, studentAnswer, rubric, maxMarks },
  ]);
  return result;
};

const gradeMCQAnswer = (studentAnswer, correctAnswer, marks) => {
  const isCorrect =
    studentAnswer &&
    correctAnswer &&
    studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  return {
    isCorrect: isCorrect || false,
    score: isCorrect ? marks : 0,
  };
};

module.exports = {
  evaluateShortAnswer,
  evaluateShortAnswersBatch,
  gradeMCQAnswer,
  keywordMatchingFallback,
};
