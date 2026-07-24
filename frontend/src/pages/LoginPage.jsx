import { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaGoogle, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import api, {
  getApiErrorMessage,
  getGoogleAuthUrl,
  storeAuthToken
} from '../api/client';
import '../styles/Auth.css';

const LoginPage = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = location.state?.role || 'Student';

  useEffect(() => {
    const oauthError = new URLSearchParams(location.search).get('error');
    if (oauthError === 'google_auth_failed') {
      setError('Google sign-in could not be completed. Please try again.');
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.pathname, location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post(
        '/auth/login',
        { email, password },
        { withCredentials: true }
      );

      if (response.data.success) {
        storeAuthToken(response.data.token);
        onAuthenticated(response.data.user);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Login failed. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="auth-page">
      <Container fluid className="h-100">
        <Row className="h-100 align-items-center">
          {/* Left Side - Branding */}
          <Col lg={6} className="auth-banner d-none d-lg-flex align-items-center justify-content-center">
            <div className="banner-content">
              <div className="banner-icon">🎓</div>
              <h1 className="banner-title">Welcome Back</h1>
              <p className="banner-subtitle">
                Continue your learning journey with Smart Assessment & Learning Evaluation
              </p>
              <ul className="banner-features">
                <li>✓ Take Assessments</li>
                <li>✓ Track Progress</li>
                <li>✓ View Results</li>
              </ul>
            </div>
          </Col>

          {/* Right Side - Login Form */}
          <Col lg={6} className="auth-form-section">
            <div className="form-container">
              <button className="back-button" onClick={() => navigate('/')}>
                <FaArrowLeft /> Back to Home
              </button>

              <div className="form-header">
                <h2>Sign In</h2>
                <p>Access your {selectedRole} portal</p>
              </div>

              {error && (
                <Alert variant="danger" className="error-alert">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleLogin} className="login-form">
                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Email Address</Form.Label>
                  <div className="input-group-custom">
                    <FaEnvelope className="input-icon" />
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="form-label">Password</Form.Label>
                  <div className="input-group-custom">
                    <FaLock className="input-icon" />
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-input"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </Form.Group>

                <div className="forgot-password">
                  <Button variant="link" className="forgot-link">
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="btn-login w-100 mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Form>

              <div className="divider">
                <span>Or continue with</span>
              </div>

              <Button
                className="btn-google w-100"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <FaGoogle className="me-2" />
                Continue with Google
              </Button>

              <div className="signup-link">
                <span>Don't have an account? </span>
                <Button
                  variant="link"
                  className="signup-btn"
                  onClick={() => navigate('/register')}
                >
                  Sign up here
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;