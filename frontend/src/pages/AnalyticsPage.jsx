import { Container, Row, Col, Card } from 'react-bootstrap';
import PerformanceChart from '../components/PerformanceChart';
import SubjectAccuracyChart from '../components/SubjectAccuracyChart';

const AnalyticsPage = () => {
  return (
    <Container className="py-4">
      <h2 className="fw-bold mb-4">Analytics Dashboard</h2>
      <Row className="g-4">
        <Col lg={6}>
          <Card className="shadow-sm rounded-4">
            <Card.Body>
              <h5>Performance Trend</h5>
              <PerformanceChart />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm rounded-4">
            <Card.Body>
              <h5>Subject Wise Accuracy</h5>
              <SubjectAccuracyChart />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AnalyticsPage;