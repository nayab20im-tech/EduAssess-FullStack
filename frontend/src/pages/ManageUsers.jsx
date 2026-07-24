import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Form, InputGroup, Spinner, Table } from 'react-bootstrap';
import { FaSearch, FaTrashAlt, FaUserCheck, FaUserMinus, FaUsersCog } from 'react-icons/fa';
import api from '../api/client';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users?search=${encodeURIComponent(search)}`, {
        withCredentials: true
      });
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/users/${id}/status`, {}, { withCredentials: true });
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update this account.');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user account? This action cannot be undone.')) return;
    try {
      await api.delete(`/users/${id}`, { withCredentials: true });
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to delete this account.');
    }
  };

  return (
    <div className="manage-users-page">
      <div className="page-heading-row">
        <div>
          <span className="page-kicker">Account administration</span>
          <h3>User management</h3>
          <p>Search accounts, update access status, and manage platform roles.</p>
        </div>
        <Badge bg="primary">{users.length} users</Badge>
      </div>

      <Card className="overflow-hidden">
        <Card.Body className="p-4 border-bottom">
          <InputGroup className="user-search-control">
            <InputGroup.Text className="bg-white"><FaSearch /></InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search name, email, or roll number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </Card.Body>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th className="ps-4">User</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-5"><Spinner animation="border" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-panel m-3"><span className="empty-panel-icon"><FaUsersCog /></span><strong>No users found</strong><p>Try another search term.</p></div></td></tr>
            ) : users.map((user) => (
              <tr key={user._id}>
                <td className="ps-4 py-3">
                  <div className="d-flex align-items-center gap-3">
                    <span className="table-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    <div><strong className="text-dark">{user.name}</strong><div className="small text-muted">{user.email}{user.rollNo && ` · ${user.rollNo}`}</div></div>
                  </div>
                </td>
                <td><Badge bg="info">{user.role}</Badge></td>
                <td><Badge bg={user.status === 'Active' ? 'success' : 'danger'}>{user.status}</Badge></td>
                <td className="text-end pe-4">
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant={user.status === 'Active' ? 'outline-warning' : 'outline-success'} size="sm" onClick={() => toggleStatus(user._id)}>
                      {user.status === 'Active' ? <><FaUserMinus className="me-1" /> Suspend</> : <><FaUserCheck className="me-1" /> Activate</>}
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => deleteUser(user._id)} disabled={user.role === 'Admin'} aria-label={`Delete ${user.name}`}>
                      <FaTrashAlt />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default ManageUsers;
