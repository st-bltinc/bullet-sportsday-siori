import { useState, useEffect } from 'react'
import { Search, X, Check, Flag } from 'lucide-react'

const TEAM_COLORS_MAP = {
  '赤チーム': '#FF5C8A',
  '青チーム': '#4088E8',
  '緑チーム': '#40C84A',
  '黄色チーム': '#C8A040',
}
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/vote/api.php'
const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'

function App() {
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [members, setMembers] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [votedMap, setVotedMap] = useState({})
  const [results, setResults] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategoryMembers, setNewCategoryMembers] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [categoryMembers, setCategoryMembers] = useState({})
  const [voteStats, setVoteStats] = useState({})

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
        }
      })
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchMembers()
  }, [])

  const fetchCategories = () => {
    fetch(`${API}?action=categories`)
      .then(res => res.json())
      .then(data => {
        setCategories(data)
        data.forEach(cat => fetchCategoryMembers(cat.id))
      })
  }

  const fetchMembers = () => {
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => setMembers(data))
  }

  const fetchResults = (categoryId) => {
    fetch(`${API}?action=results&category_id=${categoryId}`)
      .then(res => res.json())
      .then(data => setResults(data))
  }

  const fetchCategoryMembers = (categoryId) => {
    fetch(`${API}?action=category_members&category_id=${categoryId}`)
      .then(res => res.json())
      .then(data => setCategoryMembers(prev => ({ ...prev, [categoryId]: data })))
  }

  const fetchVoteStats = (categoryId) => {
    fetch(`${API}?action=vote_stats&category_id=${categoryId}`)
      .then(res => res.json())
      .then(data => setVoteStats(prev => ({ ...prev, [categoryId]: data })))
  }

  const checkVoted = (categoryId) => {
    if (!user) return
    fetch(`${API}?action=check&category_id=${categoryId}&voter=${encodeURIComponent(user.display_name)}`)
      .then(res => res.json())
      .then(data => {
        setVotedMap(prev => ({ ...prev, [categoryId]: data.voted }))
      })
  }

  const handleSelectCategory = (category) => {
    setSelectedCategory(category)
    setShowResults(false)
    setSearch('')
    setTeamFilter('')
    setResults([])
    if (user) checkVoted(category.id)
    if (isAdmin) fetchVoteStats(category.id)
  }

  const handleVote = (candidate) => {
    if (!user) return
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote',
        category_id: selectedCategory.id,
        candidate,
        voter: user.display_name
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVotedMap(prev => ({ ...prev, [selectedCategory.id]: candidate }))
          if (isAdmin) fetchVoteStats(selectedCategory.id)
        } else {
          alert(data.error)
        }
      })
  }

  const handleChangeVote = () => {
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_vote',
        category_id: selectedCategory.id,
        voter: user.display_name
      })
    })
      .then(res => res.json())
      .then(() => {
        setVotedMap(prev => ({ ...prev, [selectedCategory.id]: null }))
        if (isAdmin) fetchVoteStats(selectedCategory.id)
      })
  }

  const handleTeamFilterChange = (team, targetList, setTargetList) => {
    setTeamFilter(team)
    if (team !== '') {
      const teamMembers = members
        .filter(m => m.team === team)
        .map(m => m.name)
      setTargetList(prev => {
        const merged = [...new Set([...prev, ...teamMembers])]
        return merged
      })
    }
  }

  const handleAddCategory = () => {
    if (!newTitle.trim()) return alert('タイトルは必須です')
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_category',
        title: newTitle,
        description: newDesc,
        members: newCategoryMembers
      })
    })
      .then(res => res.json())
      .then(() => {
        fetchCategories()
        setNewTitle('')
        setNewDesc('')
        setNewCategoryMembers([])
        setSearch('')
        setTeamFilter('')
      })
  }

  const handleDeleteCategory = (id) => {
    if (!window.confirm('削除しますか？')) return
    fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(() => {
        fetchCategories()
        setSelectedCategory(null)
      })
  }

  const handleTogglePublish = (cat) => {
    const newValue = cat.is_published == 1 ? 0 : 1
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_publish',
        id: cat.id,
        is_published: newValue
      })
    })
      .then(res => res.json())
      .then(() => fetchCategories())
  }

  const handleToggleCategoryMember = (categoryId, memberName) => {
    const current = categoryMembers[categoryId] || []
    const isIncluded = current.includes(memberName)
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isIncluded ? 'remove_category_member' : 'add_category_member',
        category_id: categoryId,
        member_name: memberName
      })
    })
      .then(res => res.json())
      .then(() => fetchCategoryMembers(categoryId))
  }

  const handleResetCategoryMembers = (categoryId) => {
    if (!window.confirm('投票対象の選択をリセットしますか？')) return
    const current = categoryMembers[categoryId] || []
    Promise.all(current.map(memberName =>
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_category_member',
          category_id: categoryId,
          member_name: memberName
        })
      })
    )).then(() => fetchCategoryMembers(categoryId))
  }

  const teams = [...new Set(members.map(m => m.team).filter(Boolean))]

  const filteredMembers = (categoryId) => {
    const catMembers = categoryMembers[categoryId] || []
    const available = catMembers.length > 0
      ? members.filter(m => catMembers.includes(m.name))
      : members
    return available.filter(m => {
      const matchSearch = search === '' || m.name.includes(search) || (m.yomi && m.yomi.includes(search))
      const matchTeam = teamFilter === '' || m.team === teamFilter
      return matchSearch && matchTeam
    })
  }

  const filteredMembersForAdmin = () => {
    return members.filter(m => {
      const matchSearch = search === '' || m.name.includes(search) || (m.yomi && m.yomi.includes(search))
      const matchTeam = teamFilter === '' || m.team === teamFilter
      return matchSearch && matchTeam
    })
  }

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <div className="header">
        <div className="page-header-accent" /><h1 className="title">投票</h1>
        <div className="header-right">
          <div className="user-name">{user.display_name}</div>
          {isAdmin ? (
            <button className="btn-logout" onClick={() => setIsAdmin(false)}>管理者終了</button>
          ) : user.role === 'admin' ? (
            <button className="btn-admin-login" onClick={() => setIsAdmin(true)}>管理者</button>
          ) : null}
        </div>
      </div>

      {isAdmin && (
        <div className="admin-form">
          <h2>投票項目を追加</h2>
          <input className="input" placeholder="タイトル*" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <input className="input" placeholder="説明（任意）" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="member-select-title">投票対象メンバーを選択（未選択の場合は全員）</div>
          <div className="filter-row">
            <div className="input-search-wrap"><Search size={14} strokeWidth={1.8} className="search-icon" /><input className="input" style={{ paddingLeft: '2rem' }} placeholder="名前で検索" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="select-wrap"><Flag size={13} strokeWidth={1.8} className="select-icon" style={{ color: teamFilter ? TEAM_COLORS_MAP[teamFilter] : '#888' }} />
              <select className="select" style={{ paddingLeft: '1.8rem' }} value={teamFilter} onChange={e => handleTeamFilterChange(e.target.value, newCategoryMembers, setNewCategoryMembers)}>
                <option value="">チーム全て</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
          </div>
          {(search !== '' || teamFilter !== '') && (
            <div className="member-select-list">
              {filteredMembersForAdmin().map(m => (
                <div key={m.id} className={`member-select-item ${newCategoryMembers.includes(m.name) ? 'selected' : ''}`}
                  onClick={() => setNewCategoryMembers(prev => prev.includes(m.name) ? prev.filter(n => n !== m.name) : [...prev, m.name])}>
                  {m.name}
                </div>
              ))}
            </div>
          )}
          {newCategoryMembers.length > 0 && (
            <div className="selected-preview-row">
              <span className="selected-preview">選択中：{newCategoryMembers.length}人</span>
              <button className="btn-reset-members" onClick={() => setNewCategoryMembers([])}>リセット</button>
            </div>
          )}
          <button className="btn-primary" onClick={handleAddCategory}>追加</button>
        </div>
      )}

      <div className="category-list">
        {categories.map(cat => (
          <div key={cat.id}>
            <div className={`category-card ${selectedCategory?.id === cat.id ? 'active' : ''}`} onClick={() => handleSelectCategory(cat)}>
              <div className="category-info">
                <div className="category-title">{cat.title}</div>
                {cat.description && <div className="category-desc">{cat.description}</div>}
                {votedMap[cat.id] && <div className="voted-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={13} strokeWidth={2} />{votedMap[cat.id]}に投票済み</div>}
                {isAdmin && voteStats[cat.id] && (
                  <div className="vote-rate">
                    投票率：{voteStats[cat.id].voted}/{voteStats[cat.id].total}人
                    （{Math.round(voteStats[cat.id].voted / voteStats[cat.id].total * 100)}%）
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="admin-btns">
                  <button className={`btn-publish ${cat.is_published == 1 ? 'published' : ''}`}
                    onClick={e => { e.stopPropagation(); handleTogglePublish(cat) }}>
                    {cat.is_published == 1 ? '公開中' : '結果を公開'}
                  </button>
                  <button className="btn-delete" onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id) }}>✕</button>
                </div>
              )}
            </div>

            {isAdmin && selectedCategory?.id === cat.id && (
              <div className="member-select-area">
                <div className="member-select-title">投票対象メンバーを編集</div>
                <div className="filter-row">
                  <div className="input-search-wrap"><Search size={14} strokeWidth={1.8} className="search-icon" /><input className="input" style={{ paddingLeft: '2rem' }} placeholder="名前で検索" value={search} onChange={e => setSearch(e.target.value)} /></div>
                  <select className="select" value={teamFilter} onChange={e => {
                    setTeamFilter(e.target.value)
                    if (e.target.value !== '') {
                      const teamMembers = members.filter(m => m.team === e.target.value).map(m => m.name)
                      teamMembers.forEach(memberName => {
                        const current = categoryMembers[cat.id] || []
                        if (!current.includes(memberName)) handleToggleCategoryMember(cat.id, memberName)
                      })
                    }
                  }}>
                    <option value="">チーム全て</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {(search !== '' || teamFilter !== '') && (
                  <div className="member-select-list">
                    {filteredMembersForAdmin().map(m => (
                      <div key={m.id} className={`member-select-item ${(categoryMembers[cat.id] || []).includes(m.name) ? 'selected' : ''}`}
                        onClick={() => handleToggleCategoryMember(cat.id, m.name)}>
                        {m.name}
                      </div>
                    ))}
                  </div>
                )}
                {(categoryMembers[cat.id] || []).length > 0 && (
                  <div className="selected-preview-row">
                    <span className="selected-preview">選択中：{(categoryMembers[cat.id] || []).length}人</span>
                    <button className="btn-reset-members" onClick={() => handleResetCategoryMembers(cat.id)}>リセット</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedCategory && (
        <div className="vote-area">
          <div className="vote-header">
            <span className="vote-title">{selectedCategory.title}</span>
            {isAdmin && (
              <button className="btn-results" onClick={() => { setShowResults(!showResults); if (!showResults) fetchResults(selectedCategory.id) }}>
                {showResults ? '投票画面' : '集計結果'}
              </button>
            )}
          </div>
          {isAdmin && voteStats[selectedCategory.id] && (
            <div className="vote-stats">
              投票率：{voteStats[selectedCategory.id].voted}/{voteStats[selectedCategory.id].total}人
              （{Math.round(voteStats[selectedCategory.id].voted / voteStats[selectedCategory.id].total * 100)}%）
            </div>
          )}
          {showResults && isAdmin ? (
            <div className="results">
              {results.length === 0 ? <p className="no-results">まだ投票がありません</p> : results.map((r, i) => (
                <div key={i} className="result-item">
                  <div className="result-rank">{i + 1}位</div>
                  <div className="result-name">{r.candidate}</div>
                  <div className="result-count">{r.count}票</div>
                  <div className="result-bar"><div className="result-fill" style={{ width: `${(r.count / results[0].count) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {votedMap[selectedCategory.id] && !showResults ? (
                <div className="already-voted">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={14} strokeWidth={2} />{votedMap[selectedCategory.id]}に投票しました</div>
                  {selectedCategory.is_published != 1 && (
                    <button className="btn-change-vote" onClick={handleChangeVote}>投票を変更する</button>
                  )}
                  {selectedCategory.is_published == 1 && (
                    <button className="btn-results-user" onClick={() => { setShowResults(true); fetchResults(selectedCategory.id) }}>結果を見る</button>
                  )}
                  {selectedCategory.is_published == 1 && (
                    <div className="vote-closed-badge">🔒 締め切り済み</div>
                  )}
                </div>
              ) : showResults && !isAdmin ? (
                <div className="results">
                  {results.length === 0 ? <p className="no-results">まだ投票がありません</p> : results.map((r, i) => (
                    <div key={i} className="result-item">
                      <div className="result-rank">{i + 1}位</div>
                      <div className="result-name">{r.candidate}</div>
                      <div className="result-count">{r.count}票</div>
                      <div className="result-bar"><div className="result-fill" style={{ width: `${(r.count / results[0].count) * 100}%` }} /></div>
                    </div>
                  ))}
                  <button className="btn-change-vote" onClick={() => setShowResults(false)}>戻る</button>
                </div>
              ) : selectedCategory.is_published == 1 ? (
                <div className="vote-closed-msg">
                  <div className="vote-closed-icon">🔒</div>
                  <div>この投票は締め切られました</div>
                  <button className="btn-results-user" onClick={() => { setShowResults(true); fetchResults(selectedCategory.id) }}>結果を見る</button>
                </div>
              ) : (
                <>
                  <div className="filter-row">
                    <div className="input-search-wrap"><Search size={14} strokeWidth={1.8} className="search-icon" /><input className="input search-input" type="text" style={{ paddingLeft: '2rem' }} placeholder="名前で検索" value={search} onChange={e => setSearch(e.target.value)} /></div>
                    <div className="select-wrap"><Flag size={13} strokeWidth={1.8} className="select-icon" style={{ color: teamFilter ? TEAM_COLORS_MAP[teamFilter] : '#888' }} /><select className="select" style={{ paddingLeft: '1.8rem', ...(teamFilter ? { color: TEAM_COLORS_MAP[teamFilter], borderColor: TEAM_COLORS_MAP[teamFilter] } : {}) }} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                      <option value="">チーム全て</option>
                      {teams.map(t => <option key={t} value={t} style={{ color: TEAM_COLORS_MAP[t] }}>{t}</option>)}
                    </select></div>
                  </div>
                  <div className="members-list">
                    {filteredMembers(selectedCategory.id).map(m => (
                      <div key={m.id} className="member-vote-card" onClick={() => handleVote(m.name)}>
                        <div className="member-avatar">
                          {m.photo ? <img src={m.photo} alt={m.name} /> : <span>{m.name[0]}</span>}
                        </div>
                        <div className="member-name">{m.name}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}

export default App