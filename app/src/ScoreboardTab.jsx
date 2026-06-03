import React, { useState, useEffect } from 'react';
import { Trophy, Pencil, Check, X } from 'lucide-react';

// チームカラー定義（CSSカラーコードのみ）
const TEAM_COLORS = {
    '赤チーム': '#E84040',
    '青チーム': '#4080E8',
    '黄チーム': '#E8C040',
    '緑チーム': '#40E880'
};

function ScoreboardTab({ user }) {
    const [scores, setScores] = useState([]);
    const [editingTeam, setEditingTeam] = useState(null);
    const [editScore, setEditScore] = useState('');
    const [error, setError] = useState('');
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchScores();
        const timer = setInterval(fetchScores, 30000);
        return () => clearInterval(timer);
    }, []);

    const fetchScores = async () => {
        try {
            const res = await fetch('/2026/scoreboard/api.php', {
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '得点情報の取得に失敗しました');
            setScores(data);
        } catch (error) {
            console.error('Error fetching scores:', error);
            setError(error.message);
        }
    };

    const handleEditClick = (team) => {
        setEditingTeam(team.team_name);
        setEditScore(team.score.toString());
        setError('');
    };

    const handleUpdateScore = async () => {
        if (!editingTeam || editScore === '') {
            setError('得点を入力してください');
            return;
        }

        const scoreValue = parseInt(editScore, 10);
        if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 99999) {
            setError('得点は0〜99999の整数で入力してください');
            return;
        }

        try {
            const res = await fetch('/2026/scoreboard/api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    team_name: editingTeam,
                    score: scoreValue
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '得点の更新に失敗しました');

            setEditingTeam(null);
            setEditScore('');
            fetchScores();
        } catch (error) {
            console.error('Error updating score:', error);
            setError(error.message);
        }
    };

    const handleCancelEdit = () => {
        setEditingTeam(null);
        setEditScore('');
        setError('');
    };

    return (
        <div className="content-padding">
            <div className="section-header">
                <h2 className="section-title">
                    <Trophy size={20} style={{ color: '#E8C040' }} />
                    リアルタイムスコアボード
                </h2>
                {isAdmin && (
                    <div className="admin-badge">
                        管理者モード
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="scoreboard-list">
                {scores.map((team, index) => (
                    <div key={team.team_name} className="scoreboard-card">
                        <div className="team-info">
                            <div className="rank-badge">
                                {index + 1}
                            </div>
                            <div>
                                <div className="team-name" style={{ color: TEAM_COLORS[team.team_name] }}>
                                    {team.team_name}
                                </div>
                                {editingTeam === team.team_name ? (
                                    <div className="edit-controls">
                                        <input
                                            type="number"
                                            value={editScore}
                                            onChange={(e) => setEditScore(e.target.value)}
                                            className="score-input"
                                            min="0"
                                            max="99999"
                                            autoFocus
                                        />
                                        <button onClick={handleUpdateScore} className="icon-button success">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={handleCancelEdit} className="icon-button danger">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="team-status">
                                        {user?.team_name === team.team_name && (
                                            <span className="my-team-badge">
                                                自分のチーム
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="score-display">
                            <div className="score-value">
                                {team.score}
                                <span className="score-unit">点</span>
                            </div>
                            {isAdmin && editingTeam !== team.team_name && (
                                <button
                                    onClick={() => handleEditClick(team)}
                                    className="icon-button"
                                >
                                    <Pencil size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="scoreboard-footer">
                <p>※ 得点はリアルタイムで更新されます</p>
                {isAdmin && (
                    <p>※ 管理者は得点を直接編集できます</p>
                )}
            </div>
        </div>
    );
}

export default ScoreboardTab;

---