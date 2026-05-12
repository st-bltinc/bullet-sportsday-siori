import { useState, useEffect } from 'react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ADMIN_PASSWORD = 'bullet2026'

function App() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [busFilter, setBusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', yomi: '', bus_number: '', photo: '', team: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = () => {
    fetch(API)
      .then(res => res.json())
      .then(data => setMembers(data))
  }

  const filtered = members.filter(m => {
    const matchSearch = m.name.includes(search) || (m.yomi && m.yomi.includes(search))
    const matchBus = busFilter === '' || String(m.bus_number) === busFilter
    return matchSearch && matchBus
  })

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true)
      setShowLoginForm(false)
      setPasswordInput('')
    } else {
      alert('パスワードが違います')
    }
  }

  const handleLogout = () => {
    setIsAdmin(false)
    setShowForm(false)
    setEditTarget(null)
  }

  const handlePhotoUpload = async (e, memberId) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('photo', file)

    const res = await fetch(API, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (data.path) {
      await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...members.find(m => m.id === memberId), photo: data.path })
      })
      fetchMembers()
    }
  }

  const handleAdd = () => {
    if (!form.name) return alert('名前は必須です')
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(r => r.json())
      .then(() => {
        fetchMembers()
        setForm({ name: '', yomi: '', bus_number: '', photo: '', team: '' })
        setShowForm(false)
      })
  }

  const handleEdit = (m) => {
    setEditTarget(m.id)
    setForm({ name: m.name, yomi: m.yomi || '', bus_number: m.bus_number || '', photo: m.photo || '', team: m.team || '' })
    setShowForm(true)
  }

  const handleUpdate = () => {
    if (!form.name) return alert('名前は必須です')
    fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: editTarget })
    })
      .then(r => r.json())
      .then(() => {
        fetchMembers()
        setForm({ name: '', yomi: '', bus_number: '', photo: '', team: '' })
        setEditTarget(null)
        setShowForm(false)
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
      .then(() => fetchMembers())
  }

  return (
    <div className="container">

      {/* ヘッダー */}
      <div className="header">
        <h1 className="title">👥 メンバーリスト</h1>
        <div className="admin-area">
          {isAdmin ? (
            <div className="admin-badge-area">
              <span className="admin-badge">管理者モード</span>
              <button className="btn-logout" onClick={handleLogout}>ログアウト</button>
            </div>
          ) : (
            <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>
              管理者ログイン
            </button>
          )}
        </div>
      </div>

      {/* 管理者ログインフォーム */}
      {showLoginForm && !isAdmin && (
        <div className="login-form">
          <input
            className="input"
            type="password"
            placeholder="パスワードを入力"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className="btn-add" onClick={handleLogin}>ログイン</button>
          <button className="btn-cancel" onClick={() => setShowLoginForm(false)}>キャンセル</button>
        </div>
      )}

      <div className="controls">
        <input
          className="input"
          type="text"
          placeholder="🔍 名前・読み仮名で検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="select" value={busFilter} onChange={e => setBusFilter(e.target.value)}>
          <option value="">🚌 バス全て</option>
          <option value="1">1号車</option>
          <option value="2">2号車</option>
          <option value="3">3号車</option>
        </select>
        {isAdmin && (
          <button className="btn-add" onClick={() => {
            setShowForm(!showForm)
            setEditTarget(null)
            setForm({ name: '', yomi: '', bus_number: '', photo: '', team: '' })
          }}>
            ＋ メンバー追加
          </button>
        )}
      </div>

      {/* 追加・編集フォーム */}
      {showForm && isAdmin && (
        <div className="form">
          <h2>{editTarget ? 'メンバー編集' : 'メンバー追加'}</h2>
          <input className="input" placeholder="名前*" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="読み仮名" value={form.yomi} onChange={e => setForm({ ...form, yomi: e.target.value })} />
          <select className="select" value={form.bus_number} onChange={e => setForm({ ...form, bus_number: e.target.value })}>
            <option value="">バス番号を選択</option>
            <option value="1">1号車</option>
            <option value="2">2号車</option>
            <option value="3">3号車</option>
          </select>
          <div className="form-actions">
            <button className="btn-add" onClick={editTarget ? handleUpdate : handleAdd}>
              {editTarget ? '更新' : '追加'}
            </button>
            <button className="btn-cancel" onClick={() => {
              setShowForm(false)
              setEditTarget(null)
            }}>キャンセル</button>
          </div>
        </div>
      )}

      <p className="count">{filtered.length}人</p>

      {/* メンバー一覧 */}
      <div className="members-grid">
        {filtered.map(m => (
          <div key={m.id} className="member-card">
            <div className="member-avatar">
              {m.photo ? <img src={m.photo} alt={m.name} /> : <span>{m.name[0]}</span>}
              <label className="avatar-upload-btn" title="写真を変更">
                📷
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handlePhotoUpload(e, m.id)}
                />
              </label>
            </div>
            <div className="member-info">
              <div className="member-name">{m.name}</div>
              <div className="member-yomi">{m.yomi}</div>
              <div className="member-bus">🚌 {m.bus_number}号車</div>
              {m.team && <div className="member-team">🏃 {m.team}</div>}
            </div>
            {isAdmin && (
              <div className="member-actions">
                <button className="btn-edit" onClick={() => handleEdit(m)}>編集</button>
                <button className="btn-delete" onClick={() => handleDelete(m.id)}>削除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App