import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner
} from 'react-bootstrap';
import {
  FaCheck,
  FaClipboardCheck,
  FaDownload,
  FaEnvelope,
  FaHistory,
  FaRobot
} from 'react-icons/fa';
import api, { getApiErrorMessage } from '../api/client';

const normalizeEvaluation = (submission) => ({
  ...submission,
  teacherScore:
    submission.teacherScore ??
    submission.finalScore ??
    submission.aiScore ??
    0,
  teacherComments:
    submission.teacherComments || submission.aiFeedback || ''
});

const PendingEvaluations = () => {
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [activeView, setActiveView] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [emailingSubmissionId, setEmailingSubmissionId] = useState('');
  const [error, setError] = useState('');

  const fetchEvaluations = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const [pendingResponse, completedResponse] = await Promise.all([
        api.get('/submissions/pending', { withCredentials: true }),
        api.get('/submissions/completed', { withCredentials: true })
      ]);

      if (pendingResponse.data.success) {
        setPending(
          (pendingResponse.data.pendingEvaluations || []).map(normalizeEvaluation)
        );
      }

      if (completedResponse.data.success) {
        setCompleted(
          (completedResponse.data.completedEvaluations || []).map(
            normalizeEvaluation
          )
        );
      }
      setError('');
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Unable to load evaluation records.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial page load and runtime refresh for incoming submissions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvaluations(true);
    const interval = window.setInterval(() => fetchEvaluations(false), 5000);
    return () => window.clearInterval(interval);
  }, [fetchEvaluations]);

  const evaluations = activeView === 'pending' ? pending : completed;

  const updateEvaluation = (submissionId, questionId, field, value) => {
    const updateList = (current) =>
      current.map((item) =>
        item.submissionId === submissionId && item.questionId === questionId
          ? { ...item, [field]: value }
          : item
      );

    if (activeView === 'pending') setPending(updateList);
    else setCompleted(updateList);
  };

  const sendResultEmail = async (submissionId) => {
    setEmailingSubmissionId(submissionId);
    setError('');

    try {
      const { data } = await api.post(
        `/submissions/${submissionId}/email-result`,
        {},
        { withCredentials: true }
      );

      setCompleted((current) =>
        current.map((item) =>
          item.submissionId === submissionId
            ? { ...item, resultEmailSentAt: data.sentAt || new Date().toISOString() }
            : item
        )
      );
      window.alert(data.message || 'The result email was sent successfully.');
      return true;
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'The grade was saved, but the result email could not be sent.'
        )
      );
      return false;
    } finally {
      setEmailingSubmissionId('');
    }
  };

  const handleGradeCommit = async (item, emailAfterSave = false) => {
    const score = Number(item.teacherScore);

    if (!Number.isFinite(score) || score < 0 || score > item.maxMarks) {
      window.alert(`Score must be between 0 and ${item.maxMarks}.`);
      return;
    }

    const key = `${item.submissionId}-${item.questionId}`;
    setSavingKey(key);
    setError('');

    try {
      const { data } = await api.put(
        `/submissions/${item.submissionId}/grade`,
        {
          questionId: item.questionId,
          teacherScore: score,
          teacherComment: item.teacherComments
        },
        { withCredentials: true }
      );

      if (emailAfterSave) {
        if (data.submission?.overallStatus === 'fully_graded') {
          await sendResultEmail(item.submissionId);
        } else {
          window.alert(
            'The mark was saved. Review the remaining answers before emailing the final result.'
          );
        }
      } else {
        window.alert(
          activeView === 'completed'
            ? 'The AI-generated evaluation was updated and the student was notified.'
            : 'Grade saved and the student was notified.'
        );
      }

      await fetchEvaluations(false);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to save the evaluation.'));
    } finally {
      setSavingKey('');
    }
  };

  const downloadReport = async (submissionId, quizTitle, studentName) => {
    try {
      const response = await api.get(`/submissions/${submissionId}/report`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quizTitle || 'quiz'}-${studentName || 'student'}-report.pdf`
        .replace(/[^a-zA-Z0-9-_.]+/g, '-');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to download the report.'));
    }
  };

  const groupedCount = useMemo(
    () => new Set(evaluations.map((item) => item.submissionId)).size,
    [evaluations]
  );

  if (loading) {
    return (
      <div className="empty-panel">
        <Spinner animation="border" />
        <p>Loading answers for review...</p>
      </div>
    );
  }

  return (
    <div className="evaluations-page">
      <div className="page-heading-row">
        <div>
          <span className="page-kicker">Teacher review</span>
          <h3>AI and teacher evaluations</h3>
          <p>
            Review pending suggestions, inspect automatic results, and override
            any AI-generated score or feedback.
          </p>
        </div>
        <Badge bg="primary">{groupedCount} submissions</Badge>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button
          variant={activeView === 'pending' ? 'primary' : 'outline-primary'}
          onClick={() => setActiveView('pending')}
        >
          <FaClipboardCheck className="me-2" /> Pending review ({pending.length})
        </Button>
        <Button
          variant={activeView === 'completed' ? 'primary' : 'outline-primary'}
          onClick={() => setActiveView('completed')}
        >
          <FaHistory className="me-2" /> Automatic / completed ({completed.length})
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-panel-icon">
            <FaClipboardCheck />
          </span>
          <strong>
            {activeView === 'pending'
              ? 'Everything is reviewed'
              : 'No completed short-answer evaluations yet'}
          </strong>
          <p>
            {activeView === 'pending'
              ? 'New teacher-review submissions will appear here automatically.'
              : 'Automatic AI evaluations will appear here after students submit.'}
          </p>
        </div>
      ) : (
        evaluations.map((item, index) => {
          const key = `${item.submissionId}-${item.questionId}`;
          const isSaving = savingKey === key;
          const isEmailing = emailingSubmissionId === item.submissionId;
          const isFirstCardForSubmission =
            evaluations.findIndex(
              (evaluation) => evaluation.submissionId === item.submissionId
            ) === index;
          const pendingAnswersForSubmission = pending.filter(
            (evaluation) => evaluation.submissionId === item.submissionId
          ).length;
          const canSaveAndEmail =
            activeView === 'pending' && pendingAnswersForSubmission === 1;

          return (
            <Card key={key} className="mb-4">
              <Card.Body className="p-4">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                  <div>
                    <span className="page-kicker">
                      {item.quizTitle} · {item.studentName}
                      {item.studentRollNo ? ` (${item.studentRollNo})` : ''}
                    </span>
                    <h5 className="fw-bold mt-1 mb-0">
                      {index + 1}. {item.questionText}
                    </h5>
                  </div>
                  <Badge
                    bg={
                      item.evaluationMode === 'automatic' ? 'success' : 'warning'
                    }
                  >
                    {item.evaluationMode === 'automatic'
                      ? 'Automatic AI evaluation'
                      : 'Teacher approval required'}
                  </Badge>
                  {item.resultEmailSentAt && isFirstCardForSubmission && (
                    <Badge bg="info">
                      <FaEnvelope className="me-1" /> Emailed{' '}
                      {new Date(item.resultEmailSentAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>

                <div className="p-3 bg-light rounded-3 mb-3">
                  <span className="small text-muted fw-bold d-block mb-2">
                    Student answer
                  </span>
                  <p className="mb-0 small lh-lg">
                    {item.studentAnswer || 'No answer submitted.'}
                  </p>
                </div>

                <div className="ai-feedback-box mb-4">
                  <FaRobot size={22} className="text-primary mt-1" />
                  <div>
                    <h6 className="fw-bold text-primary mb-1">
                      AI grading suggestion
                    </h6>
                    <p className="mb-1 small">
                      Suggested score:{' '}
                      <strong>
                        {item.aiScore} / {item.maxMarks}
                      </strong>{' '}
                      · Confidence {item.aiConfidence || 0}%
                    </p>
                    <p className="mb-1 small text-muted">
                      {item.aiFeedback || 'No AI feedback available.'}
                    </p>
                    {item.aiMissingConcepts?.length > 0 && (
                      <small className="text-muted">
                        Missing concepts: {item.aiMissingConcepts.join(', ')}
                      </small>
                    )}
                  </div>
                </div>

                <Row className="g-3">
                  <Col md={3}>
                    <Form.Label>Final score</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max={item.maxMarks}
                      step="0.5"
                      value={item.teacherScore}
                      onChange={(event) =>
                        updateEvaluation(
                          item.submissionId,
                          item.questionId,
                          'teacherScore',
                          Number(event.target.value)
                        )
                      }
                    />
                  </Col>
                  <Col md={9}>
                    <Form.Label>Feedback for the student</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={item.teacherComments}
                      onChange={(event) =>
                        updateEvaluation(
                          item.submissionId,
                          item.questionId,
                          'teacherComments',
                          event.target.value
                        )
                      }
                    />
                  </Col>
                </Row>

                <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                  <Button
                    variant="outline-secondary"
                    onClick={() =>
                      downloadReport(
                        item.submissionId,
                        item.quizTitle,
                        item.studentName
                      )
                    }
                  >
                    <FaDownload className="me-2" /> Download report
                  </Button>
                  {activeView === 'completed' && isFirstCardForSubmission && (
                    <Button
                      variant="outline-primary"
                      onClick={() => sendResultEmail(item.submissionId)}
                      disabled={isEmailing || !item.studentEmail}
                      title={
                        item.studentEmail
                          ? `Send the reviewed marks and PDF report to ${item.studentEmail}`
                          : 'This student does not have an email address'
                      }
                    >
                      {isEmailing ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Sending email...
                        </>
                      ) : (
                        <>
                          <FaEnvelope className="me-2" />
                          {item.resultEmailSentAt ? 'Resend result email' : 'Email result to student'}
                        </>
                      )}
                    </Button>
                  )}

                  {canSaveAndEmail && (
                    <Button
                      variant="success"
                      onClick={() => handleGradeCommit(item, true)}
                      disabled={isSaving || isEmailing || !item.studentEmail}
                    >
                      <FaEnvelope className="me-2" /> Save & email final result
                    </Button>
                  )}

                  <Button onClick={() => handleGradeCommit(item)} disabled={isSaving || isEmailing}>
                    {isSaving ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaCheck className="me-2" />
                        {activeView === 'completed'
                          ? 'Update AI evaluation'
                          : 'Save grade and notify'}
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default PendingEvaluations;
