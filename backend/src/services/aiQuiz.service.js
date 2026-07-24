const axios = require('axios');

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

const getGeminiModels = () => {
  const configuredModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  return [configuredModel, ...FALLBACK_GEMINI_MODELS].filter(
    (model, index, models) => model && models.indexOf(model) === index
  );
};

const getGeminiUrl = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

const extractGeneratedText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part.text || '').join('\n').trim();
};

/**
 * Generate quiz questions using Gemini API
 * @param {Object} params - Generation parameters
 * @param {string} params.topic - Quiz topic
 * @param {number} params.numberOfQuestions - Number of questions to generate
 * @param {string} params.difficulty - Difficulty level (easy, medium, hard)
 * @param {string} params.questionType - Type of questions (mcq, short, mixed)
 * @returns {Promise<Array>} Generated questions
 */
const generateQuizWithAI = async ({
  topic,
  numberOfQuestions = 5,
  difficulty = 'medium',
  questionType = 'mcq'
}) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not configured, using mock data');
      return generateMockQuestions(topic, numberOfQuestions, difficulty, questionType);
    }

    const prompt = buildPrompt({
      topic,
      numberOfQuestions,
      difficulty,
      questionType
    });

    const response = await requestGeminiContent(prompt);
    const generatedText = extractGeneratedText(response.data);
    if (!generatedText) {
      throw new Error('Gemini returned an empty response');
    }

    const questions = parseGeneratedQuestions(generatedText, questionType);

    return questions;
  } catch (error) {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.error?.message;
    const details = apiMessage || error.message;
    console.error('Gemini API Error:', status || '', details);
    console.warn('Falling back to mock data for quiz generation');
    return generateMockQuestions(topic, numberOfQuestions, difficulty, questionType);
  }
};

const requestGeminiContent = async (prompt) => {
  let lastError;

  for (const model of getGeminiModels()) {
    try {
      return await axios.post(
        getGeminiUrl(model),
        {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
    } catch (error) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

/**
 * Build a structured prompt for Gemini
 */
const buildPrompt = ({ topic, numberOfQuestions, difficulty, questionType }) => {
  const typeDescription = {
    mcq: 'Multiple Choice Questions with 4 options each',
    short: 'Short Answer Questions with evaluation rubrics',
    mixed: 'Mix of MCQ and Short Answer questions'
  };

  return `Generate exactly ${numberOfQuestions} ${difficulty} level ${typeDescription[questionType]} about "${topic}" for an academic assessment.

Format the response as JSON array with this exact structure (NO markdown, NO code blocks, pure JSON):
[
  {
    "type": "mcq",
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "marks": 1
  },
  {
    "type": "short",
    "text": "Question text here?",
    "rubric": "Evaluation criteria: students should mention X, Y, Z...",
    "hint": "Think about...",
    "marks": 5
  }
]

Requirements:
- Each question must have clear, unambiguous text
- MCQ options must be 4 distinct options
- Correct answer must be one of the options for MCQ
- Short answer questions should have evaluation criteria in rubric
- Vary marks: 1 for MCQ, 3-5 for short answers
- Make questions appropriate for ${difficulty} level
- Ensure academic rigor and clarity

Return ONLY valid JSON, no additional text.`;
};

/**
 * Parse AI-generated questions from text response
 */
const parseGeneratedQuestions = (text, requestedType) => {
  try {
    // Extract JSON from the response (in case there's surrounding text)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response');
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Validate and clean questions
    return questions.map((q, idx) => {
      const type = ['mcq', 'short'].includes(q.type)
        ? q.type
        : requestedType === 'mixed'
          ? (idx % 2 === 0 ? 'mcq' : 'short')
          : requestedType;

      const options = Array.isArray(q.options)
        ? q.options.map(o => (o || '').trim()).filter(Boolean).slice(0, 6)
        : [];

      return {
        type,
        text: (q.text || '').trim(),
        ...(type === 'mcq' && {
          options,
          correctAnswer: (q.correctAnswer || q.answer || options[0] || '').trim()
        }),
        ...(type === 'short' && {
          rubric: (q.rubric || '').trim(),
          hint: (q.hint || '').trim()
        }),
        marks: Math.max(0.5, Math.min(10, Number(q.marks) || (type === 'mcq' ? 1 : 5)))
      };
    }).filter(q => q.text && q.text.length > 0);
  } catch (error) {
    console.error('Parse Error:', error.message);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
};

/**
 * Generate mock questions as fallback when Gemini API is unavailable
 */
const generateMockQuestions = (topic, numberOfQuestions, difficulty, questionType) => {
  const mockBank = {
    databases: {
      mcq: [
        {
          type: 'mcq',
          text: 'What is the primary purpose of database normalization?',
          options: ['Reduce data redundancy', 'Increase storage space', 'Speed up insertions'],
          correctAnswer: 'Reduce data redundancy',
          marks: 5
        },
        {
          type: 'mcq',
          text: 'Which of the following is NOT a ACID property?',
          options: ['Atomicity', 'Consistency', 'Isolation', 'Durability', 'Aggregation'],
          correctAnswer: 'Aggregation',
          marks: 5
        },
        {
          type: 'mcq',
          text: 'What does SQL stand for?',
          options: ['Structured Query Language', 'Simple Question Language', 'Sequential Query Logic'],
          correctAnswer: 'Structured Query Language',
          marks: 3
        }
      ],
      short: [
        {
          type: 'short',
          text: 'Explain what database normalization is and why it is important.',
          rubric: 'redundancy, efficiency, integrity, anomalies',
          hint: 'Consider data redundancy and update anomalies',
          marks: 5
        },
        {
          type: 'short',
          text: 'What are the different types of database relationships?',
          rubric: 'one-to-one, one-to-many, many-to-many, relationships',
          hint: 'Think about cardinality',
          marks: 5
        }
      ]
    },
    programming: {
      mcq: [
        {
          type: 'mcq',
          text: 'What is the time complexity of binary search?',
          options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
          correctAnswer: 'O(log n)',
          marks: 5
        },
        {
          type: 'mcq',
          text: 'Which data structure follows LIFO principle?',
          options: ['Queue', 'Stack', 'Array', 'Linked List'],
          correctAnswer: 'Stack',
          marks: 5
        }
      ],
      short: [
        {
          type: 'short',
          text: 'Describe the difference between recursion and iteration.',
          rubric: 'recursion, iteration, function call, loop, memory, stack',
          hint: 'Consider how each approach uses memory',
          marks: 5
        }
      ]
    }
  };

  const questionType_lower = questionType === 'mixed' ? 'mcq' : questionType;
  const topic_lower = topic.toLowerCase();
  const bank = mockBank[topic_lower] || mockBank.databases;
  const questions = bank[questionType_lower] || bank.mcq;

  // Return requested number of questions (cycling if needed)
  const result = [];
  for (let i = 0; i < numberOfQuestions; i++) {
    result.push({
      ...questions[i % questions.length],
      marks: difficulty === 'easy' ? 2 : difficulty === 'hard' ? 8 : 5
    });
  }

  return result;
};

module.exports = {
  generateQuizWithAI
};

