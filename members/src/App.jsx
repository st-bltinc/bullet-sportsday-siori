import { useState, useEffect } from 'react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/members/api.php'

function App() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [busFilter, setBusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', yomi: '', bus_number: '', photo: '', team: '' })

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

  const handleAdd = () => {
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

  return (
    <div className="container">
      <h1 className="title">👥 メンバーリスト</h1>

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
        <button className="btn-add" onClick={() => setShowForm(!showForm)}>
          ＋ メンバー追加
        </button>
      </div>

      {showForm && (
        <div className="form">
          <h2>メンバー追加</h2>
          <input className="input" placeholder="名前*" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="読み仮名" value={form.yomi} onChange={e => setForm({ ...form, yomi: e.target.value })} />
          <select className="select" value={form.bus_number} onChange={e => setForm({ ...form, bus_number: e.target.value })}>
            <option value="">バス番号を選択</option>
            <option value="1">1号車</option>
            <option value="2">2号車</option>
            <option value="3">3号車</option>
          </select>
          <div className="form-actions">
            <button className="btn-add" onClick={handleAdd}>追加</button>
            <button className="btn-cancel" onClick={() => setShowForm(false)}>キャンセル</button>
          </div>
        </div>
      )}

      <p className="count">{filtered.length}人</p>

      <div className="members-grid">
        {filtered.map(m => (
          <div key={m.id} className="member-card">
            <div className="member-avatar">
              {m.photo ? <img src={m.photo} alt={m.name} /> : <span>{m.name[0]}</span>}
            </div>
            <div className="member-info">
              <div className="member-name">{m.name}</div>
              <div className="member-yomi">{m.yomi}</div>
              <div className="member-bus">🚌 {m.bus_number}号車</div>
              {m.team && <div className="member-team">🏃 {m.team}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App