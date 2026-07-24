import { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaGoogle, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import api, {
  getApiErrorMessage,
  getGoogleAuthUrl,
  storeAuthToken
} from '../api/client';
import '../styles/Auth.css';

const RegisterPage = ({ onAuthenticated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState('Student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name, email, password, role
      });

      if (response.data.success) {
        storeAuthToken(response.data.token);
        setSuccess('Account created successfully. Opening your dashboard...');
        onAuthenticated(response.data.user);
        setTimeout(() => navigate('/dashboard', { replace: true }), 600);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Try again.'));
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
              <div className="banner-icon">🚀</div>
              <h1 className="banner-title">Join Us</h1>
              <p className="banner-subtitle">
                Start your journey with Smart Assessment & Learning Evaluation
              </p>
              <ul className="banner-features">
                <li>✓ Create Quizzes</li>
                <li>✓ Get AI Grading</li>
                <li>✓ Track Analytics</li>
              </ul>
            </div>
          </Col>

          {/* Right Side - Register Form */}
          <Col lg={6} className="auth-form-section">
            <div className="form-container">
              <button className="back-button" onClick={() => navigate('/')}>
                <FaArrowLeft /> Back to Home
              </button>

              <div className="form-header">
                <h2>Create Account</h2>
                <p>Join our learning platform</p>
              </div>

              {error && (
                <Alert variant="danger" className="error-alert">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="success-alert">
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleRegister} className="login-form">
                {/* Full Name */}
                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Full Name</Form.Label>
                  <div className="input-group-custom">
                    <FaUser className="input-icon" />
                    <Form.Control
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                </Form.Group>

                {/* Email */}
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

                {/* Password */}
                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Password</Form.Label>
                  <div className="input-group-custom">
                    <FaLock className="input-icon" />
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
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

                {/* Confirm Password */}
                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Confirm Password</Form.Label>
                  <div className="input-group-custom">
                    <FaLock className="input-icon" />
                    <Form.Control
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="form-input"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </Form.Group>

                {/* Account Type */}
                <Form.Group className="mb-4">
                  <Form.Label className="form-label">I am a</Form.Label>
                  <Form.Select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-input"
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </Form.Select>
                </Form.Group>

                {/* Register Button */}
                <Button
                  type="submit"
                  className="btn-login w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Form>

              <div className="divider">
                <span>Or sign up with</span>
              </div>

              <Button
                className="btn-google w-100 mb-4"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <FaGoogle className="me-2" />
                Continue with Google
              </Button>

              <div className="signup-link">
                <span>Already have an account? </span>
                <Button
                  variant="link"
                  className="signup-btn"
                  onClick={() => navigate('/login')}
                >
                  Sign in here
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;