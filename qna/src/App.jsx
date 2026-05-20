import { useState, useEffect } from 'react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/qna/api.php'
const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ADMIN_PASSWORD = 'bullet2026'

function App() {
  const [qnaList, setQnaList] = useState([])
  const [members, setMembers] = useState([])
  const [question, setQuestion] = useState('')
  const [userName, setUserName] = useState(() => localStorage.getItem('qna_user') || '')
  const [userInput, setUserInput] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [editInputs, setEditInputs] = useState({})
  const [editTarget, setEditTarget] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchQna()
    fetchMembers()
  }, [])

  const fetchQna = () => {
    fetch(API)
      .then(res => res.json())
      .then(data => setQnaList(data))
  }

  const fetchMembers = () => {
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => setMembers(data))
  }

  const handleSetUser = () => {
    if (!userInput.trim()) return alert('名前を選択してください')
    localStorage.setItem('qna_user', userInput.trim())
    setUserName(userInput.trim())
  }

  const handleQuestion = () => {
    if (!question.trim()) return alert('質問を入力してください')
    setSending(true)
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'question',
        question: question.trim(),
        user_name: userName
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
      body: JSON.stringify({
        action: 'edit_answer',
        id,
        answer: answer.trim()
      })
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

  if (!userName && !isAdmin) {
    return (
      <div className="container">
        <h1 className="title">❓ Q&A</h1>

        <div className="admin-login-area">
          <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>
            管理者ログイン
          </button>
        </div>

        {showLoginForm && (
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

        <div className="name-form">
          <p>あなたの名前を選択してください</p>
          <input
            className="input"
            type="text"
            placeholder="名前を入力して検索"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
          />
          {userInput && (
            <div className="voter-search-list">
              {members
                .filter(m => m.name.includes(userInput) || (m.yomi && m.yomi.includes(userInput)))
                .map(m => (
                  <div
                    key={m.id}
                    className="voter-search-item"
                    onClick={() => setUserInput(m.name)}
                  >
                    {m.name}
                  </div>
                ))}
            </div>
          )}
          <button className="btn-primary" onClick={handleSetUser}>はじめる</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">❓ Q&A</h1>
        {isAdmin ? (
          <button className="btn-logout" onClick={() => setIsAdmin(false)}>ログアウト</button>
        ) : (
          <button className="btn-name" onClick={() => {
            localStorage.removeItem('qna_user')
            setUserName('')
            setUserInput('')
          }}>
            {userName}
          </button>
        )}
      </div>

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
            {sending ? 'AI回答を生成中...' : '質問する'}
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
                  {item.is_ai == 1 ? '🤖 AI回答' : '✏️ 編集済み回答'}
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
                      <button className="btn-primary" onClick={() => handleEditAnswer(item.id)}>
                        保存
                      </button>
                      <button className="btn-cancel" onClick={() => setEditTarget(null)}>
                        キャンセル
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="admin-answer-btns">
                    <button className="btn-edit-answer" onClick={() => {
                      setEditTarget(item.id)
                      setEditInputs(prev => ({ ...prev, [item.id]: item.answer || '' }))
                    }}>
                      ✏️ 編集
                    </button>
                    <button className="btn-delete-answer" onClick={() => handleDelete(item.id)}>
                      🗑️ 削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isAdmin && (
        <button className="btn-change" onClick={() => {
          localStorage.removeItem('qna_user')
          setUserName('')
          setUserInput('')
        }}>
          名前を変更
        </button>
      )}
    </div>
  )
}

export default App