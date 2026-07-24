import { useEffect, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api, {
  clearAuthToken,
  getApiErrorMessage,
  storeAuthToken,
} from '../api/client';
import LogoIcon from '../components/LogoIcon';

const OAuthCallback = ({ onAuthenticated }) => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const finishGoogleLogin = async () => {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const token = fragment.get('token');

      // Remove the token from the visible URL immediately.
      window.history.replaceState({}, document.title, '/oauth/callback');

      if (!token) {
        setError('Google sign-in did not return a valid session. Please try again.');
        return;
      }

      storeAuthToken(token);

      try {
        const { data } = await api.get('/auth/me');
        if (!data.success) throw new Error('Authentication failed.');
        onAuthenticated(data.user);
        navigate('/dashboard', { replace: true });
      } catch (requestError) {
        clearAuthToken();
        setError(getApiErrorMessage(requestError, 'Google sign-in could not be completed.'));
      }
    };

    finishGoogleLogin();
  }, [navigate, onAuthenticated]);

  return (
    <div className="app-loading-screen oauth-callback-screen">
      <div className="loading-aurora loading-aurora-one" />
      <div className="loading-aurora loading-aurora-two" />
      <div className="app-loading-logo">
        <LogoIcon size={36} variant="white" />
      </div>
      {error ? (
        <>
          <Alert variant="danger" className="oauth-callback-alert">{error}</Alert>
          <button className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
            Return to sign in
          </button>
        </>
      ) : (
        <>
          <div className="app-loading-copy">
            <strong>Completing Google sign-in</strong>
            <span>Securing your EduAssess session...</span>
          </div>
          <Spinner animation="border" size="sm" />
        </>
      )}
    </div>
  );
};

export default OAuthCallback;
