import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartPie,
  FaClipboardCheck,
  FaEye,
  FaHome,
  FaPlus,
  FaSignOutAlt,
  FaTrophy,
  FaUsersCog
} from 'react-icons/fa';
import api, { clearAuthToken } from '../api/client';
import LogoIcon from './LogoIcon';
import '../styles/Sidebar.css';

const Sidebar = ({ systemRole, setSystemRole, setCurrentUser, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch {
      // Clear the local UI session even if the server is unavailable.
    } finally {
      clearAuthToken();
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');
      setSystemRole('Public');
      setCurrentUser(null);
      navigate('/');
    }
  };

  const goTo = (path) => {
    navigate(path);
    onNavigate?.();
  };

  const items = [
    { path: '/dashboard', icon: <FaHome />, label: 'Overview' },
    ...(systemRole === 'Student'
      ? [{ path: '/leaderboard', icon: <FaTrophy />, label: 'Leaderboard' }]
      : []),
    ...(systemRole === 'Teacher'
      ? [
          { path: '/create-quiz', icon: <FaPlus />, label: 'Create quiz' },
          { path: '/evaluations', icon: <FaClipboardCheck />, label: 'Evaluations' },
          { path: '/proctoring', icon: <FaEye />, label: 'Live monitoring' }
        ]
      : []),
    ...(systemRole === 'Admin'
      ? [
          { path: '/manage-users', icon: <FaUsersCog />, label: 'Manage users' },
          { path: '/leaderboard', icon: <FaTrophy />, label: 'Leaderboard' }
        ]
      : [])
  ];

  return (
    <div className="sidebar-container">
      <button className="sidebar-logo" onClick={() => goTo('/dashboard')}>
        <span className="logo-badge"><LogoIcon size={24} variant="white" /></span>
        <span className="logo-copy">
          <strong>EduAssess</strong>
          <small>Quiz workspace</small>
        </span>
      </button>

      <div className="sidebar-role-pill">
        <FaChartPie />
        <span>{systemRole} workspace</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">Menu</span>
        {items.map((item) => {
          const active = item.path === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              className={`sidebar-link ${active ? 'active' : ''}`}
              onClick={() => goTo(item.path)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
              {active && <span className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-tip">
        <span className="sidebar-tip-icon">✨</span>
        <div>
          <strong>Smart workspace</strong>
          <p>Use analytics to improve every assessment.</p>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
