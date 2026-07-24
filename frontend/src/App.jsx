import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';
import api from './api/client';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import QuizAttempt from './pages/QuizAttempt';
import QuizResults from './pages/QuizResults';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateQuiz from './pages/CreateQuiz';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import PendingEvaluations from './pages/PendingEvaluations';
import ManageUsers from './pages/ManageUsers';
import OAuthCallback from './pages/OAuthCallback';
import LogoIcon from './components/LogoIcon';
import { clearAuthToken, getStoredAuthToken } from './api/client';
import './styles/ModernUI.css';
import './styles/CinematicUI.css';

const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      frameId = 0;
    };

    const onScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="global-scroll-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
};

const useRevealObserver = (pathname) => {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = [
      ...document.querySelectorAll(
        '[data-reveal], .workspace-route-stage .page-heading-row, .workspace-route-stage .card, .workspace-route-stage .empty-panel'
      )
    ];

    elements.forEach((element, index) => {
      element.classList.add('cinematic-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 55}ms`);
    });

    if (reduceMotion) {
      elements.forEach((element) => element.classList.add('is-revealed'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);
};

function AppContent() {
  const [systemRole, setSystemRole] = useState('Public');
  const [currentUser, setCurrentUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useRevealObserver(location.pathname);

  const handleAuthenticated = useCallback((user) => {
    setSystemRole(user.role);
    setCurrentUser(user);
    sessionStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!getStoredAuthToken()) {
        setAppLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me', {
          withCredentials: true
        });
        if (data.success) handleAuthenticated(data.user);
      } catch {
        clearAuthToken();
        setSystemRole('Public');
        setCurrentUser(null);
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
      } finally {
        setAppLoading(false);
      }
    };

    checkAuth();
  }, [handleAuthenticated]);

  if (appLoading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-aurora loading-aurora-one" />
        <div className="loading-aurora loading-aurora-two" />
        <div className="app-loading-logo">
          <LogoIcon size={36} variant="white" />
        </div>
        <div className="app-loading-copy">
          <strong>EduAssess</strong>
          <span>Building your learning experience...</span>
        </div>
        <div className="app-loading-bar"><span /></div>
      </div>
    );
  }

  if (systemRole === 'Public') {
    return (
      <>
        <ScrollProgress />
        <div key={location.pathname} className="route-stage public-route-stage">
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onAuthenticated={handleAuthenticated} />} />
            <Route path="/register" element={<RegisterPage onAuthenticated={handleAuthenticated} />} />
            <Route path="/oauth/callback" element={<OAuthCallback onAuthenticated={handleAuthenticated} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-is-open' : ''}`}>
      <div className="workspace-ambient workspace-ambient-one" />
      <div className="workspace-ambient workspace-ambient-two" />

      <button
        className="sidebar-backdrop"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="app-sidebar">
        <Sidebar
          systemRole={systemRole}
          setSystemRole={setSystemRole}
          setCurrentUser={setCurrentUser}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      <main className="app-main">
        <Header
          systemRole={systemRole}
          userName={currentUser?.name || 'User'}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
        />

        <section className="app-page">
          <div key={location.pathname} className="route-stage workspace-route-stage">
            <Routes location={location}>
              <Route path="/leaderboard" element={<Leaderboard />} />

              {systemRole === 'Student' && (
                <>
                  <Route path="/dashboard" element={<StudentDashboard />} />
                  <Route path="/quiz/:quizId/attempt" element={<QuizAttempt />} />
                  <Route path="/results/:submissionId" element={<QuizResults />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}

              {systemRole === 'Teacher' && (
                <>
                  <Route path="/dashboard" element={<TeacherDashboard />} />
                  <Route path="/create-quiz" element={<CreateQuiz />} />
                  <Route path="/proctoring" element={<LiveMonitoring />} />
                  <Route path="/evaluations" element={<PendingEvaluations />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}

              {systemRole === 'Admin' && (
                <>
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/manage-users" element={<ManageUsers />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
