import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Dropdown } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaChevronDown, FaClock, FaSearch } from 'react-icons/fa';
import api from '../api/client';
import '../styles/Header.css';

const routeLabels = {
  '/dashboard': ['Dashboard', 'Here is what is happening today.'],
  '/leaderboard': ['Leaderboard', 'Celebrate progress and top performance.'],
  '/create-quiz': ['Create quiz', 'Build a polished assessment in minutes.'],
  '/evaluations': ['Pending evaluations', 'Review and verify submitted answers.'],
  '/proctoring': ['Live monitoring', 'Keep track of active assessment sessions.'],
  '/manage-users': ['User management', 'Manage roles, access, and account status.']
};

const Header = ({ systemRole, userName, onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [pageTitle, pageSubtitle] = useMemo(() => {
    if (location.pathname.startsWith('/quiz/')) return ['Quiz session', 'Stay focused and complete every question.'];
    if (location.pathname.startsWith('/results/')) return ['Quiz results', 'Review your performance and feedback.'];
    return routeLabels[location.pathname] || ['EduAssess', 'Your smart assessment workspace.'];
  }, [location.pathname]);

  const quickLinks = useMemo(() => {
    const common = [{ path: '/dashboard', label: 'Dashboard', hint: 'Workspace overview' }];
    if (systemRole === 'Student') {
      return [...common, { path: '/leaderboard', label: 'Leaderboard', hint: 'View class rankings' }];
    }
    if (systemRole === 'Teacher') {
      return [
        ...common,
        { path: '/create-quiz', label: 'Create quiz', hint: 'Build or generate an assessment' },
        { path: '/evaluations', label: 'Evaluations', hint: 'Review AI and student answers' },
        { path: '/proctoring', label: 'Live monitoring', hint: 'Watch active quiz sessions' }
      ];
    }
    return [
      ...common,
      { path: '/manage-users', label: 'Manage users', hint: 'Update roles and access' },
      { path: '/leaderboard', label: 'Leaderboard', hint: 'View student rankings' }
    ];
  }, [systemRole]);

  const filteredLinks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return quickLinks;
    return quickLinks.filter((item) =>
      `${item.label} ${item.hint}`.toLowerCase().includes(term)
    );
  }, [quickLinks, searchTerm]);

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.getElementById('workspace-quick-search');
        input?.focus();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications', {
          withCredentials: true
        });
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // The dashboard remains usable when notifications are unavailable.
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all', {}, { withCredentials: true });
      setUnreadCount(0);
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    } catch {
      // Keep current UI state when the backend is unavailable.
    }
  };

  return (
    <header className="header-navbar">
      <div className="header-title-area">
        <button className="mobile-menu-button" onClick={onMenuToggle} aria-label="Open navigation">
          <FaBars />
        </button>
        <div>
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-search-wrap">
          <label className="header-search">
            <FaSearch className="search-icon" />
            <input
              id="workspace-quick-search"
              type="search"
              placeholder="Jump to a page..."
              aria-label="Quick navigation search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
            />
            <kbd>⌘ K</kbd>
          </label>

          {searchOpen && (
            <div className="header-search-results">
              <span className="search-results-label">Quick navigation</span>
              {filteredLinks.length === 0 ? (
                <div className="search-result-empty">No matching page found.</div>
              ) : (
                filteredLinks.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      navigate(item.path);
                      setSearchTerm('');
                      setSearchOpen(false);
                    }}
                  >
                    <span><FaSearch /></span>
                    <div><strong>{item.label}</strong><small>{item.hint}</small></div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <Dropdown show={showNotifications} onToggle={setShowNotifications} align="end">
          <Dropdown.Toggle as="button" className="notification-toggle" aria-label="Notifications">
            <FaBell size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </Dropdown.Toggle>

          <Dropdown.Menu className="notification-menu">
            <div className="notification-header">
              <div>
                <strong>Notifications</strong>
                <span>Recent account activity</span>
              </div>
              {unreadCount > 0 && <Badge bg="primary">{unreadCount} new</Badge>}
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <span>🔔</span>
                  <strong>You are all caught up</strong>
                  <small>No new notifications right now.</small>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification._id} className={`notification-item ${notification.isRead ? '' : 'unread'}`}>
                    <span className="notification-dot" />
                    <div className="notification-content">
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        <FaClock size={11} /> {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notification-footer">
                <Button variant="link" onClick={markAllAsRead}>Mark all as read</Button>
              </div>
            )}
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown align="end">
          <Dropdown.Toggle as="button" className="user-profile">
            <span className="user-avatar">{userName.charAt(0).toUpperCase()}</span>
            <span className="user-info">
              <strong>{userName}</strong>
              <small>{systemRole}</small>
            </span>
            <FaChevronDown className="profile-chevron" size={11} />
          </Dropdown.Toggle>
          <Dropdown.Menu className="profile-menu">
            <Dropdown.Header>Signed in as {systemRole}</Dropdown.Header>
            <Dropdown.Item disabled>Profile settings</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header;
