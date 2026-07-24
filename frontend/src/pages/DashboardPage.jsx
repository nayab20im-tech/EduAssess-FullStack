

import { Container, Row, Col, Card } from 'react-bootstrap';

import StatsCard from '../components/StatsCard';
import PerformanceChart from '../components/PerformanceChart';
import SubjectAccuracyChart from '../components/SubjectAccuracyChart';
import RecentQuizzesTable from '../components/RecentQuizzesTable';

import { FaMedal, FaPercentage, FaClipboardList, FaChartSimple, FaBookOpen, FaTrophy, FaUserGraduate } from 'react-icons/fa';

const DashboardPage = () => {

  // Stats Data
  const topStats = [
    {
      title: 'Overall Rank',
      value: '24',
      icon: <FaMedal />,
      color: '#f59e0b'
    },
    {
      title: 'Average Score',
      value: '78.6',
      unit: '%',
      icon: <FaPercentage />,
      color: '#10b981'
    },
    {
      title: 'Quizzes Taken',
      value: '12',
      unit: '/120',
      icon: <FaClipboardList />,
      color: '#8b5cf6'
    },
    {
      title: 'Attendance',
      value: '85',
      unit: '%',
      icon: <FaChartSimple />,
      color: '#ef4444'
    }
  ];

  const bottomStats = [
    {
      title: 'Total Quizzes',
      value: '120',
      icon: <FaBookOpen />,
      color: '#3b82f6'
    },
    {
      title: 'Avg Score (All)',
      value: '74.4',
      unit: '%',
      icon: <FaChartSimple />,
      color: '#10b981'
    },
    {
      title: 'Global Rank',
      value: '24',
      icon: <FaTrophy />,
      color: '#f59e0b'
    },
    {
      title: 'Active Students',
      value: '10K+',
      icon: <FaUserGraduate />,
      color: '#ec4899'
    }
  ];

  return (

    <Container fluid className="p-4 fade-in">

      {/* Welcome Banner */}
      <Row className="mb-4">

        <Col>

          <Card className="bg-primary text-white p-4 rounded-4 shadow-sm border-0">

            <h2 className="fw-bold">
              Welcome back, Mr. Waqas! 🎉
            </h2>

            <p className="mb-0 opacity-75">
              Here's your learning progress at a glance.
            </p>

          </Card>

        </Col>

      </Row>

      {/* Top Stats */}
      <Row className="g-3 mb-4">

        {topStats.map((stat, index) => (

          <Col md={3} key={index}>

            <StatsCard
              title={stat.title}
              value={stat.value}
              unit={stat.unit}
              icon={stat.icon}
              color={stat.color}
            />

          </Col>

        ))}

      </Row>

      {/* Charts */}
      <Row className="g-4 mb-4">

        {/* Performance Chart */}
        <Col lg={7}>

          <Card className="shadow-sm border-0 rounded-4 h-100">

            <Card.Body>

              <h5 className="fw-bold mb-3">
                Performance Overview
              </h5>

              <PerformanceChart />

              <p className="text-muted small mt-2">
                DBMS Basics Quiz – This Month
              </p>

            </Card.Body>

          </Card>

        </Col>

        {/* Subject Accuracy */}
        <Col lg={5}>

          <Card className="shadow-sm border-0 rounded-4 h-100">

            <Card.Body>

              <h5 className="fw-bold mb-3">
                Subject Wise Accuracy
              </h5>

              <SubjectAccuracyChart />

            </Card.Body>

          </Card>

        </Col>

      </Row>

      {/* Recent Quizzes */}
      <Row className="mb-4">

        <Col>

          <Card className="shadow-sm border-0 rounded-4">

            <Card.Body>

              <h5 className="fw-bold mb-3">
                Recent Quizzes
              </h5>

              <RecentQuizzesTable />

            </Card.Body>

          </Card>

        </Col>

      </Row>

      {/* Bottom Stats */}
      <Row className="g-3">

        {bottomStats.map((stat, index) => (

          <Col md={3} key={index}>

            <StatsCard
              title={stat.title}
              value={stat.value}
              unit={stat.unit}
              icon={stat.icon}
              color={stat.color}
            />

          </Col>

        ))}

      </Row>

    </Container>
  );
};

export default DashboardPage;