import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import {
  FaChartLine,
  FaClipboardList,
  FaCopy,
  FaExclamationTriangle,
  FaFileExcel,
  FaFilePdf,
  FaKey,
  FaUserGraduate
} from 'react-icons/fa';
import api, { getApiErrorMessage } from '../api/client';

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const TeacherDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsResponse, quizzesResponse] = await Promise.all([
          api.get('/analytics/teacher'),
          api.get('/quizzes')
        ]);
        if (analyticsResponse.data.success) setDashboardData(analyticsResponse.data.data);
        if (quizzesResponse.data.success) setQuizzes(quizzesResponse.data.quizzes || []);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load the teacher dashboard.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadMarks = async () => {
    setExporting(true);
    setError('');

    try {
      const { data } = await api.get('/submissions/export');
      const rows = data.rows || [];
      const headers = [
        'Student Name',
        'Roll Number',
        'Quiz',
        'Marks Obtained',
        'Total Marks',
        'Percentage',
        'Submitted At',
        'Status'
      ];

      const csv = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row) =>
          [
            row.studentName,
            row.rollNumber,
            row.quizName,
            row.marksObtained,
            row.totalMarks,
            row.percentage,
            row.submissionDate,
            row.evaluationStatus
          ]
            .map(escapeCsv)
            .join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eduassess-grades.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to export grades.'));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    setError('');

    try {
      const response = await api.get('/submissions/reports/teacher', {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eduassess-teacher-report.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to download the PDF report.'));
    } finally {
      setDownloadingReport(false);
    }
  };

  const regenerateCode = async (quizId) => {
    try {
      const { data } = await api.patch(`/quizzes/${quizId}/access-code/regenerate`);
      setQuizzes((current) =>
        current.map((quiz) =>
          quiz._id === quizId ? { ...quiz, accessCode: data.accessCode } : quiz
        )
      );
      window.alert('A new access code was generated. The old code no longer works.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to regenerate the code.'));
    }
  };

  const stats = [
    {
      title: 'Published quizzes',
      value: dashboardData?.stats?.publishedQuizzes ?? 0,
      note: `${dashboardData?.stats?.totalQuizzes ?? 0} total quizzes`,
      icon: <FaClipboardList />,
      tone: 'purple'
    },
    {
      title: 'Students',
      value: dashboardData?.stats?.totalStudents ?? 0,
      note: 'Learners in assigned subjects',
      icon: <FaUserGraduate />,
      tone: 'mint'
    },
    {
      title: 'Pending reviews',
      value: dashboardData?.stats?.pendingEvaluations ?? 0,
      note: 'Short answers needing approval',
      icon: <FaExclamationTriangle />,
      tone: 'orange'
    },
    {
      title: 'Average score',
      value: `${dashboardData?.stats?.averageStudentScore ?? 0}%`,
      note: `${dashboardData?.stats?.activeStudents ?? 0} active students`,
      icon: <FaChartLine />,
      tone: 'blue'
    }
  ];

  const activities = dashboardData?.recentQuizActivity || [];

  if (loading) {
    return (
      <div className="empty-panel">
        <Spinner animation="border" />
        <p>Loading your assessment workspace...</p>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-page animate-entrance">
      <Card className="dashboard-welcome">
        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap position-relative z-1">
          <div>
            <h2>Your assessment workspace</h2>
            <p>
              Create quizzes, review answers, and monitor real student activity
              from one organized dashboard.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="light" onClick={handleDownloadReport} disabled={downloadingReport}>
              <FaFilePdf className="me-2" />
              {downloadingReport ? 'Preparing report...' : 'Download PDF report'}
            </Button>
            <Button variant="outline-light" onClick={handleDownloadMarks} disabled={exporting}>
              <FaFileExcel className="me-2" />
              {exporting ? 'Preparing export...' : 'Export CSV'}
            </Button>
          </div>
        </div>
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

      <Card className="overflow-hidden mb-4">
        <Card.Body className="p-4 pb-2">
          <div className="page-heading-row mb-2">
            <div>
              <h5 className="section-card-title">Quiz access codes</h5>
              <p>Share a code only with students who should attempt that assessment.</p>
            </div>
            <Badge bg="primary"><FaKey className="me-1" /> {quizzes.length} quizzes</Badge>
          </div>
        </Card.Body>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th className="ps-4">Assessment</th>
              <th>Evaluation</th>
              <th>Access code</th>
              <th className="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-panel m-3">
                    <strong>No quizzes created yet</strong>
                    <p>Create a quiz to generate a private student access code.</p>
                  </div>
                </td>
              </tr>
            ) : (
              quizzes.map((quiz) => (
                <tr key={quiz._id}>
                  <td className="ps-4">
                    <strong className="text-dark">{quiz.title}</strong>
                    <br />
                    <span className="small text-muted">{quiz.status}</span>
                  </td>
                  <td>
                    <Badge bg={quiz.evaluationMode === 'automatic' ? 'success' : 'warning'}>
                      {quiz.evaluationMode === 'automatic' ? 'Automatic AI' : 'Teacher review'}
                    </Badge>
                  </td>
                  <td>
                    <code className="fs-6 fw-bold">{quiz.accessCode || 'Generating...'}</code>
                  </td>
                  <td className="text-end pe-4">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="me-2"
                      disabled={!quiz.accessCode}
                      onClick={() =>
                        navigator.clipboard
                          ?.writeText(quiz.accessCode || '')
                          .then(() => window.alert('Access code copied.'))
                      }
                    >
                      <FaCopy className="me-1" /> Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => regenerateCode(quiz._id)}
                    >
                      New code
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <Card.Body className="p-4 pb-2">
          <div className="page-heading-row mb-2">
            <div>
              <h5 className="section-card-title">Recent quiz activity</h5>
              <p>Latest student submissions from your quizzes.</p>
            </div>
            <Badge bg="primary">{activities.length} recent</Badge>
          </div>
        </Card.Body>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th className="ps-4">Student</th>
              <th>Assessment</th>
              <th>Score</th>
              <th>Status</th>
              <th className="text-end pe-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-panel m-3">
                    <strong>No submissions yet</strong>
                    <p>Student quiz activity will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              activities.map((item, index) => (
                <tr key={`${item.rollNo}-${item.submittedAt || index}`}>
                  <td className="ps-4">
                    <strong className="text-dark">{item.studentName}</strong>
                    <br />
                    <span className="small text-muted">Roll no. {item.rollNo}</span>
                  </td>
                  <td>{item.quizTitle}</td>
                  <td><Badge bg="info">{item.percentage}%</Badge></td>
                  <td>
                    <Badge bg={item.status === 'fully_graded' ? 'success' : 'warning'}>
                      {item.status === 'fully_graded' ? 'Graded' : 'Needs review'}
                    </Badge>
                  </td>
                  <td className="text-end pe-4">
                    <Button size="sm" onClick={() => navigate('/evaluations')}>
                      Review answers
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
