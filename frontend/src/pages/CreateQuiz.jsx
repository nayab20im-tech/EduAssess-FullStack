import { useState } from 'react';
import {
  Accordion,
  Alert,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner
} from 'react-bootstrap';
import {
  FaCopy,
  FaKey,
  FaMagic,
  FaRobot,
  FaSave,
  FaTrashAlt
} from 'react-icons/fa';
import api from '../api/client';
import '../styles/CreateQuiz.css';

const createEmptyMcqQuestion = () => ({
  type: 'mcq',
  text: '',
  options: ['', ''],
  answer: '',
  marks: 1
});

const createEmptyShortQuestion = () => ({
  type: 'short',
  text: '',
  rubric: '',
  hint: '',
  marks: 5
});

const CreateQuiz = () => {
  const [mode, setMode] = useState('manual');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [evaluationMode, setEvaluationMode] = useState('teacher_review');
  const [createdQuiz, setCreatedQuiz] = useState(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [questions, setQuestions] = useState([
    createEmptyMcqQuestion()
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // AI generator states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');

  // Teacher can select one or both question types
  const [aiQuestionTypes, setAiQuestionTypes] = useState([
    'mcq'
  ]);

  // Teacher controls the number of each question type
  const [aiMcqCount, setAiMcqCount] = useState(3);
  const [aiShortCount, setAiShortCount] = useState(2);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  const resetQuizForm = () => {
    setTitle('');
    setCategory('');
    setTimeLimit(30);
    setEvaluationMode('teacher_review');
    setQuestions([createEmptyMcqQuestion()]);
  };

  const resetAIModalMessages = () => {
    setAiError('');
    setAiSuccess('');
  };

  const closeAIModal = () => {
    if (aiLoading) {
      return;
    }

    setShowAIModal(false);
    setMode('manual');
    resetAIModalMessages();
  };

  const openAIModal = () => {
    setMode('ai');
    resetAIModalMessages();
    setShowAIModal(true);
  };

  const toggleAIQuestionType = (type) => {
    setAiQuestionTypes((currentTypes) => {
      if (currentTypes.includes(type)) {
        return currentTypes.filter(
          (currentType) => currentType !== type
        );
      }

      return [...currentTypes, type];
    });
  };

  const getAIQuestionTypePayload = () => {
    const hasMcq = aiQuestionTypes.includes('mcq');
    const hasShort = aiQuestionTypes.includes('short');

    if (hasMcq && hasShort) {
      return 'mixed';
    }

    if (hasShort) {
      return 'short';
    }

    return 'mcq';
  };

  const getAITotalQuestions = () => {
    let total = 0;

    if (aiQuestionTypes.includes('mcq')) {
      total += Number(aiMcqCount) || 0;
    }

    if (aiQuestionTypes.includes('short')) {
      total += Number(aiShortCount) || 0;
    }

    return total;
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      return 'Please enter a quiz title.';
    }

    if (!category.trim()) {
      return 'Please enter a subject or topic.';
    }

    if (
      !Number.isFinite(Number(timeLimit)) ||
      Number(timeLimit) < 1
    ) {
      return 'Time limit must be at least 1 minute.';
    }

    if (questions.length === 0) {
      return 'Please add at least one question.';
    }

    for (
      let questionIndex = 0;
      questionIndex < questions.length;
      questionIndex += 1
    ) {
      const question = questions[questionIndex];
      const questionNumber = questionIndex + 1;

      if (!question.text?.trim()) {
        return `Please enter the statement for question ${questionNumber}.`;
      }

      if (
        !Number.isFinite(Number(question.marks)) ||
        Number(question.marks) < 0.5
      ) {
        return `Question ${questionNumber} must have at least 0.5 marks.`;
      }

      if (question.type === 'mcq') {
        const cleanedOptions = question.options.map((option) =>
          option.trim()
        );

        if (cleanedOptions.length < 2) {
          return `Question ${questionNumber} must have at least two options.`;
        }

        if (cleanedOptions.some((option) => !option)) {
          return `Please complete all options for question ${questionNumber}.`;
        }

        if (
          new Set(cleanedOptions).size !== cleanedOptions.length
        ) {
          return `Question ${questionNumber} contains duplicate options.`;
        }

        if (!question.answer?.trim()) {
          return `Please select the correct answer for question ${questionNumber}.`;
        }

        if (
          !cleanedOptions.includes(question.answer.trim())
        ) {
          return `The correct answer for question ${questionNumber} must match one of its options.`;
        }
      }
    }

    return null;
  };

  const validateAISettings = () => {
    if (!aiTopic.trim()) {
      return 'Please enter a quiz topic.';
    }

    if (aiQuestionTypes.length === 0) {
      return 'Please select at least one question type.';
    }

    if (aiQuestionTypes.includes('mcq')) {
      const mcqCount = Number(aiMcqCount);

      if (
        !Number.isInteger(mcqCount) ||
        mcqCount < 1 ||
        mcqCount > 20
      ) {
        return 'The number of MCQs must be between 1 and 20.';
      }
    }

    if (aiQuestionTypes.includes('short')) {
      const shortCount = Number(aiShortCount);

      if (
        !Number.isInteger(shortCount) ||
        shortCount < 1 ||
        shortCount > 20
      ) {
        return 'The number of short-answer questions must be between 1 and 20.';
      }
    }

    const totalQuestions = getAITotalQuestions();

    if (totalQuestions < 1 || totalQuestions > 20) {
      return 'The total number of generated questions must be between 1 and 20.';
    }

    return null;
  };

  const buildQuizPayload = (status) => ({
    title: title.trim(),
    category: category.trim(),
    timeLimit: Number(timeLimit),
    status,

    questions: questions.map(
      (question, questionIndex) => ({
        type: question.type,
        text: question.text.trim(),
        marks: Number(question.marks),
        orderIndex: questionIndex,

        ...(question.type === 'mcq'
          ? {
              options: question.options.map((option) =>
                option.trim()
              ),
              correctAnswer: question.answer.trim()
            }
          : {
              rubric: question.rubric?.trim() || '',
              hint: question.hint?.trim() || ''
            })
      })
    )
  });

  const handleSubmitQuiz = async (status) => {
    const validationMessage = validateQuiz();

    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    setIsSaving(true);

    try {
      const { data } = await api.post(
        '/quizzes',
        buildQuizPayload(status),
        {
          withCredentials: true
        }
      );

      if (data.success) {
        setCreatedQuiz(data.quiz);
        setShowCreatedModal(true);
        resetQuizForm();
      }
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          `Unable to ${
            status === 'published' ? 'publish' : 'save'
          } the quiz.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const normalizeQuestionType = (rawType) => {
    const normalizedType = String(rawType || '')
      .trim()
      .toLowerCase();

    if (
      [
        'short',
        'short-answer',
        'short_answer',
        'short answer',
        'descriptive',
        'open-ended',
        'open_ended'
      ].includes(normalizedType)
    ) {
      return 'short';
    }

    return 'mcq';
  };

  const normalizeGeneratedOptions = (rawOptions) => {
    if (!Array.isArray(rawOptions)) {
      return ['', ''];
    }

    const normalizedOptions = rawOptions
      .map((option) => {
        if (typeof option === 'object' && option !== null) {
          return String(
            option.text ||
              option.value ||
              option.option ||
              option.label ||
              ''
          ).trim();
        }

        return String(option || '').trim();
      })
      .filter(Boolean);

    while (normalizedOptions.length < 2) {
      normalizedOptions.push('');
    }

    return normalizedOptions;
  };

  const normalizeCorrectAnswer = (
    rawAnswer,
    normalizedOptions
  ) => {
    if (
      typeof rawAnswer === 'number' &&
      normalizedOptions[rawAnswer]
    ) {
      return normalizedOptions[rawAnswer];
    }

    const answer = String(rawAnswer || '').trim();

    if (!answer) {
      return '';
    }

    const exactMatch = normalizedOptions.find(
      (option) => option === answer
    );

    if (exactMatch) {
      return exactMatch;
    }

    const caseInsensitiveMatch = normalizedOptions.find(
      (option) =>
        option.toLowerCase() === answer.toLowerCase()
    );

    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch;
    }

    const letterMatch = answer.match(/^[A-Fa-f][.)]?$/);

    if (letterMatch) {
      const optionIndex =
        answer.toUpperCase().charCodeAt(0) -
        'A'.charCodeAt(0);

      if (normalizedOptions[optionIndex]) {
        return normalizedOptions[optionIndex];
      }
    }

    return answer;
  };

  const normalizeGeneratedQuestion = (question) => {
    const questionType = normalizeQuestionType(
      question.type || question.questionType
    );

    const questionText =
      question.text ||
      question.question ||
      question.questionText ||
      question.prompt ||
      '';

    if (questionType === 'short') {
      return {
        type: 'short',
        text: String(questionText),
        rubric: String(
          question.rubric ||
            question.expectedAnswer ||
            question.modelAnswer ||
            question.correctAnswer ||
            ''
        ),
        hint: String(question.hint || ''),
        marks: Number(question.marks) || 5
      };
    }

    const options = normalizeGeneratedOptions(
      question.options ||
        question.choices ||
        question.answers
    );

    const answer = normalizeCorrectAnswer(
      question.correctAnswer ??
        question.answer ??
        question.correctOption,
      options
    );

    return {
      type: 'mcq',
      text: String(questionText),
      options,
      answer,
      marks: Number(question.marks) || 1
    };
  };

  const handleGenerateWithAI = async () => {
    resetAIModalMessages();

    const validationMessage = validateAISettings();

    if (validationMessage) {
      setAiError(validationMessage);
      return;
    }

    setAiLoading(true);

    try {
      const mcqCount = aiQuestionTypes.includes('mcq')
        ? Number(aiMcqCount)
        : 0;

      const shortCount = aiQuestionTypes.includes('short')
        ? Number(aiShortCount)
        : 0;

      const { data } = await api.post(
        '/quizzes/generate-ai',
        {
          topic: aiTopic.trim(),
          numberOfQuestions: getAITotalQuestions(),
          mcqCount,
          shortCount,
          difficulty: aiDifficulty,
          questionType: getAIQuestionTypePayload()
        },
        {
          withCredentials: true
        }
      );

      if (
        !data.success ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0
      ) {
        throw new Error(
          'The AI service did not return any questions.'
        );
      }

      const generatedQuestions = data.questions.map(
        normalizeGeneratedQuestion
      );

      setTitle(
        (currentTitle) =>
          currentTitle ||
          `${aiTopic.trim()} Assessment`
      );

      setCategory(
        (currentCategory) =>
          currentCategory || aiTopic.trim()
      );

      setQuestions(generatedQuestions);

      const generatedMcqCount = generatedQuestions.filter(
        (question) => question.type === 'mcq'
      ).length;

      const generatedShortCount = generatedQuestions.filter(
        (question) => question.type === 'short'
      ).length;

      setAiSuccess(
        `Generated ${generatedMcqCount} MCQ${
          generatedMcqCount === 1 ? '' : 's'
        } and ${generatedShortCount} short-answer question${
          generatedShortCount === 1 ? '' : 's'
        }.`
      );

      window.setTimeout(() => {
        setShowAIModal(false);
        setMode('manual');
        resetAIModalMessages();
      }, 1400);
    } catch (error) {
      setAiError(
        error.response?.data?.message ||
          error.message ||
          'Failed to generate questions. Please try again.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const addQuestion = (type) => {
    setQuestions((currentQuestions) => [
      ...currentQuestions,
      type === 'mcq'
        ? createEmptyMcqQuestion()
        : createEmptyShortQuestion()
    ]);
  };

  const updateQuestion = (questionIndex, updates) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, currentQuestionIndex) =>
          currentQuestionIndex === questionIndex
            ? {
                ...question,
                ...updates
              }
            : question
      )
    );
  };

  const updateQuestionOption = (
    questionIndex,
    optionIndex,
    value
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, currentQuestionIndex) => {
          if (
            currentQuestionIndex !== questionIndex ||
            question.type !== 'mcq'
          ) {
            return question;
          }

          const previousValue =
            question.options[optionIndex];

          const updatedOptions = question.options.map(
            (option, currentOptionIndex) =>
              currentOptionIndex === optionIndex
                ? value
                : option
          );

          return {
            ...question,
            options: updatedOptions,
            answer:
              question.answer === previousValue
                ? value
                : question.answer
          };
        }
      )
    );
  };

  const addQuestionOption = (questionIndex) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, currentQuestionIndex) =>
          currentQuestionIndex === questionIndex &&
          question.type === 'mcq'
            ? {
                ...question,
                options: [...question.options, '']
              }
            : question
      )
    );
  };

  const removeQuestionOption = (
    questionIndex,
    optionIndex
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, currentQuestionIndex) => {
          if (
            currentQuestionIndex !== questionIndex ||
            question.type !== 'mcq' ||
            question.options.length <= 2
          ) {
            return question;
          }

          const removedOption =
            question.options[optionIndex];

          return {
            ...question,
            options: question.options.filter(
              (_, currentOptionIndex) =>
                currentOptionIndex !== optionIndex
            ),
            answer:
              question.answer === removedOption
                ? ''
                : question.answer
          };
        }
      )
    );
  };

  const removeQuestion = (questionIndex) => {
    setQuestions((currentQuestions) =>
      currentQuestions.filter(
        (_, currentQuestionIndex) =>
          currentQuestionIndex !== questionIndex
      )
    );
  };

  const totalMarks = questions.reduce(
    (sum, question) =>
      sum + (Number(question.marks) || 0),
    0
  );

  return (
    <div
      className="create-quiz-page"
      style={{ background: '#f8f9fa' }}
    >
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            Create New Assessment
          </h3>

          <p className="text-muted small mb-0">
            Build an assessment manually or generate
            questions using AI.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant={
              mode === 'manual'
                ? 'primary'
                : 'outline-primary'
            }
            onClick={() => setMode('manual')}
            className="rounded-pill fw-bold"
          >
            Manual Builder
          </Button>

          <Button
            variant={
              mode === 'ai'
                ? 'primary'
                : 'outline-primary'
            }
            onClick={openAIModal}
            className="rounded-pill fw-bold d-flex align-items-center gap-2"
          >
            <FaMagic />
            AI Generator
          </Button>
        </div>
      </div>

      <Modal
        show={showAIModal}
        onHide={closeAIModal}
        centered
        size="lg"
        backdrop={aiLoading ? 'static' : true}
        keyboard={!aiLoading}
      >
        <Modal.Header
          closeButton={!aiLoading}
          className="border-bottom-0"
        >
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaRobot />
            Generate Quiz with AI
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {aiError && (
            <Alert variant="danger">{aiError}</Alert>
          )}

          {aiSuccess && (
            <Alert variant="success">{aiSuccess}</Alert>
          )}

          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">
                Quiz Topic
              </Form.Label>

              <Form.Control
                value={aiTopic}
                onChange={(event) =>
                  setAiTopic(event.target.value)
                }
                placeholder="e.g. Database normalization, calculus, literature"
                disabled={aiLoading}
              />

              <Form.Text className="text-muted">
                Enter the topic on which the AI should
                generate questions.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">
                Difficulty Level
              </Form.Label>

              <Form.Select
                value={aiDifficulty}
                onChange={(event) =>
                  setAiDifficulty(event.target.value)
                }
                disabled={aiLoading}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">
                Question Types
              </Form.Label>

              <p className="text-muted small mb-3">
                Select one or both question types.
              </p>

              <Row className="g-3">
                <Col md={6}>
                  <Card
                    className={`h-100 rounded-3 ${
                      aiQuestionTypes.includes('mcq')
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'border'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!aiLoading) {
                        toggleAIQuestionType('mcq');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        !aiLoading &&
                        (event.key === 'Enter' ||
                          event.key === ' ')
                      ) {
                        event.preventDefault();
                        toggleAIQuestionType('mcq');
                      }
                    }}
                  >
                    <Card.Body className="d-flex align-items-start gap-3">
                      <Form.Check
                        type="checkbox"
                        id="ai-question-type-mcq"
                        checked={aiQuestionTypes.includes(
                          'mcq'
                        )}
                        onChange={() =>
                          toggleAIQuestionType('mcq')
                        }
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        disabled={aiLoading}
                      />

                      <div>
                        <h6 className="fw-bold mb-1">
                          Multiple Choice
                        </h6>

                        <p className="text-muted small mb-0">
                          Questions with several options and
                          one correct answer.
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card
                    className={`h-100 rounded-3 ${
                      aiQuestionTypes.includes('short')
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'border'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!aiLoading) {
                        toggleAIQuestionType('short');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        !aiLoading &&
                        (event.key === 'Enter' ||
                          event.key === ' ')
                      ) {
                        event.preventDefault();
                        toggleAIQuestionType('short');
                      }
                    }}
                  >
                    <Card.Body className="d-flex align-items-start gap-3">
                      <Form.Check
                        type="checkbox"
                        id="ai-question-type-short"
                        checked={aiQuestionTypes.includes(
                          'short'
                        )}
                        onChange={() =>
                          toggleAIQuestionType('short')
                        }
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        disabled={aiLoading}
                      />

                      <div>
                        <h6 className="fw-bold mb-1">
                          Short Answer
                        </h6>

                        <p className="text-muted small mb-0">
                          Descriptive questions evaluated
                          using a rubric.
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {aiQuestionTypes.length === 0 && (
                <Alert
                  variant="warning"
                  className="mt-3 mb-0"
                >
                  Select at least one question type.
                </Alert>
              )}
            </Form.Group>

            {aiQuestionTypes.length > 0 && (
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">
                  Number of Questions
                </Form.Label>

                <p className="text-muted small mb-3">
                  Select the exact quantity of each
                  question type.
                </p>

                <Row className="g-3">
                  {aiQuestionTypes.includes('mcq') && (
                    <Col
                      md={
                        aiQuestionTypes.includes('short')
                          ? 6
                          : 12
                      }
                    >
                      <Card className="border rounded-3 h-100">
                        <Card.Body>
                          <Form.Label className="fw-bold">
                            Number of MCQs
                          </Form.Label>

                          <Form.Control
                            type="number"
                            min="1"
                            max="20"
                            value={aiMcqCount}
                            onChange={(event) => {
                              const value = Number(
                                event.target.value
                              );

                              setAiMcqCount(
                                Math.min(
                                  20,
                                  Math.max(1, value || 1)
                                )
                              );
                            }}
                            disabled={aiLoading}
                          />

                          <Form.Text className="text-muted">
                            Choose how many multiple-choice
                            questions should be generated.
                          </Form.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                  )}

                  {aiQuestionTypes.includes('short') && (
                    <Col
                      md={
                        aiQuestionTypes.includes('mcq')
                          ? 6
                          : 12
                      }
                    >
                      <Card className="border rounded-3 h-100">
                        <Card.Body>
                          <Form.Label className="fw-bold">
                            Number of Short Questions
                          </Form.Label>

                          <Form.Control
                            type="number"
                            min="1"
                            max="20"
                            value={aiShortCount}
                            onChange={(event) => {
                              const value = Number(
                                event.target.value
                              );

                              setAiShortCount(
                                Math.min(
                                  20,
                                  Math.max(1, value || 1)
                                )
                              );
                            }}
                            disabled={aiLoading}
                          />

                          <Form.Text className="text-muted">
                            Choose how many descriptive
                            questions should be generated.
                          </Form.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                  )}
                </Row>

                <Alert
                  variant={
                    getAITotalQuestions() > 20
                      ? 'danger'
                      : 'info'
                  }
                  className="mt-3 mb-0"
                >
                  Total questions to generate:{' '}
                  <strong>{getAITotalQuestions()}</strong>
                  {getAITotalQuestions() > 20 && (
                    <>
                      {' '}
                      — The maximum allowed total is 20.
                    </>
                  )}
                </Alert>
              </Form.Group>
            )}
          </Form>
        </Modal.Body>

        <Modal.Footer className="border-top-0">
          <Button
            variant="outline-secondary"
            onClick={closeAIModal}
            disabled={aiLoading}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleGenerateWithAI}
            disabled={
              aiLoading ||
              aiQuestionTypes.length === 0 ||
              getAITotalQuestions() > 20
            }
            className="fw-bold d-flex align-items-center gap-2"
          >
            {aiLoading ? (
              <>
                <Spinner animation="border" size="sm" />
                Generating...
              </>
            ) : (
              <>
                <FaMagic />
                Generate Questions
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showCreatedModal}
        onHide={() => setShowCreatedModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-bottom-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaKey className="text-primary" />
            Quiz access code
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            {createdQuiz?.status === 'published'
              ? 'The quiz was published successfully.'
              : 'The quiz was saved as a draft successfully.'}
          </Alert>
          <p className="text-muted">
            Share this code only with students who are allowed to attempt the quiz.
          </p>
          <div className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3 border bg-light">
            <strong
              className="font-monospace fs-3 letter-spacing"
              style={{ letterSpacing: '0.18em' }}
            >
              {createdQuiz?.accessCode || 'Not available'}
            </strong>
            <Button
              variant="outline-primary"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(createdQuiz?.accessCode || '')
                  .then(() => window.alert('Access code copied.'))
              }
              disabled={!createdQuiz?.accessCode}
            >
              <FaCopy className="me-2" /> Copy
            </Button>
          </div>
          <p className="small text-muted mt-3 mb-0">
            Evaluation mode:{' '}
            <strong>
              {createdQuiz?.evaluationMode === 'automatic'
                ? 'Automatic AI evaluation'
                : 'Teacher review required'}
            </strong>
          </p>
        </Modal.Body>
        <Modal.Footer className="border-top-0">
          <Button onClick={() => setShowCreatedModal(false)}>Done</Button>
        </Modal.Footer>
      </Modal>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label className="fw-bold">
              Quiz Title
            </Form.Label>

            <Form.Control
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Cassandra Midterm Quiz"
              className="rounded-3"
              maxLength={200}
            />
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group>
            <Form.Label className="fw-bold">
              Subject / Topic
            </Form.Label>

            <Form.Control
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="e.g. Database Systems, Mathematics"
              className="rounded-3"
            />

            <Form.Text className="text-muted">
              A teacher can enter any subject or topic.
            </Form.Text>
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group>
            <Form.Label className="fw-bold">
              Time Limit (Minutes)
            </Form.Label>

            <Form.Control
              type="number"
              min="1"
              value={timeLimit}
              onChange={(event) =>
                setTimeLimit(Number(event.target.value))
              }
              className="rounded-3"
            />
          </Form.Group>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm rounded-4 p-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h5 className="fw-bold mb-1">Evaluation method</h5>
            <p className="text-muted small mb-0">
              Choose what happens when a student submits short-answer questions.
            </p>
          </div>
          <span className="badge bg-primary">Teacher can always override AI marks</span>
        </div>

        <Row className="g-3">
          <Col md={6}>
            <Card
              role="button"
              className={`h-100 rounded-3 ${
                evaluationMode === 'automatic'
                  ? 'border-primary bg-primary bg-opacity-10'
                  : 'border'
              }`}
              onClick={() => setEvaluationMode('automatic')}
            >
              <Card.Body>
                <Form.Check
                  type="radio"
                  name="evaluation-mode"
                  id="evaluation-automatic"
                  checked={evaluationMode === 'automatic'}
                  onChange={() => setEvaluationMode('automatic')}
                  label={<strong>Automatic AI evaluation</strong>}
                />
                <p className="small text-muted mt-2 mb-0">
                  Students receive an immediate result. The teacher can watch the score
                  appear in live monitoring and change any AI-generated mark later.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card
              role="button"
              className={`h-100 rounded-3 ${
                evaluationMode === 'teacher_review'
                  ? 'border-primary bg-primary bg-opacity-10'
                  : 'border'
              }`}
              onClick={() => setEvaluationMode('teacher_review')}
            >
              <Card.Body>
                <Form.Check
                  type="radio"
                  name="evaluation-mode"
                  id="evaluation-teacher-review"
                  checked={evaluationMode === 'teacher_review'}
                  onChange={() => setEvaluationMode('teacher_review')}
                  label={<strong>Teacher approval required</strong>}
                />
                <p className="small text-muted mt-2 mb-0">
                  AI prepares suggested marks and feedback, but the result remains
                  provisional until the teacher reviews the short answers.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card className="border-0 shadow-sm rounded-4 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
          <div>
            <h5 className="fw-bold mb-1">
              Questions ({questions.length})
            </h5>

            <p className="text-muted small mb-0">
              Total Marks: {totalMarks}
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <Button
              variant="outline-primary"
              onClick={() => addQuestion('mcq')}
              className="rounded-pill fw-bold"
            >
              + MCQ
            </Button>

            <Button
              variant="outline-success"
              onClick={() => addQuestion('short')}
              className="rounded-pill fw-bold"
            >
              + Short Answer
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <Alert variant="info">
            No questions have been added. Use the buttons
            above to add a question.
          </Alert>
        ) : (
          <Accordion defaultActiveKey="0">
            {questions.map(
              (question, questionIndex) => (
                <Accordion.Item
                  eventKey={questionIndex.toString()}
                  key={`${question.type}-${questionIndex}`}
                  className="mb-3 border rounded-3 overflow-hidden"
                >
                  <Accordion.Header>
                    <div className="w-100 pe-3">
                      <strong>
                        Q{questionIndex + 1}.
                      </strong>{' '}

                      {question.text?.substring(0, 60) ||
                        `[${question.type.toUpperCase()}]`}

                      <span className="badge bg-info ms-2">
                        {Number(question.marks) || 0} marks
                      </span>
                    </div>
                  </Accordion.Header>

                  <Accordion.Body>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">
                        Question Statement
                      </Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={question.text}
                        onChange={(event) =>
                          updateQuestion(questionIndex, {
                            text: event.target.value
                          })
                        }
                        placeholder="Enter the question statement"
                        className="rounded-3"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">
                        Marks
                      </Form.Label>

                      <Form.Control
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={question.marks}
                        onChange={(event) =>
                          updateQuestion(questionIndex, {
                            marks: Number(event.target.value)
                          })
                        }
                        className="rounded-3"
                      />
                    </Form.Group>

                    {question.type === 'mcq' && (
                      <div className="mb-3">
                        <Form.Label className="fw-bold">
                          Multiple Choice Options
                        </Form.Label>

                        {question.options.map(
                          (option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="d-flex gap-2 align-items-center mb-2"
                            >
                              <Form.Control
                                value={option}
                                onChange={(event) =>
                                  updateQuestionOption(
                                    questionIndex,
                                    optionIndex,
                                    event.target.value
                                  )
                                }
                                placeholder={`Option ${String.fromCharCode(
                                  65 + optionIndex
                                )}`}
                                className="rounded-3"
                              />

                              <Form.Check
                                type="radio"
                                name={`correct-answer-${questionIndex}`}
                                aria-label={`Mark option ${
                                  optionIndex + 1
                                } as correct`}
                                checked={
                                  option.trim() !== '' &&
                                  question.answer === option
                                }
                                disabled={option.trim() === ''}
                                onChange={() =>
                                  updateQuestion(questionIndex, {
                                    answer: option
                                  })
                                }
                              />

                              <span className="text-muted small text-nowrap">
                                Correct
                              </span>

                              {question.options.length > 2 && (
                                <Button
                                  variant="link"
                                  className="text-danger p-1"
                                  aria-label={`Remove option ${
                                    optionIndex + 1
                                  }`}
                                  onClick={() =>
                                    removeQuestionOption(
                                      questionIndex,
                                      optionIndex
                                    )
                                  }
                                >
                                  <FaTrashAlt />
                                </Button>
                              )}
                            </div>
                          )
                        )}

                        {question.options.length < 6 && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              addQuestionOption(questionIndex)
                            }
                            className="text-primary p-0 mt-2"
                          >
                            + Add Option
                          </Button>
                        )}
                      </div>
                    )}

                    {question.type === 'short' && (
                      <div className="mb-3">
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-bold d-flex align-items-center gap-2">
                            <FaRobot className="text-primary" />
                            Evaluation Rubric
                          </Form.Label>

                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={question.rubric}
                            onChange={(event) =>
                              updateQuestion(questionIndex, {
                                rubric: event.target.value
                              })
                            }
                            placeholder="Describe the expected answer or evaluation criteria"
                            className="rounded-3"
                          />

                          <Form.Text className="text-muted">
                            This rubric can be used for
                            teacher or AI-assisted evaluation.
                          </Form.Text>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label className="fw-bold">
                            Hint (Optional)
                          </Form.Label>

                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={question.hint}
                            onChange={(event) =>
                              updateQuestion(questionIndex, {
                                hint: event.target.value
                              })
                            }
                            placeholder="Add an optional hint for students"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </div>
                    )}

                    <div className="text-end mt-4 pt-3 border-top">
                      <Button
                        variant="link"
                        className="text-danger p-0"
                        onClick={() =>
                          removeQuestion(questionIndex)
                        }
                      >
                        <FaTrashAlt /> Remove Question
                      </Button>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              )
            )}
          </Accordion>
        )}
      </Card>

      <div className="mt-4 d-flex flex-wrap justify-content-end gap-2">
        <Button
          variant="outline-secondary"
          className="rounded-pill fw-bold px-4"
          onClick={() => handleSubmitQuiz('draft')}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save as Draft'}
        </Button>

        <Button
          variant="primary"
          onClick={() => handleSubmitQuiz('published')}
          disabled={isSaving}
          className="rounded-pill fw-bold px-4 d-flex align-items-center gap-2"
        >
          {isSaving ? (
            <>
              <Spinner animation="border" size="sm" />
              Saving...
            </>
          ) : (
            <>
              <FaSave />
              Save & Publish Quiz
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateQuiz;