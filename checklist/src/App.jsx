import { useState, useEffect } from 'react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/checklist/api.php'
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'

function App() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [checks, setChecks] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [newItem, setNewItem] = useState('')
  const [stats, setStats] = useState([])
  const [showStats, setShowStats] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)

  // ログイン確認
  useEffect(() => {
    fetch(ME_API, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          window.location.href = 'https://wagahai.mixh.jp/2026/login/'
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          setUser(data)
          if (data.role === 'admin') setIsAdmin(true)
        }
      })
  }, [])

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    if (user) fetchChecks()
  }, [user])

  const fetchItems = () => {
    fetch(`${API}?action=items`)
      .then(res => res.json())
      .then(data => setItems(data))
  }

  const fetchChecks = () => {
    fetch(`${API}?action=checks&user_name=${encodeURIComponent(user.display_name)}`)
      .then(res => res.json())
      .then(data => setChecks(data.map(id => Number(id))))
  }

  const fetchStats = () => {
    fetch(`${API}?action=stats`)
      .then(res => res.json())
      .then(data => setStats(data))
    fetch(`${API}?action=total_users`)
      .then(res => res.json())
      .then(data => setTotalUsers(data.total))
  }

  const toggleCheck = (itemId) => {
    if (!user) return
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle',
        item_id: itemId,
        user_name: user.display_name
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.checked) {
          setChecks(prev => [...prev, itemId])
        } else {
          setChecks(prev => prev.filter(id => id !== itemId))
        }
        if (showStats) fetchStats()
      })
  }

  const handleLogin = () => {
    if (passwordInput === 'bullet2026') {
      setIsAdmin(true)
      setShowLoginForm(false)
      setPasswordInput('')
    } else {
      alert('パスワードが違います')
    }
  }

  const handleAddItem = () => {
    if (!newItem.trim()) return
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', text: newItem.trim() })
    })
      .then(res => res.json())
      .then(() => {
        fetchItems()
        setNewItem('')
      })
  }

  const handleDeleteItem = (id) => {
    if (!window.confirm('削除しますか？')) return
    fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(() => {
        fetchItems()
        setChecks(prev => prev.filter(cid => cid !== id))
      })
  }

  const handleShowStats = () => {
    setShowStats(!showStats)
    if (!showStats) fetchStats()
  }

  const checkedCount = items.filter(i => checks.includes(Number(i.id))).length

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">持ち物チェックリスト</h1>
        <div className="header-right">
          <span className="user-name">{user.display_name}</span>
          {isAdmin ? (
            <button className="btn-logout" onClick={() => setIsAdmin(false)}>終了</button>
          ) : user.role === 'admin' ? (
            <button className="btn-admin-login" onClick={() => setIsAdmin(true)}>管理者</button>
          ) : (
            <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>管理者</button>
          )}
        </div>
      </div>

      {showLoginForm && !isAdmin && (
        <div className="login-form">
          <input
            className="input"
            type="password"
            placeholder="パスワード"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className="btn-primary" onClick={handleLogin}>ログイン</button>
          <button className="btn-cancel" onClick={() => setShowLoginForm(false)}>キャンセル</button>
        </div>
      )}

      <div className="progress-area">
        <div className="progress-text">{checkedCount} / {items.length} 完了</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${items.length ? (checkedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {isAdmin && (
        <button className="btn-stats" onClick={handleShowStats}>
          {showStats ? '📋 チェックリストに戻る' : '📊 全員のチェック状況を見る'}
        </button>
      )}

      {isAdmin && showStats ? (
        <div className="stats-area">
          <div className="stats-header">全員のチェック状況（参加者：{totalUsers}人）</div>
          {stats.map(item => {
            const checkedUsers = item.checked_users ? item.checked_users.split(',') : []
            const rate = totalUsers > 0 ? Math.round(checkedUsers.length / totalUsers * 100) : 0
            return (
              <div key={item.id} className="stats-item">
                <div className="stats-item-header">
                  <span className="stats-item-text">{item.text}</span>
                  <span className="stats-item-count">{checkedUsers.length}人 ({rate}%)</span>
                </div>
                <div className="stats-bar">
                  <div className="stats-fill" style={{ width: `${rate}%` }} />
                </div>
                {checkedUsers.length > 0 && (
                  <div className="stats-users">
                    {checkedUsers.map((name, i) => (
                      <span key={i} className="stats-user-tag">{name}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="list">
            {items.map(item => (
              <div key={item.id} className={`list-item ${checks.includes(Number(item.id)) ? 'checked' : ''}`}>
                <div className="list-item-left" onClick={() => toggleCheck(Number(item.id))}>
                  <div className="checkbox">
                    {checks.includes(Number(item.id)) && <span className="check-icon">✓</span>}
                  </div>
                  <span className="item-text">{item.text}</span>
                </div>
                {isAdmin && (
                  <button className="btn-delete-item" onClick={() => handleDeleteItem(item.id)}>✕</button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="add-form">
              <input
                className="input"
                type="text"
                placeholder="新しい持ち物を追加"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              <button className="btn-primary" onClick={handleAddItem}>追加</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App