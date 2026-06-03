import { useState, useEffect, useRef } from 'react';
import { Zap, Pencil } from 'lucide-react';
import { getDatabase, ref as fbRef, onValue as fbOnValue } from 'firebase/database';

const LiveRankingBoard = ({ eventId }) => {
  const [rankings, setRankings]       = useState([]);
  const [teamScores, setTeamScores]   = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const confirmedRankingsRef = useRef([]);

  useEffect(() => {
    fetch('/2026/login/me.php')
      .then(res => res.json())
      .then(data => setIsAdmin(data.role === 'admin'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/2026/ranking/api.php?event_id=${eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRankings(data.rankings);
          confirmedRankingsRef.current = data.rankings;
          setTeamScores(data.team_scores);
          setCurrentEvent(data.event);
        }
      })
      .catch(() => {});

    const rankingRef = fbRef(getDatabase(), `rankings/${eventId}`);
    const unsubscribe = fbOnValue(rankingRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        setRankings(data.rankings || []);
        setTeamScores(data.team_scores || []);
        confirmedRankingsRef.current = data.rankings || [];
      }
    });
    return () => unsubscribe();
  }, [eventId]);

  const handleUpdateResult = (memberId, newResult) => {
    if (!isAdmin) return;
    const updated = rankings.map(item =>
      item.member_id === memberId ? { ...item, result: newResult } : item
    );
    setRankings(updated);

    fetch('/2026/ranking/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, results: [{ member_id: memberId, result: newResult }] }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) setRankings(confirmedRankingsRef.current);
        else confirmedRankingsRef.current = updated;
        setEditingResult(null);
      })
      .catch(() => setRankings(confirmedRankingsRef.current));
  };

  if (teamScores.length === 0 && rankings.length === 0) {
    return <div style={{ color: '#888', padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>データ準備中...</div>;
  }

  return (
    <div className="ranking-container">
      {currentEvent && (
        <div className="event-header">
          <h2>{currentEvent.name}</h2>
          <div className="event-status">
            {currentEvent.status === 'in_progress' && <Zap size={14} strokeWidth={1.8} />}
            {currentEvent.status}
          </div>
        </div>
      )}

      <div className="team-scores">
        {teamScores.map(team => (
          <div key={team.team_name} className="team-score">
            <span>{team.team_name}</span>
            <span>{team.total_points}pts</span>
          </div>
        ))}
      </div>

      <div className="ranking-list">
        {rankings.map(item => (
          <div key={item.member_id} className={`ranking-item rank-${item.rank}`}>
            <div className="rank-badge">{item.rank}</div>
            <div className="member-info">
              <span className="team-badge">{item.team_name}</span>
              <span>{item.member_name}</span>
            </div>
            <div className="result">
              {isAdmin && editingResult?.member_id === item.member_id ? (
                <input
                  type="text"
                  value={editingResult.result}
                  onChange={e => setEditingResult({ ...editingResult, result: e.target.value })}
                  onBlur={() => handleUpdateResult(item.member_id, editingResult.result)}
                  autoFocus
                />
              ) : (
                <>
                  {item.result}
                  {isAdmin && (
                    <Pencil
                      size={13}
                      strokeWidth={1.8}
                      style={{ marginLeft: '0.3rem', cursor: 'pointer', opacity: 0.6 }}
                      onClick={() => setEditingResult({ member_id: item.member_id, result: item.result })}
                    />
                  )}
                </>
              )}
            </div>
            <div className="points">{item.points}pts</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveRankingBoard;
