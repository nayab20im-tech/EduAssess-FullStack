import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  ProgressBar,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import {
  FaClipboardCheck,
  FaDesktop,
  FaEye,
  FaPaperPlane,
  FaRobot,
  FaShieldAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const LiveMonitoring = () => {
  const [students, setStudents] = useState([]);
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const { data } = await api.get('/activity/live', {
          withCredentials: true
        });
        if (data.success) {
          setStudents(data.liveData || []);
          setRecentEvaluations(data.recentEvaluations || []);
        }
      } catch (error) {
        console.error('Error fetching live stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="empty-panel">
        <Spinner animation="border" />
        <p>Connecting to active quiz sessions...</p>
      </div>
    );
  }

  return (
    <div className="monitoring-page">
      <div className="page-heading-row">
        <div>
          <span className="page-kicker">Real-time activity</span>
          <h3>Live monitoring and evaluation</h3>
          <p>
            Watch active sessions and see automatic AI evaluations as soon as
            students submit.
          </p>
        </div>
        <span className="badge bg-success">
          <FaShieldAlt className="me-1" /> Monitoring enabled
        </span>
      </div>

      <Card className="mb-4 overflow-hidden">
        <Card.Body className="p-4 pb-2">
          <div className="page-heading-row mb-2">
            <div>
              <h5 className="section-card-title">Runtime evaluations</h5>
              <p>Submissions received during the last 15 minutes.</p>
            </div>
            <Badge bg="primary">
              <FaRobot className="me-1" /> {recentEvaluations.length} recent
            </Badge>
          </div>
        </Card.Body>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th className="ps-4">Student</th>
              <th>Assessment</th>
              <th>Evaluation mode</th>
              <th>Score</th>
              <th>Status</th>
              <th className="text-end pe-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentEvaluations.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-panel m-3">
                    <span className="empty-panel-icon">
                      <FaClipboardCheck />
                    </span>
                    <strong>No recent submissions</strong>
                    <p>AI scores will appear here immediately after submission.</p>
                  </div>
                </td>
              </tr>
            ) : (
              recentEvaluations.map((evaluation) => (
                <tr key={evaluation._id}>
                  <td className="ps-4">
                    <strong className="text-dark">{evaluation.studentName}</strong>
                    <br />
                    <small className="text-muted">Roll no. {evaluation.rollNo}</small>
                  </td>
                  <td>{evaluation.quizTitle}</td>
                  <td>
                    <Badge
                      bg={
                        evaluation.evaluationMode === 'automatic'
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {evaluation.evaluationMode === 'automatic'
                        ? 'Automatic AI'
                        : 'Teacher approval'}
                    </Badge>
                  </td>
                  <td>
                    <strong>{evaluation.totalScore} / {evaluation.maxScore}</strong>
                    <br />
                    <small className="text-muted">{evaluation.percentage}%</small>
                  </td>
                  <td>
                    <Badge
                      bg={
                        evaluation.overallStatus === 'fully_graded'
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {evaluation.overallStatus === 'fully_graded'
                        ? 'Evaluated'
                        : 'Review pending'}
                    </Badge>
                  </td>
                  <td className="text-end pe-4">
                    <Button size="sm" onClick={() => navigate('/evaluations')}>
                      <FaEye className="me-2" /> Review / modify
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <div className="page-heading-row mt-4">
        <div>
          <span className="page-kicker">Active attempts</span>
          <h5 className="section-card-title">Students currently taking a quiz</h5>
        </div>
        <Badge bg="secondary">{students.length} active</Badge>
      </div>

      {students.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-panel-icon">
            <FaDesktop />
          </span>
          <strong>No active sessions</strong>
          <p>Students currently taking a quiz will appear here automatically.</p>
        </div>
      ) : (
        <Row className="g-4">
          {students.map((student) => {
            const risk = Math.min(student.warnings * 25, 100);
            const warning = student.warnings > 2;

            return (
              <Col md={6} xl={4} key={student._id}>
                <Card className={`monitor-card h-100 ${warning ? 'is-warning' : ''}`}>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="fw-bold mb-1">{student.studentName}</h6>
                        <span className="text-muted small">
                          Roll no. {student.rollNo}
                        </span>
                      </div>
                      <Badge bg={warning ? 'danger' : 'success'}>
                        {warning ? 'Needs attention' : 'Active'}
                      </Badge>
                    </div>

                    <div className="p-3 bg-light rounded-3 mb-3">
                      <span className="small text-muted d-block mb-1">
                        {student.quizTitle}
                      </span>
                      <strong className="small text-dark">{student.activity}</strong>
                    </div>

                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">
                        Risk level · {student.tabSwitches} tab switches
                      </span>
                      <strong>{risk}%</strong>
                    </div>

                    <ProgressBar
                      now={risk}
                      variant={warning ? 'danger' : risk > 0 ? 'warning' : 'success'}
                      style={{ height: 7 }}
                    />

                    <Button variant="light" className="w-100 mt-4">
                      <FaPaperPlane className="me-2" /> Send warning
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default LiveMonitoring;
