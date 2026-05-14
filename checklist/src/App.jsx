import { useState, useEffect } from 'react'
import './App.css'

const ADMIN_PASSWORD = 'bullet2026'

const defaultItems = [
  { id: 1, text: '動きやすい服装・運動靴' },
  { id: 2, text: '着替え' },
  { id: 3, text: 'タオル・汗拭きタオル' },
  { id: 4, text: '水筒・飲み物' },
  { id: 5, text: '日焼け止め・帽子' },
  { id: 6, text: '保険証' },
  { id: 7, text: 'レジャーシート' },
  { id: 8, text: 'スマートフォン' },
]

function App() {
  const [checks, setChecks] = useState(() => {
    const saved = localStorage.getItem('checklist_checks')
    return saved ? JSON.parse(saved) : {}
  })
  const [items, setItems] = useState(defaultItems)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    localStorage.setItem('checklist_checks', JSON.stringify(checks))
  }, [checks])

  const toggleCheck = (id) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true)
      setShowLoginForm(false)
      setPasswordInput('')
    } else {
      alert('パスワードが違います')
    }
  }

  const handleAddItem = () => {
    if (!newItem.trim()) return
    const newId = Date.now()
    setItems(prev => [...prev, { id: newId, text: newItem.trim() }])
    setNewItem('')
  }

  const handleDeleteItem = (id) => {
    if (!window.confirm('削除しますか？')) return
    setItems(prev => prev.filter(i => i.id !== id))
    setChecks(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const resetAll = () => {
    if (window.confirm('チェックをリセットしますか？')) {
      setChecks({})
    }
  }

  const checkedCount = items.filter(i => checks[i.id]).length

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">持ち物チェックリスト</h1>
        {isAdmin ? (
          <button className="btn-logout" onClick={() => setIsAdmin(false)}>ログアウト</button>
        ) : (
          <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>
            管理者
          </button>
        )}
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

      <div className="list">
        {items.map(item => (
          <div key={item.id} className={`list-item ${checks[item.id] ? 'checked' : ''}`}>
            <div className="list-item-left" onClick={() => toggleCheck(item.id)}>
              <div className="checkbox">
                {checks[item.id] && <span className="check-icon">✓</span>}
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

      <button className="btn-reset" onClick={resetAll}>リセット</button>
    </div>
  )
}

export default App