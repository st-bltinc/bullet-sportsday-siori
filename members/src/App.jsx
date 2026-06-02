import { useState, useEffect } from 'react'
import { Camera, Loader2, Pencil, Bus, Building2, Cake, MapPin, Home, Gamepad2, Star, Sparkles, Shirt, User, BookOpen, Users, Search, Plus, X, Flag } from 'lucide-react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'
const ADMIN_PASSWORD = 'bullet2026'

const TEAM_COLORS = {
  '赤チーム': { color: '#FF5C8A', border: 'rgba(255,92,138,0.55)' },
  '青チーム': { color: '#4088E8', border: 'rgba(64,136,232,0.5)' },
  '緑チーム': { color: '#40C84A', border: 'rgba(64,200,74,0.5)' },
  '黄色チーム': { color: '#C8A040', border: 'rgba(200,160,64,0.5)' },
}

function getTeamColor(teamName) {
  return TEAM_COLORS[teamName] || { color: '#888', border: 'rgba(136,136,136,0.4)' }
}

function mTeam(m) {
  return m?.team || m?.team_name || ''
}

const ROLE_OPTIONS = [
  '未設定',
  '受付係',
  'カメラ係',
  '競技案内係',
  'バス・BBQの出欠確認係',
  '忘れ物確認係',
]

const PROFILE_FIELDS = [
  { key: 'department', label: '所属', icon: Building2 },
  { key: 'birthday', label: '誕生日', icon: Cake },
  { key: 'hometown', label: '出身地', icon: MapPin },
  { key: 'residence', label: '居住地', icon: Home },
  { key: 'hobby', label: '趣味', icon: Gamepad2 },
  { key: 'skill', label: '特技', icon: Star },
  { key: 'dream', label: '将来の夢', icon: Sparkles },
  { key: 'role_assignment', label: '担当係', icon: Shirt },
]

const USER_EDIT_FIELDS = [
  { key: 'name', label: '名前', icon: User },
  { key: 'yomi', label: '読み仮名', icon: BookOpen },
  { key: 'department', label: '所属', icon: Building2 },
  { key: 'birthday', label: '誕生日', icon: Cake },
  { key: 'hometown', label: '出身地', icon: MapPin },
  { key: 'residence', label: '居住地', icon: Home },
  { key: 'hobby', label: '趣味', icon: Gamepad2 },
  { key: 'skill', label: '特技', icon: Star },
  { key: 'dream', label: '将来の夢', icon: Sparkles },
]

// ========= 詳細モーダル =========
function MemberDetailModal({ member, user, isAdmin, onClose, onUpdate }) {
  const isMine = user?.display_name === member.name
  const canEdit = isAdmin || isMine
  const team = mTeam(member)
  const teamColor = getTeamColor(team)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: member.name || '',
    yomi: member.yomi || '',
    department: member.department || '',
    birthday: member.birthday || '',
    hometown: member.hometown || '',
    residence: member.residence || '',
    hobby: member.hobby || '',
    skill: member.skill || '',
    dream: member.dream || '',
    role_assignment: member.role_assignment || '',
  })
  const [uploading, setUploading] = useState(false)

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('photo', file)
    const res = await fetch(API, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.path) {
      await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...member, photo: data.path })
      })
      onUpdate()
    }
    setUploading(false)
  }

  const handleSave = async () => {
    const updateData = { ...member, ...form }
    await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })
    setEditing(false)
    onUpdate()
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>

        {/* アバター */}
        <div className="detail-avatar-wrap">
          <div className="detail-avatar" style={{ background: `${teamColor.color}33`, border: `3px solid ${teamColor.border}`, color: teamColor.color }}>
            {member.photo
              ? <img src={member.photo} alt={member.name} />
              : <span>{member.name[0]}</span>
            }
          </div>
          {canEdit && (
            <label className="detail-photo-btn" title="写真を変更">
              {uploading ? <Loader2 size={16} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={16} strokeWidth={1.8} />}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </label>
          )}
        </div>

        {/* 名前・バッジ */}
        <div className="detail-name">{member.name}</div>
        {member.yomi && <div className="detail-yomi">{member.yomi}</div>}
        <div className="detail-badges">
          {team && <span className="detail-badge team" style={{ background: `${teamColor.color}26`, border: `1px solid ${teamColor.color}66`, color: teamColor.color }}>{team}</span>}
          {member.bus_number && <span className="detail-badge bus" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Bus size={12} strokeWidth={1.8} />{member.bus_number}号車</span>}
        </div>

        {/* プロフィール */}
        {!editing ? (
          <div className="detail-profile">
            {PROFILE_FIELDS.map(f => member[f.key] ? (
              <div key={f.key} className="detail-row">
                <span className="detail-icon">{(() => { const Icon = f.icon; return <Icon size={14} strokeWidth={1.8} /> })()}</span>
                <span className="detail-label">{f.label}</span>
                <span className="detail-value">{member[f.key]}</span>
              </div>
            ) : null)}
            {canEdit && (
              <button className="detail-edit-btn" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Pencil size={13} strokeWidth={1.8} />編集</button>
            )}
          </div>
        ) : (
          <div className="detail-edit-form">
            {(isAdmin ? [...USER_EDIT_FIELDS, { key: 'team', label: 'チーム', icon: Users }, { key: 'bus_number', label: 'バス番号', icon: Bus }] : USER_EDIT_FIELDS).map(f => (
              <div key={f.key} className="detail-edit-row">
                <label className="detail-edit-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{(() => { const Icon = f.icon; return <Icon size={13} strokeWidth={1.8} /> })()}{f.label}</label>
                <input
                  className="detail-edit-input"
                  value={form[f.key] ?? ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={`${f.label.replace(/^.+ /, '')}を入力`}
                />
              </div>
            ))}
            <div className="detail-edit-row">
              <label className="detail-edit-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shirt size={13} strokeWidth={1.8} />担当係</label>
              <select
                className="detail-edit-input"
                value={form.role_assignment || ''}
                onChange={e => setForm({ ...form, role_assignment: e.target.value })}
              >
                {ROLE_OPTIONS.map(r => <option key={r} value={r === '未設定' ? '' : r}>{r}</option>)}
              </select>
            </div>
            <div className="detail-edit-actions">
              <button className="detail-save-btn" onClick={handleSave}>保存</button>
              <button className="detail-cancel-btn" onClick={() => setEditing(false)}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [busFilter, setBusFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', yomi: '', bus_number: '', photo: '', team: '', department: '', birthday: '', hometown: '', residence: '', hobby: '', skill: '', dream: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)

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
      .then(data => { if (data) setUser(data) })
  }, [])

  useEffect(() => { fetchMembers() }, [])

  const fetchMembers = () => {
    fetch(API).then(res => res.json()).then(data => setMembers(data))
  }

  const filtered = members.filter(m => {
    const matchSearch = m.name.includes(search) || (m.yomi && m.yomi.includes(search))
    const matchBus = busFilter === '' || String(m.bus_number) === busFilter
    const matchTeam = teamFilter === '' || mTeam(m) === teamFilter
    return matchSearch && matchBus && matchTeam
  })

  const teams = [...new Set(members.map(m => mTeam(m)).filter(Boolean))]

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true); setShowLoginForm(false); setPasswordInput('')
    } else { alert('パスワードが違います') }
  }

  const handleLogout = () => { setIsAdmin(false); setShowForm(false); setEditTarget(null) }

  const handlePhotoUpload = async (e, memberId) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('photo', file)
    const res = await fetch(API, { method: 'POST', body: formData })
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

  const emptyForm = { name: '', yomi: '', bus_number: '', photo: '', team: '', department: '', birthday: '', hometown: '', residence: '', hobby: '', skill: '', dream: '' }

  const handleAdd = () => {
    if (!form.name) return alert('名前は必須です')
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(() => { fetchMembers(); setForm(emptyForm); setShowForm(false) })
  }

  const handleEdit = (m) => {
    setEditTarget(m.id)
    setForm({
      name: m.name, yomi: m.yomi || '', bus_number: m.bus_number || '',
      photo: m.photo || '', team: mTeam(m), department: m.department || '',
      birthday: m.birthday || '', hometown: m.hometown || '', residence: m.residence || '',
      hobby: m.hobby || '', skill: m.skill || '', dream: m.dream || ''
    })
    setShowForm(true)
  }

  const handleUpdate = () => {
    if (!form.name) return alert('名前は必須です')
    fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editTarget }) })
      .then(r => r.json()).then(() => { fetchMembers(); setForm(emptyForm); setEditTarget(null); setShowForm(false) })
  }

  const handleDelete = (id) => {
    if (!window.confirm('削除しますか？')) return
    fetch(API, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      .then(r => r.json()).then(() => fetchMembers())
  }

  const handleCsvImport = async () => {
    if (!csvFile) return alert('CSVファイルを選択してください')
    setImporting(true)
    const formData = new FormData()
    formData.append('csv', csvFile)
    const res = await fetch('https://wagahai.mixh.jp/2026/members/import.php', { method: 'POST', body: formData })
    const data = await res.json()
    setImporting(false)
    if (data.success) { alert(`${data.count}人のメンバーを登録しました！`); fetchMembers(); setCsvFile(null) }
    else { alert('インポートに失敗しました') }
  }

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <div className="header">
        <div className="page-header-accent" />
        <h1 className="title">メンバーリスト</h1>
        <div className="admin-area">
          {isAdmin ? (
            <div className="admin-badge-area">
              <span className="admin-badge">管理者モード</span>
              <button className="btn-logout" onClick={handleLogout}>終了</button>
            </div>
          ) : user.role === 'admin' ? (
            <button className="btn-admin-login" onClick={() => setIsAdmin(true)}>管理者</button>
          ) : (
            <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>管理者ログイン</button>
          )}
        </div>
      </div>

      {showLoginForm && !isAdmin && (
        <div className="login-form">
          <input className="input" type="password" placeholder="パスワードを入力" value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button className="btn-add" onClick={handleLogin}>ログイン</button>
          <button className="btn-cancel" onClick={() => setShowLoginForm(false)}>キャンセル</button>
        </div>
      )}

      <div className="controls">
        <input className="input" type="text" placeholder="名前・読み仮名で検索" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="select-wrap">
          <Bus size={14} strokeWidth={1.8} className="select-icon" />
          <select className="select" value={busFilter} onChange={e => setBusFilter(e.target.value)}>
            <option value="">バス全て</option>
            <option value="1">1号車</option>
            <option value="2">2号車</option>
            <option value="3">3号車</option>
          </select>
        </div>
        <div className="select-wrap">
          <Flag size={14} strokeWidth={1.8} className="select-icon" style={{ color: teamFilter ? getTeamColor(teamFilter).color : '#888' }} />
          <select
            className="select"
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            style={teamFilter ? { color: getTeamColor(teamFilter).color, borderColor: getTeamColor(teamFilter).border } : {}}
          >
            <option value="">チーム全て</option>
            {teams.map(t => <option key={t} value={t} style={{ color: getTeamColor(t).color }}>{t}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button className="btn-add" onClick={() => { setShowForm(!showForm); setEditTarget(null); setForm(emptyForm) }}>
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
          <input className="input" placeholder="出身地" value={form.hometown} onChange={e => setForm({ ...form, hometown: e.target.value })} />
          <input className="input" placeholder="居住地" value={form.residence} onChange={e => setForm({ ...form, residence: e.target.value })} />
          <input className="input" placeholder="趣味" value={form.hobby} onChange={e => setForm({ ...form, hobby: e.target.value })} />
          <input className="input" placeholder="特技" value={form.skill} onChange={e => setForm({ ...form, skill: e.target.value })} />
          <input className="input" placeholder="将来の夢" value={form.dream} onChange={e => setForm({ ...form, dream: e.target.value })} />
          <div className="form-actions">
            <button className="btn-add" onClick={editTarget ? handleUpdate : handleAdd}>{editTarget ? '更新' : '追加'}</button>
            <button className="btn-cancel" onClick={() => { setShowForm(false); setEditTarget(null) }}>キャンセル</button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="form">
          <div className="csv-import">
            <h3>CSVで一括インポート</h3>
            <p className="csv-note">形式：name, yomi, department, team, birthday</p>
            <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files[0])} />
            <button className="btn-add" onClick={handleCsvImport} disabled={importing}>
              {importing ? 'インポート中...' : 'CSVをインポート'}
            </button>
          </div>
        </div>
      )}

      <p className="count">{filtered.length}人</p>

      <div className="members-grid">
        {filtered.map(m => {
          const tc = getTeamColor(mTeam(m))
          return (
            <div key={m.id} className="member-card" onClick={() => setSelectedMember(m)}>
              <div className="member-avatar" style={{ background: !m.photo ? `${tc.color}33` : 'transparent', border: `1px solid ${tc.border}`, color: tc.color }}>
                {m.photo ? <img src={m.photo} alt={m.name} /> : <span>{m.name[0]}</span>}
                <label className="avatar-upload-btn" title="写真を変更" onClick={e => e.stopPropagation()}>
                  <Camera size={14} strokeWidth={1.8} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, m.id)} />
                </label>
              </div>
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-yomi">{m.yomi}</div>
                {m.department && <div className="member-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={11} strokeWidth={1.8} />{m.department}</div>}
                {mTeam(m) && <div className="member-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={11} strokeWidth={1.8} />{mTeam(m)}</div>}
                {m.bus_number && <div className="member-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Bus size={11} strokeWidth={1.8} />{m.bus_number}号車</div>}
                {m.birthday && <div className="member-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Cake size={11} strokeWidth={1.8} />{m.birthday}</div>}
              </div>
              {isAdmin && (
                <div className="member-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-edit" onClick={() => handleEdit(m)}>編集</button>
                  <button className="btn-delete" onClick={() => handleDelete(m.id)}>削除</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedMember && (
        <MemberDetailModal
          member={members.find(m => m.id === selectedMember.id) || selectedMember}
          user={user}
          isAdmin={isAdmin}
          onClose={() => setSelectedMember(null)}
          onUpdate={() => { fetchMembers() }}
        />
      )}

      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}

export default App