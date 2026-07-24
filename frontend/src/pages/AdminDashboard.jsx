import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Spinner } from 'react-bootstrap';
import { FaBolt, FaCheckCircle, FaServer, FaTachometerAlt } from 'react-icons/fa';
import api from '../api/client';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ activeInstances: '0 / 0', latency: '0ms', systemLoad: '0%' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const { data } = await api.get('/analytics/admin', {
          withCredentials: true
        });
        if (data.success) setStats(data.data.stats);
      } catch (err) {
        setError(err.response?.data?.message || 'System metrics are temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
    const interval = setInterval(fetchAdminStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="empty-panel"><Spinner animation="border" /><p>Loading platform health...</p></div>;
  }

  const metrics = [
    { label: 'Active instances', value: stats.activeInstances, note: 'Connected service nodes', icon: <FaServer />, tone: 'purple' },
    { label: 'AI response time', value: stats.latency, note: 'Current model latency', icon: <FaBolt />, tone: 'blue' },
    { label: 'System load', value: stats.systemLoad, note: 'Current resource usage', icon: <FaTachometerAlt />, tone: 'orange' }
  ];

  return (
    <div className="admin-dashboard-page">
      <Card className="dashboard-welcome">
        <h2>Platform health at a glance</h2>
        <p>Track service availability, model response time, and current infrastructure load from one place.</p>
      </Card>

      {error && <Alert variant="warning" className="mb-4">{error}</Alert>}

      <Row className="g-3 mb-4">
        {metrics.map((metric) => (
          <Col md={4} key={metric.label}>
            <Card className="metric-card">
              <div className="metric-card-inner">
                <div>
                  <p className="metric-label">{metric.label}</p>
                  <h3 className="metric-value">{metric.value}</h3>
                  <div className="metric-note"><FaCheckCircle className="text-success me-1" /> {metric.note}</div>
                </div>
                <span className={`metric-icon ${metric.tone}`}>{metric.icon}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="p-4">
        <div className="page-heading-row mb-0">
          <div>
            <span className="page-kicker">Live status</span>
            <h4 className="section-card-title mt-1">All core services are being monitored</h4>
            <p>Metrics refresh automatically every ten seconds.</p>
          </div>
          <span className="badge bg-success">Operational</span>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
