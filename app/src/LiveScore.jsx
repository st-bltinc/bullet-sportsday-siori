import { useState, useEffect } from 'react'
import { Trophy, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getDatabase, ref as fbRef, onValue as fbOnValue } from 'firebase/database'

const SCORE_API = 'https://wagahai.mixh.jp/2026/score/api.php'

export default function LiveScore({ user, firebaseApp }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editScore, setEditScore] = useState('')
  const [expanded, setExpanded] = useState(false)

  // Firebase Realtime Databaseからリアルタイム更新を受け取る
  useEffect(() => {
    if (!firebaseApp) return

    const db = getDatabase(firebaseApp)
    const scoresRef = fbRef(db, 'live_scores')

    const unsubscribe = fbOnValue(scoresRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const sortedScores = Object.entries(data)
          .map(([team_name, score]) => ({ team_name, score }))
          .sort((a, b) => b.score - a.score)
        setScores(sortedScores)
      }
    })

    return () => unsubscribe()
  }, [firebaseApp])

  // 初期データをAPIから取得
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(SCORE_API)
        if (!response.ok) throw new Error('Failed to fetch scores')
        const data = await response.json()
        setScores(data)
      } catch (error) {
        console.error('Error fetching scores:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  const handleEditStart = (team) => {
    setEditingTeam(team.team_name)
    setEditScore(team.score.toString())
  }

  const handleEditCancel = () => {
    setEditingTeam(null)
    setEditScore('')
  }

  const handleScoreUpdate = async () => {
    const scoreValue = parseInt(editScore, 10)
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 9999) return

    try {
      const response = await fetch(SCORE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: editingTeam,
          score: scoreValue
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update score')
      }

      setEditingTeam(null)
      setEditScore('')
    } catch (error) {
      console.error('Error updating score:', error)
      alert(error.message)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleScoreUpdate()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-ring"></div>
        <span>スコアを読み込んでいます...</span>
      </div>
    )
  }

  // 上位3チームのみ表示（展開時は全チーム表示）
  const displayedScores = expanded ? scores : scores.slice(0, 3)
  const hasMore = scores.length > 3

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <Trophy size={20} />
          <h2>ライブスコア</h2>
        </div>
        {hasMore && (
          <button
            className="expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{expanded ? '閉じる' : 'もっと見る'}</span>
          </button>
        )}
      </div>

      <div className="score-list">
        {displayedScores.map((team, index) => (
          <div key={team.team_name} className="score-item">
            <div className="score-rank">{index + 1}</div>
            <div className="score-team">{team.team_name}</div>
            <div className="score-value">
              {editingTeam === team.team_name ? (
                <div className="score-edit">
                  <input
                    type="number"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    min="0"
                    max="9999"
                  />
                  <button onClick={handleScoreUpdate} className="icon-btn">
                    <Check size={16} />
                  </button>
                  <button onClick={handleEditCancel} className="icon-btn">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span>{team.score}</span>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleEditStart(team)}
                      className="icon-btn"
                      title="スコアを編集"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}