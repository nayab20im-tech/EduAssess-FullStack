import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { FaArrowRight, FaChartLine, FaClipboardCheck, FaKey, FaMedal, FaPercentage } from 'react-icons/fa';
import api, { getApiErrorMessage } from '../api/client';
import '../styles/Dashboard.css';

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [quizCode, setQuizCode] = useState('');
  const [joiningQuiz, setJoiningQuiz] = useState(false);
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [analyticsRes, quizzesRes] = await Promise.all([
          api.get('/analytics/student'),
          api.get('/quizzes')
        ]);

        if (analyticsRes.data.success) setDashboardData(analyticsRes.data.data);
        if (quizzesRes.data.success) setQuizzes(quizzesRes.data.quizzes);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load your dashboard.'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleJoinByCode = async (event) => {
    event.preventDefault();
    const normalizedCode = quizCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!normalizedCode) {
      setJoinError('Enter the access code shared by your teacher.');
      return;
    }

    setJoiningQuiz(true);
    setJoinError('');

    try {
      const { data } = await api.post('/quizzes/access/by-code', {
        accessCode: normalizedCode
      });

      sessionStorage.setItem(
        `eduassess-quiz-code-${data.quiz._id}`,
        normalizedCode
      );
      setShowCodeModal(false);
      navigate(`/quiz/${data.quiz._id}/attempt`);
    } catch (requestError) {
      setJoinError(
        getApiErrorMessage(requestError, 'Unable to find a quiz for this code.')
      );
    } finally {
      setJoiningQuiz(false);
    }
  };

  const stats = [
    {
      title: 'Quizzes completed',
      value: dashboardData?.stats?.quizzesCompleted ?? 0,
      note: 'Fully graded assessments',
      icon: <FaClipboardCheck />,
      tone: 'purple'
    },
    {
      title: 'Average score',
      value: `${dashboardData?.stats?.averageScore ?? 0}%`,
      note: 'Across submitted quizzes',
      icon: <FaPercentage />,
      tone: 'mint'
    },
    {
      title: 'Class rank',
      value: dashboardData?.stats?.currentRank
        ? `#${dashboardData.stats.currentRank}`
        : '—',
      note: 'Based on average performance',
      icon: <FaMedal />,
      tone: 'orange'
    },
    {
      title: 'Highest score',
      value: `${dashboardData?.stats?.highestScore ?? 0}%`,
      note: 'Your best result so far',
      icon: <FaChartLine />,
      tone: 'blue'
    }
  ];

  const performanceData = dashboardData?.performanceData || [];
  const subjectData = (dashboardData?.subjectData || []).filter(
    (item) => item.name !== 'No Data'
  );
  const recentResults = dashboardData?.recentGrades || [];

  const focusAreas = useMemo(
    () =>
      [...subjectData]
        .sort((a, b) => a.value - b.value)
        .slice(0, 2),
    [subjectData]
  );

  if (loading) {
    return (
      <div className="empty-panel">
        <Spinner animation="border" />
        <p>Loading your learning dashboard...</p>
      </div>
    );
  }

  return (
    <div className="student-dashboard-page">
      <Modal
        show={showCodeModal}
        onHide={() => {
          if (!joiningQuiz) {
            setShowCodeModal(false);
            setJoinError('');
          }
        }}
        centered
      >
        <Modal.Header closeButton={!joiningQuiz} className="border-bottom-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaKey className="text-primary" /> Join quiz with code
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Enter the private code provided by your teacher.
          </p>
          {joinError && <Alert variant="danger">{joinError}</Alert>}
          <Form onSubmit={handleJoinByCode}>
            <Form.Control
              value={quizCode}
              onChange={(event) =>
                setQuizCode(
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
              disabled={joiningQuiz}
            />
            <Button type="submit" className="w-100" disabled={joiningQuiz || !quizCode.trim()}>
              {joiningQuiz ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Checking code...
                </>
              ) : (
                <>
                  <FaKey className="me-2" /> Open assessment
                </>
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Card className="dashboard-welcome">
        <h2>Ready for your next challenge?</h2>
        <p>
          Continue an available quiz, review your real results, and focus on the
          topics that need more practice.
        </p>
      </Card>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row className="g-3 mb-4">
        {stats.map((item) => (
          <Col sm={6} xl={3} key={item.title}>
            <Card className="metric-card">
              <div className="metric-card-inner">
                <div>
                  <p className="metric-label">{item.title}</p>
                  <h3 className="metric-value">{item.value}</h3>
                  <div className="metric-note">{item.note}</div>
                </div>
                <span className={`metric-icon ${item.tone}`}>{item.icon}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="mb-4 overflow-hidden">
        <Card.Body className="p-4 pb-2">
          <div className="page-heading-row mb-2">
            <div>
              <h5 className="section-card-title">Available quizzes</h5>
              <p>Published assessments you have not attempted yet.</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => {
                  setQuizCode('');
                  setJoinError('');
                  setShowCodeModal(true);
                }}
              >
                <FaKey className="me-2" /> Join with code
              </Button>
              <Badge bg="primary">{quizzes.length} available</Badge>
            </div>
          </div>
        </Card.Body>

        <Table responsive hover className="align-middle mb-0">
          <thead>
            <tr>
              <th className="ps-4">Quiz</th>
              <th>Subject</th>
              <th>Duration</th>
              <th className="text-end pe-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-panel m-3">
                    <span className="empty-panel-icon"><FaClipboardCheck /></span>
                    <strong>No quizzes waiting</strong>
                    <p>Your teacher&apos;s published quizzes will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              quizzes.map((quiz) => (
                <tr key={quiz._id}>
                  <td className="ps-4">
                    <strong className="text-dark">{quiz.title}</strong>
                  </td>
                  <td>
                    <Badge bg="info">
                      {quiz.subject?.name || quiz.category}
                    </Badge>
                  </td>
                  <td className="text-muted">{quiz.timeLimit} minutes</td>
                  <td className="text-end pe-4">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/quiz/${quiz._id}/attempt`)}
                    >
                      Start quiz <FaArrowRight className="ms-2" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="section-card-title">Performance trend</h5>
              <p className="section-card-subtitle mb-3">
                Scores from your submitted assessments.
              </p>

              {performanceData.length === 0 ? (
                <div className="empty-panel">
                  <strong>No performance history yet</strong>
                  <p>Complete a quiz to start building your trend.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeeF3" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ stroke: '#d8d0f8' }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6544ed"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#6544ed' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="section-card-title">Subject performance</h5>
              <p className="section-card-subtitle">Your average by subject.</p>

              {subjectData.length === 0 ? (
                <div className="empty-panel">
                  <strong>No subject data yet</strong>
                  <p>Graded quizzes will appear here.</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={185}>
                    <PieChart>
                      <Pie
                        data={subjectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={76}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {subjectData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="chart-legend-row">
                    {subjectData.map((item) => (
                      <span key={item.name}>
                        <i style={{ background: item.color }} /> {item.name} · {item.value}%
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="overflow-hidden">
            <Card.Body className="p-4 pb-2">
              <h5 className="section-card-title">Recent results</h5>
              <p className="section-card-subtitle">Your latest submissions.</p>
            </Card.Body>

            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th className="ps-4">Assessment</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Report</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-panel m-3">
                        <strong>No results yet</strong>
                        <p>Your submitted quizzes will appear here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentResults.map((result, index) => (
                    <tr key={`${result.quizTitle}-${result.submittedAt || index}`}>
                      <td className="ps-4">
                        <strong className="text-dark">{result.quizTitle}</strong>
                      </td>
                      <td>
                        <strong className="text-success">{result.percentage}%</strong>
                      </td>
                      <td>
                        <Badge bg={result.status === 'fully_graded' ? 'success' : 'warning'}>
                          {result.status === 'fully_graded' ? 'Graded' : 'Under review'}
                        </Badge>
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          disabled={!result.submissionId}
                          onClick={() => navigate(`/results/${result.submissionId}`)}
                        >
                          View / download
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="section-card-title">Focus areas</h5>
              <p className="section-card-subtitle mb-4">
                Your lowest-scoring subjects.
              </p>

              {focusAreas.length === 0 ? (
                <div className="empty-panel">
                  <strong>No focus areas yet</strong>
                  <p>Complete graded quizzes to receive guidance.</p>
                </div>
              ) : (
                focusAreas.map((area) => (
                  <div className="mastery-item" key={area.name}>
                    <div>
                      <span>{area.name}</span>
                      <strong>{area.value}%</strong>
                    </div>
                    <ProgressBar now={area.value} style={{ height: 8 }} />
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
