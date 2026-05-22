import { useState, useEffect } from 'react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'
const ADMIN_PASSWORD = 'bullet2026'

function App() {
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [busFilter, setBusFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', yomi: '', bus_number: '', photo: '', team: '', department: '', birthday: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [importing, setImporting] = useState(false)

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
          // 最初は必ずユーザーモード（管理者でも）
        }
      })
  }, [])

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
    const matchTeam = teamFilter === '' || (m.team && m.team === teamFilter)
    return matchSearch && matchBus && matchTeam
  })

  const teams = [...new Set(members.map(m => m.team).filter(Boolean))]

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
        setForm({ name: '', yomi: '', bus_number: '', photo: '', team: '', department: '', birthday: '' })
        setShowForm(false)
      })
  }

  const handleEdit = (m) => {
    setEditTarget(m.id)
    setForm({
      name: m.name,
      yomi: m.yomi || '',
      bus_number: m.bus_number || '',
      photo: m.photo || '',
      team: m.team || '',
      department: m.department || '',
      birthday: m.birthday || ''
    })
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
        setForm({ name: '', yomi: '', bus_number: '', photo: '', team: '', department: '', birthday: '' })
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

  const handleCsvImport = async () => {
    if (!csvFile) return alert('CSVファイルを選択してください')
    setImporting(true)
    const formData = new FormData()
    formData.append('csv', csvFile)

    const res = await fetch('https://wagahai.mixh.jp/2026/members/import.php', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    setImporting(false)

    if (data.success) {
      alert(`${data.count}人のメンバーを登録しました！`)
      fetchMembers()
      setCsvFile(null)
    } else {
      alert('インポートに失敗しました')
    }
  }

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">

      <div className="header">
        <h1 className="title">👥 メンバーリスト</h1>
        <div className="admin-area">
          {isAdmin ? (
            <div className="admin-badge-area">
              <span className="admin-badge">管理者モード</span>
              <button className="btn-logout" onClick={handleLogout}>終了</button>
            </div>
          ) : user.role === 'admin' ? (
            <button className="btn-admin-login" onClick={() => setIsAdmin(true)}>
              管理者
            </button>
          ) : (
            <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>
              管理者ログイン
            </button>
          )}
        </div>
      </div>

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
        <select className="select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="">🏃 チーム全て</option>
          {teams.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {isAdmin && (
          <button className="btn-add" onClick={() => {
            setShowForm(!showForm)
            setEditTarget(null)
            setForm({ name: '', yomi: '', bus_number: '', photo: '', team: '', department: '', birthday: '' })
          }}>
            ＋ メンバー追加
          </button>
        )}
      </div>

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
          <input className="input" placeholder="所属名" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
          <input className="input" placeholder="チーム名" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} />
          <input className="input" placeholder="誕生日（例：05/01）" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
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

      {isAdmin && (
        <div className="form">
          <div className="csv-import">
            <h3>CSVで一括インポート</h3>
            <p className="csv-note">形式：name, yomi, department, team, birthday</p>
            <input
              type="file"
              accept=".csv"
              onChange={e => setCsvFile(e.target.files[0])}
            />
            <button
              className="btn-add"
              onClick={handleCsvImport}
              disabled={importing}
            >
              {importing ? 'インポート中...' : 'CSVをインポート'}
            </button>
          </div>
        </div>
      )}

      <p className="count">{filtered.length}人</p>

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
              {m.department && <div className="member-meta">🏢 {m.department}</div>}
              {m.team && <div className="member-meta">🏃 {m.team}</div>}
              {m.bus_number && <div className="member-meta">🚌 {m.bus_number}号車</div>}
              {m.birthday && <div className="member-meta">🎂 {m.birthday}</div>}
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