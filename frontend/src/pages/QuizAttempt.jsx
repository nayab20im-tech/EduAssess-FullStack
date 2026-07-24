import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaClock,
  FaFlag,
  FaKey,
  FaRegFlag,
  FaTimes
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';

const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

const QuizAttempt = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  const submissionStarted = useRef(false);
  const tabSwitchRef = useRef(0);

  const openQuizWithCode = useCallback(
    async (codeValue) => {
      const normalizedCode = String(codeValue || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      if (!normalizedCode) {
        setError('Enter the access code shared by your teacher.');
        return;
      }

      setVerifyingCode(true);
      setLoading(true);
      setError('');

      try {
        const { data } = await api.post(`/quizzes/${quizId}/access`, {
          accessCode: normalizedCode
        });

        if (!data.success) return;

        const loadedQuiz = data.quiz;
        const loadedQuestions = loadedQuiz.questions || [];

        setAccessCode(normalizedCode);
        sessionStorage.setItem(`eduassess-quiz-code-${quizId}`, normalizedCode);
        setQuiz(loadedQuiz);
        setQuestions(loadedQuestions);
        setTimeLeft((loadedQuiz.timeLimit || 1) * 60);
        setStartedAt(new Date().toISOString());
        await api.post('/activity/start', { quizId }).catch(() => {});
      } catch (requestError) {
        sessionStorage.removeItem(`eduassess-quiz-code-${quizId}`);
        setError(getApiErrorMessage(requestError, 'The access code could not be verified.'));
      } finally {
        setLoading(false);
        setVerifyingCode(false);
      }
    },
    [quizId]
  );

  useEffect(() => {
    const savedCode = sessionStorage.getItem(`eduassess-quiz-code-${quizId}`);
    if (savedCode) {
      // Restore a previously verified code after a page refresh.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openQuizWithCode(savedCode);
    } else {
      setLoading(false);
    }
  }, [openQuizWithCode, quizId]);

  useEffect(() => {
    const recordTabSwitch = () => {
      if (!document.hidden || !quiz) return;

      const nextCount = tabSwitchRef.current + 1;
      tabSwitchRef.current = nextCount;
      setTabSwitchCount(nextCount);
      setWarnings(nextCount);

      api.put('/activity/update', {
        quizId,
        tabSwitchCount: nextCount,
        warnings: nextCount,
        suspiciousActivity: `Tab switch detected at ${new Date().toISOString()}`,
        monitoringStatus: nextCount >= 3 ? 'warning' : 'active',
        currentActivity: 'Left the quiz tab'
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', recordTabSwitch);
    return () => document.removeEventListener('visibilitychange', recordTabSwitch);
  }, [quiz, quizId]);

  const answeredCount = useMemo(
    () =>
      questions.filter((question) =>
        String(answers[question._id] || '').trim()
      ).length,
    [answers, questions]
  );

  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  const submitQuiz = useCallback(
    async (forced = false) => {
      if (submissionStarted.current || !quiz || questions.length === 0) return;

      const unanswered = questions.length - answeredCount;
      if (
        !forced &&
        unanswered > 0 &&
        !window.confirm(`${unanswered} question(s) are unanswered. Submit anyway?`)
      ) {
        return;
      }

      submissionStarted.current = true;
      setSubmitting(true);
      setError('');

      try {
        const elapsedSeconds = startedAt
          ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
          : 0;

        const payload = {
          quizId,
          accessCode,
          startedAt,
          timeTaken: elapsedSeconds,
          tabSwitchCount,
          warnings,
          suspiciousFlags:
            tabSwitchCount > 0 ? [`${tabSwitchCount} tab switch(es) detected`] : [],
          answers: questions.map((question) => ({
            questionId: question._id,
            answer: String(answers[question._id] || '').trim()
          }))
        };

        const { data } = await api.post('/submissions', payload, {
          timeout: 180000
        });
        await api.post('/activity/end', { quizId }).catch(() => {});

        navigate(`/results/${data.submission._id}`, { replace: true });
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to submit this quiz.'));
        submissionStarted.current = false;
        setSubmitting(false);
      }
    },
    [
      accessCode,
      answeredCount,
      answers,
      navigate,
      questions,
      quiz,
      quizId,
      startedAt,
      tabSwitchCount,
      warnings
    ]
  );

  useEffect(() => {
    if (!quiz || submitting) return undefined;

    if (timeLeft <= 0) {
      const submitTimer = window.setTimeout(() => submitQuiz(true), 0);
      return () => window.clearTimeout(submitTimer);
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [quiz, submitQuiz, submitting, timeLeft]);

  const toggleFlag = () => {
    setFlagged((items) =>
      items.includes(currentQ)
        ? items.filter((item) => item !== currentQ)
        : [...items, currentQ]
    );
  };

  if (loading) {
    return (
      <div className="empty-panel">
        <Spinner animation="border" />
        <p>{verifyingCode ? 'Verifying quiz access code...' : 'Preparing your quiz...'}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Card className="border-0 shadow-sm rounded-4" style={{ maxWidth: 520, width: '100%' }}>
          <Card.Body className="p-4 p-md-5 text-center">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary mb-3"
              style={{ width: 64, height: 64 }}
            >
              <FaKey size={26} />
            </span>
            <h3 className="fw-bold">Enter quiz access code</h3>
            <p className="text-muted">
              Only students who received the code from the teacher can open this assessment.
            </p>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form
              onSubmit={(event) => {
                event.preventDefault();
                openQuizWithCode(accessCode);
              }}
            >
              <Form.Control
                value={accessCode}
                onChange={(event) =>
                  setAccessCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 12)
                  )
                }
                placeholder="e.g. A7K9P2XZ"
                className="text-center font-monospace fw-bold fs-4 mb-3"
                style={{ letterSpacing: '0.16em' }}
                autoFocus
                disabled={verifyingCode}
              />
              <Button type="submit" className="w-100" disabled={verifyingCode || !accessCode.trim()}>
                {verifyingCode ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <FaKey className="me-2" /> Open quiz
                  </>
                )}
              </Button>
            </Form>

            <Button variant="link" className="mt-3" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="empty-panel">
        <strong>This quiz has no questions.</strong>
        <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }

  const question = questions[currentQ];

  return (
    <div className="quiz-attempt-page animate-entrance">
      <div className="quiz-session-bar">
        <div className="quiz-session-title">
          <span className="quiz-course-icon">
            {(quiz.subject?.code || quiz.category || 'QZ').slice(0, 2).toUpperCase()}
          </span>
          <div>
            <span className="page-kicker">
              {quiz.subject?.name || quiz.category}
            </span>
            <h3>{quiz.title}</h3>
          </div>
        </div>

        <div className={`quiz-timer ${timeLeft < 300 ? 'is-low' : ''}`}>
          <FaClock />
          <div>
            <small>Time remaining</small>
            <strong>{formattedTime}</strong>
          </div>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {tabSwitchCount > 0 && (
        <Alert variant="warning" className="mb-4">
          {tabSwitchCount} tab switch{tabSwitchCount === 1 ? '' : 'es'} recorded.
          Stay on the quiz page to avoid integrity warnings.
        </Alert>
      )}

      <Row className="g-4">
        <Col xl={8}>
          <Card className="quiz-question-card h-100">
            <Card.Body className="p-4 p-lg-5 d-flex flex-column">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                <div>
                  <span className="question-counter">
                    Question {currentQ + 1} of {questions.length}
                  </span>
                  <span className="question-type-badge">
                    {question.type === 'mcq' ? 'Multiple choice' : 'Short answer'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`flag-question-button ${
                    flagged.includes(currentQ) ? 'active' : ''
                  }`}
                  onClick={toggleFlag}
                >
                  {flagged.includes(currentQ) ? <FaFlag /> : <FaRegFlag />}
                  {flagged.includes(currentQ) ? 'Flagged' : 'Flag for review'}
                </button>
              </div>

              <h2 className="quiz-question-text">{question.text}</h2>

              {question.type === 'mcq' ? (
                <div className="quiz-options-list">
                  {(question.options || []).map((option, index) => {
                    const selected = answers[question._id] === option;

                    return (
                      <button
                        type="button"
                        key={`${question._id}-${option}`}
                        className={`quiz-answer-option ${selected ? 'selected' : ''}`}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question._id]: option
                          }))
                        }
                        disabled={submitting}
                      >
                        <span className="option-letter">{optionLetters[index]}</span>
                        <span>{option}</span>
                        <span className="option-check">{selected && <FaCheck />}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="short-answer-area">
                  <Form.Label>Your answer</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={7}
                    placeholder="Write a clear and complete explanation..."
                    value={answers[question._id] || ''}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question._id]: event.target.value
                      }))
                    }
                    disabled={submitting}
                  />

                  {question.hint && (
                    <div className="answer-hint">
                      <span>💡</span>
                      <div>
                        <strong>Helpful hint</strong>
                        <p>{question.hint}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="quiz-question-actions">
                <Button
                  variant="light"
                  disabled={currentQ === 0 || submitting}
                  onClick={() => setCurrentQ((value) => Math.max(value - 1, 0))}
                >
                  <FaArrowLeft className="me-2" /> Previous
                </Button>

                <button
                  type="button"
                  className="clear-answer-button"
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [question._id]: ''
                    }))
                  }
                  disabled={!answers[question._id] || submitting}
                >
                  <FaTimes /> Clear answer
                </button>

                {currentQ === questions.length - 1 ? (
                  <Button onClick={() => submitQuiz(false)} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit quiz <FaCheck className="ms-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      setCurrentQ((value) => Math.min(value + 1, questions.length - 1))
                    }
                    disabled={submitting}
                  >
                    Next question <FaArrowRight className="ms-2" />
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <Card className="quiz-navigator-card position-sticky" style={{ top: 105 }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 className="section-card-title">Quiz progress</h5>
                  <p className="section-card-subtitle">Answers are kept as you move.</p>
                </div>
                <strong className="progress-percent">{progress}%</strong>
              </div>

              <ProgressBar now={progress} className="mb-4" style={{ height: 8 }} />

              <div className="question-grid-labels">
                <span>Questions</span>
                <small>Click to jump</small>
              </div>

              <div className="question-navigator-grid">
                {questions.map((item, index) => {
                  const isAnswered =
                    String(answers[item._id] || '').trim().length > 0;
                  const isFlagged = flagged.includes(index);

                  return (
                    <button
                      type="button"
                      key={item._id}
                      className={`${index === currentQ ? 'current' : ''} ${
                        isAnswered ? 'answered' : ''
                      } ${isFlagged ? 'flagged' : ''}`}
                      onClick={() => setCurrentQ(index)}
                      disabled={submitting}
                    >
                      {index + 1}
                      {isFlagged && <FaFlag />}
                    </button>
                  );
                })}
              </div>

              <div className="quiz-legend">
                <span><i className="legend-current" /> Current</span>
                <span><i className="legend-answered" /> Answered</span>
                <span><i className="legend-flagged" /> Flagged</span>
              </div>

              <div className="quiz-summary-box">
                <div><span>Answered</span><strong>{answeredCount}</strong></div>
                <div><span>Remaining</span><strong>{questions.length - answeredCount}</strong></div>
              </div>

              <Button
                variant="outline-danger"
                className="w-100 mt-3"
                onClick={() => submitQuiz(false)}
                disabled={submitting}
              >
                End and submit quiz
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QuizAttempt;
