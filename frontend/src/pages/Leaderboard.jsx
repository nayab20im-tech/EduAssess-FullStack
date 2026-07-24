import { useEffect, useState } from 'react';
import { Card, Spinner, Table } from 'react-bootstrap';
import { FaMedal, FaTrophy, FaUsers } from 'react-icons/fa';
import api from '../api/client';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await api.get('/leaderboard', {
          withCredentials: true
        });
        if (data.success) setLeaderboardData(data.leaderboard);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const topThree = leaderboardData.slice(0, 3);

  return (
    <div className="leaderboard-page">
      <Card className="dashboard-welcome">
        <h2><FaTrophy className="me-2" /> Learning leaderboard</h2>
        <p>Celebrate consistency, accuracy, and participation across completed quizzes.</p>
      </Card>

      {loading ? (
        <div className="empty-panel"><Spinner animation="border" /><p>Calculating current rankings...</p></div>
      ) : leaderboardData.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-panel-icon"><FaUsers /></span>
          <strong>No rankings yet</strong>
          <p>Leaderboard positions will appear after students complete graded quizzes.</p>
        </div>
      ) : (
        <>
          <div className="leaderboard-podium">
            {topThree.map((student, index) => (
              <Card key={student.studentId} className={`podium-person podium-rank-${index + 1}`}>
                <span className="podium-medal"><FaMedal /></span>
                <span className="podium-avatar">{student.name?.charAt(0)?.toUpperCase() || 'S'}</span>
                <strong>{student.name}</strong>
                <small>{student.rollNo}</small>
                <b>{student.avgPercentage}%</b>
                <span>Rank #{student.rank}</span>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th className="ps-4">Rank</th>
                  <th>Student</th>
                  <th>Average score</th>
                  <th>Quizzes</th>
                  <th>Integrity alerts</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((student) => (
                  <tr key={student.studentId}>
                    <td className="ps-4 fw-bold">#{student.rank}</td>
                    <td><strong className="text-dark">{student.name}</strong><br /><span className="small text-muted">{student.rollNo}</span></td>
                    <td><strong className="text-success">{student.avgPercentage}%</strong></td>
                    <td>{student.quizzesAttempted}</td>
                    <td><span className={`badge ${student.warnings > 0 ? 'bg-danger' : 'bg-success'}`}>{student.warnings}</span></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
