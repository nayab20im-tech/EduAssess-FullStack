import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import {
  FaBrain,
  FaCheck,
  FaDownload,
  FaHome,
  FaTrophy
} from 'react-icons/fa';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';

const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};


const QuizResults = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      try {
        const { data } = await api.get(`/submissions/${submissionId}`);
        if (data.success) setSubmission(data.submission);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load this result.'));
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [submissionId]);

  const answers = useMemo(() => submission?.questionsWithAnswers || [], [submission]);

  const chartData = useMemo(() => {
    const groups = {
      mcq: { name: 'Multiple choice', earned: 0, missed: 0 },
      short: { name: 'Short answer', earned: 0, missed: 0 }
    };

    answers.forEach((item) => {
      const type = item.question?.type === 'short' ? 'short' : 'mcq';
      const maxMarks = Number(item.question?.marks || 0);
      const earned = Number(item.finalScore || 0);
      groups[type].earned += earned;
      groups[type].missed += Math.max(maxMarks - earned, 0);
    });

    return Object.values(groups).filter(
      (group) => group.earned > 0 || group.missed > 0
    );
  }, [answers]);

  if (loading) {
    return (
      <div className="empty-panel">
        <Spinner animation="border" />
        <p>Preparing your result...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="empty-panel">
        <Alert variant="danger">{error || 'Result not found.'}</Alert>
        <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }

  const percentage = Number(submission.percentage || 0);
  const fullyGraded = submission.overallStatus === 'fully_graded';
  const mcqCorrect = answers.filter(
    (item) => item.question?.type === 'mcq' && item.isCorrect
  ).length;
  const mcqTotal = answers.filter(
    (item) => item.question?.type === 'mcq'
  ).length;

  const handleDownload = async () => {
    try {
      const response = await api.get(`/submissions/${submissionId}/report`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${submission.quiz?.title || 'quiz'}-result-report.pdf`
        .replace(/[^a-zA-Z0-9-_.]+/g, '-');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to download the PDF report.'));
    }
  };

  return (
    <div className="quiz-results-page">
      <Card className="result-hero-card mb-4">
        <Card.Body>
          <span className="result-celebration"><FaTrophy /></span>
          <div className="result-score-ring"><strong>{percentage}%</strong></div>
          <span className="page-kicker">
            {fullyGraded ? 'Quiz graded' : 'Teacher review pending'}
          </span>
          <h2 className="result-title">{submission.quiz?.title}</h2>
          <p className="result-subtitle">
            {fullyGraded
              ? 'Your final result and question-level feedback are ready.'
              : 'Your submission is saved. Short answers may change after teacher review.'}
          </p>

          <div className="result-stat-row">
            <div>
              <strong>{submission.totalScore} / {submission.maxScore}</strong>
              <span>Marks earned</span>
            </div>
            <div>
              <strong>{formatDuration(submission.timeTaken)}</strong>
              <span>Time used</span>
            </div>
            <div>
              <strong>{mcqCorrect} / {mcqTotal}</strong>
              <span>MCQs correct</span>
            </div>
            <div>
              <strong>{submission.warnings || 0}</strong>
              <span>Integrity warnings</span>
            </div>
          </div>

          <div className="result-actions">
            <Button variant="light" onClick={() => navigate('/dashboard')}>
              <FaHome className="me-2" /> Back to dashboard
            </Button>
            <Button onClick={handleDownload}>
              <FaDownload className="me-2" /> Download PDF report
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <div className="page-heading-row mb-3">
                <div>
                  <h5 className="section-card-title">Marks by question type</h5>
                  <p>Earned and missed marks in this assessment.</p>
                </div>
                <Badge bg={fullyGraded ? 'success' : 'warning'}>
                  {fullyGraded ? 'Final result' : 'Provisional'}
                </Badge>
              </div>

              {chartData.length === 0 ? (
                <div className="empty-panel">
                  <strong>No chart data available</strong>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeeF3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip cursor={{ fill: '#faf9ff' }} />
                    <Bar dataKey="earned" fill="#6544ed" radius={[7, 7, 0, 0]} />
                    <Bar dataKey="missed" fill="#e9dffb" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="result-feedback-card h-100">
            <Card.Body className="p-4 d-flex flex-column">
              <span className="feedback-icon"><FaBrain /></span>
              <span className="page-kicker mt-3">Assessment feedback</span>
              <h4>{fullyGraded ? 'Final feedback' : 'Review in progress'}</h4>
              <p>
                {submission.teacherFeedback ||
                  (fullyGraded
                    ? 'Review the question breakdown below to understand your result.'
                    : 'AI scores are provisional until your teacher completes the review.')}
              </p>
              <div className="feedback-strengths">
                <span><FaCheck /> Submission saved</span>
                <span><FaCheck /> Answers processed</span>
                {!fullyGraded && <span className="needs-work">↗ Teacher approval pending</span>}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="overflow-hidden">
        <Card.Body className="p-4 pb-2">
          <h5 className="section-card-title">Question review</h5>
          <p className="section-card-subtitle">
            Your answers, scores, and available feedback.
          </p>
        </Card.Body>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th className="ps-4">Question</th>
              <th>Your answer</th>
              <th>Score</th>
              <th className="pe-4">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {answers.map((item, index) => (
              <tr key={item.question?._id || index}>
                <td className="ps-4">
                  <strong className="text-dark">{item.question?.text}</strong>
                </td>
                <td>{item.studentAnswer || <span className="text-muted">No answer</span>}</td>
                <td>
                  <Badge bg={Number(item.finalScore || 0) > 0 ? 'success' : 'secondary'}>
                    {item.finalScore || 0} / {item.question?.marks || 0}
                  </Badge>
                </td>
                <td className="pe-4">
                  {item.teacherComment ||
                    item.aiFeedback ||
                    (fullyGraded ? 'No additional feedback.' : 'Pending review.')}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default QuizResults;
