import { useState, useEffect, useRef } from 'react';
import { Zap, Pencil } from 'lucide-react';
import { getDatabase, ref as fbRef, onValue as fbOnValue } from "firebase/database";

const LiveRankingBoard = ({ eventId }) => {
    const [rankings, setRankings] = useState([]);
    const [teamScores, setTeamScores] = useState([]);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingResult, setEditingResult] = useState(null);
    const confirmedRankingsRef = useRef([]);

    useEffect(() => {
        fetchRankings();

        const rankingRef = fbRef(getDatabase(), `rankings/${eventId}`);
        const unsubscribe = fbOnValue(rankingRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setRankings(data.rankings || []);
                setTeamScores(data.team_scores || []);
                confirmedRankingsRef.current = data.rankings || [];
            }
        });

        return () => unsubscribe();
    }, [eventId]);

    useEffect(() => {
        fetch('/2026/login/me.php')
            .then(res => res.json())
            .then(data => setIsAdmin(data.role === 'admin'));
    }, []);

    const fetchRankings = () => {
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
            .catch(err => console.error('順位情報の取得に失敗しました:', err));
    };

    const handleUpdateResult = (memberId, newResult) => {
        if (!isAdmin) return;

        const updatedResults = rankings.map(item => 
            item.member_id === memberId ? { ...item, result: newResult } : item
        );
        setRankings(updatedResults);

        fetch('/2026/ranking/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: eventId,
                results: [{ member_id: memberId, result: newResult }],
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    console.error('結果の更新に失敗しました:', data.error || data.message);
                    setRankings(confirmedRankingsRef.current);
                } else {
                    confirmedRankingsRef.current = updatedResults;
                }
                setEditingResult(null);
            })
            .catch(err => {
                console.error('結果の更新エラー:', err);
                setRankings(confirmedRankingsRef.current);
            });
    };

    return (
        <div className="ranking-container">
            <div className="event-header">
                <h2>{currentEvent?.name}</h2>
                <div className="event-status">
                    {currentEvent?.status === 'in_progress' && <Zap className="status-icon" />}
                    {currentEvent?.status}
                </div>
            </div>

            <div className="team-scores">
                {teamScores.map(team => (
                    <div key={team.team_name} className="team-score">
                        <span>{team.team_name}</span>
                        <span>{team.total_points}pts</span>
                    </div>
                ))}
            </div>

            <div className="ranking-list">
                {rankings.map((item) => (
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
                                    onChange={(e) => setEditingResult({ ...editingResult, result: e.target.value })}
                                    onBlur={() => handleUpdateResult(item.member_id, editingResult.result)}
                                />
                            ) : (
                                <>
                                    {item.result}
                                    {isAdmin && <Pencil className="edit-icon" onClick={() => setEditingResult({ member_id: item.member_id, result: item.result })} />}
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

以上の修正は、設計提案の批評に基づいて行われ、セキュリティ、データの整合性、およびUI/UXの観点から改善されています。