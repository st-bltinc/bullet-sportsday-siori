import { useState, useEffect } from 'react'
import { BotMessageSquare, Pencil, Trash2, Send, Loader2 } from 'lucide-react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/qna/api.php'
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'
const ADMIN_PASSWORD = 'bullet2026'

function App() {
  const [user, setUser] = useState(null)
  const [qnaList, setQnaList] = useState([])
  const [question, setQuestion] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [editInputs, setEditInputs] = useState({})
  const [editTarget, setEditTarget] = useState(null)
  const [sending, setSending] = useState(false)

  // ログイン確認
  useEffect(() => {
    fetch(ME_API, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          const redirect = encodeURIComponent(window.location.href)
          window.location.href = `https://wagahai.mixh.jp/2026/login/?redirect=${redirect}`
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) setUser(data)
        // 初期表示は必ずユーザーモード（adminでも自動で管理者モードにしない）
      })
  }, [])

  useEffect(() => {
    fetchQna()
  }, [])

  const fetchQna = () => {
    fetch(API)
      .then(res => res.json())
      .then(data => setQnaList(data))
  }

  const handleQuestion = () => {
    if (!question.trim()) return alert('質問を入力してください')
    if (!user) return alert('ログインしてください')
    setSending(true)
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'question',
        question: question.trim(),
        user_name: user.display_name
      })
    })
      .then(r => r.json())
      .then(() => {
        fetchQna()
        setQuestion('')
        setSending(false)
      })
  }

  const handleEditAnswer = (id) => {
    const answer = editInputs[id]
    if (!answer?.trim()) return alert('回答を入力してください')
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_answer', id, answer: answer.trim() })
    })
      .then(r => r.json())
      .then(() => {
        fetchQna()
        setEditInputs(prev => ({ ...prev, [id]: '' }))
        setEditTarget(null)
      })
  }

  const handleDelete = (id) => {
    if (!window.confirm('削除しますか？')) return
    fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(r => r.json())
      .then(() => fetchQna())
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <div className="header">
        <div className="page-header-accent" /><h1 className="title">Q&A</h1>
        <div className="header-right">
          <span className="user-name">{user.display_name}</span>
          {isAdmin ? (
            // 管理者モード中：終了ボタン
            <button className="btn-logout" onClick={() => setIsAdmin(false)}>管理者終了</button>
          ) : user.role === 'admin' ? (
            // roleがadmin：パスワードなしで1クリック
            <button className="btn-admin-login" onClick={() => setIsAdmin(true)}>管理者</button>
          ) : (
            // 一般ユーザー：パスワード入力
            <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>管理者ログイン</button>
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

      {!isAdmin && (
        <div className="question-form">
          <textarea
            className="textarea"
            placeholder="質問を入力してください"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={3}
          />
          <button className="btn-primary" onClick={handleQuestion} disabled={sending}>
            {sending ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Loader2 size={15} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} />AI回答を生成中...</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Send size={15} strokeWidth={1.8} />質問する</span>}
          </button>
        </div>
      )}

      <div className="qna-list">
        {qnaList.map(item => (
          <div key={item.id} className={`qna-item ${item.answer ? 'answered' : 'unanswered'}`}>
            <div className="qna-question">
              <div className="qna-meta">
                <span className="qna-user">{item.user_name}</span>
                <span className="qna-date">{formatDate(item.created_at)}</span>
              </div>
              <div className="qna-q-text">Q. {item.question}</div>
            </div>

            {item.answer ? (
              <div className="qna-answer">
                <div className="qna-a-label">
                  {item.is_ai == 1 ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><BotMessageSquare size={14} strokeWidth={1.8} />AI回答</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Pencil size={14} strokeWidth={1.8} />編集済み回答</span>}
                </div>
                <div className="qna-a-text">{item.answer}</div>
              </div>
            ) : (
              <div className="qna-pending">回答待ち</div>
            )}

            {isAdmin && (
              <div className="admin-answer-form">
                {editTarget === item.id ? (
                  <>
                    <textarea
                      className="textarea"
                      placeholder="回答を編集"
                      value={editInputs[item.id] || item.answer || ''}
                      onChange={e => setEditInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                      rows={3}
                    />
                    <div className="admin-answer-btns">
                      <button className="btn-primary" onClick={() => handleEditAnswer(item.id)}>保存</button>
                      <button className="btn-cancel" onClick={() => setEditTarget(null)}>キャンセル</button>
                    </div>
                  </>
                ) : (
                  <div className="admin-answer-btns">
                    <button className="btn-edit-answer" onClick={() => {
                      setEditTarget(item.id)
                      setEditInputs(prev => ({ ...prev, [item.id]: item.answer || '' }))
                    }}><span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Pencil size={13} strokeWidth={1.8} />編集</span></button>
                    <button className="btn-delete-answer" onClick={() => handleDelete(item.id)}><span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trash2 size={13} strokeWidth={1.8} />削除</span></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}

export default App