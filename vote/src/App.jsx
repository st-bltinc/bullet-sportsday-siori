import { useState, useEffect } from 'react'
import './App.css'

const API = 'https://wagahai.mixh.jp/2026/vote/api.php'
const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ADMIN_PASSWORD = 'bullet2026'

function App() {
  const [categories, setCategories] = useState([])
  const [members, setMembers] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [votedMap, setVotedMap] = useState({})
  const [results, setResults] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategoryMembers, setNewCategoryMembers] = useState([])
  const [voter, setVoter] = useState(() => localStorage.getItem('voter') || '')
  const [voterInput, setVoterInput] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryMembers, setCategoryMembers] = useState({})

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

  const checkVoted = (categoryId) => {
    fetch(`${API}?action=check&category_id=${categoryId}&voter=${encodeURIComponent(voter)}`)
      .then(res => res.json())
      .then(data => {
        setVotedMap(prev => ({ ...prev, [categoryId]: data.voted }))
      })
  }

  const handleSelectCategory = (category) => {
    setSelectedCategory(category)
    setShowResults(false)
    setSearch('')
    setResults([])
    if (voter) checkVoted(category.id)
  }

  const handleVote = (candidate) => {
    if (!voter) return alert('名前を選択してください')
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote',
        category_id: selectedCategory.id,
        candidate,
        voter
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVotedMap(prev => ({ ...prev, [selectedCategory.id]: candidate }))
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
        voter
      })
    })
      .then(res => res.json())
      .then(() => {
        setVotedMap(prev => ({ ...prev, [selectedCategory.id]: null }))
      })
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

  const handleSetVoter = () => {
    if (!voterInput.trim()) return alert('名前を選択してください')
    localStorage.setItem('voter', voterInput)
    setVoter(voterInput)
  }

  const filteredMembers = (categoryId) => {
    const catMembers = categoryMembers[categoryId] || []
    const available = catMembers.length > 0
      ? members.filter(m => catMembers.includes(m.name))
      : members
    return available.filter(m =>
      m.name.includes(search) || (m.yomi && m.yomi.includes(search))
    )
  }

  if (!voter && !isAdmin) {
    return (
      <div className="container">
        <h1 className="title">投票</h1>

        <div className="admin-login-area">
          {isAdmin ? (
            <button className="btn-logout" onClick={() => setIsAdmin(false)}>管理者ログアウト</button>
          ) : (
            <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>管理者ログイン</button>
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

        <div className="select-form">
          <p>あなたの名前を選択してください</p>
          <input
            className="input"
            type="text"
            placeholder="名前を入力して検索"
            value={voterInput}
            onChange={e => setVoterInput(e.target.value)}
          />
          {voterInput && (
            <div className="voter-search-list">
              {members
                .filter(m => m.name.includes(voterInput) || (m.yomi && m.yomi.includes(voterInput)))
                .map(m => (
                  <div
                    key={m.id}
                    className="voter-search-item"
                    onClick={() => setVoterInput(m.name)}
                  >
                    {m.name}
                  </div>
                ))}
            </div>
          )}
          <button className="btn-primary" onClick={handleSetVoter}>はじめる</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">投票</h1>
        {isAdmin ? (
          <button className="btn-logout" onClick={() => setIsAdmin(false)}>ログアウト</button>
        ) : (
          <button className="btn-admin-login" onClick={() => setShowLoginForm(!showLoginForm)}>管理者</button>
        )}
      </div>

      {!isAdmin && <div className="voter-name">投票者：{voter}</div>}

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

      {isAdmin && (
        <div className="admin-form">
          <h2>投票項目を追加</h2>
          <input className="input" placeholder="タイトル*" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <input className="input" placeholder="説明（任意）" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="member-select-title">投票対象メンバーを選択（未選択の場合は全員）</div>
          <input
            className="input"
            placeholder="🔍 メンバーを検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="member-select-list">
            {members
              .filter(m => m.name.includes(search) || (m.yomi && m.yomi.includes(search)))
              .map(m => (
                <div
                  key={m.id}
                  className={`member-select-item ${newCategoryMembers.includes(m.name) ? 'selected' : ''}`}
                  onClick={() => {
                    setNewCategoryMembers(prev =>
                      prev.includes(m.name)
                        ? prev.filter(n => n !== m.name)
                        : [...prev, m.name]
                    )
                  }}
                >
                  {m.name}
                </div>
              ))}
          </div>
          <button className="btn-primary" onClick={handleAddCategory}>追加</button>
        </div>
      )}

      <div className="category-list">
        {categories.map(cat => (
          <div key={cat.id}>
            <div
              className={`category-card ${selectedCategory?.id === cat.id ? 'active' : ''}`}
              onClick={() => handleSelectCategory(cat)}
            >
              <div className="category-info">
                <div className="category-title">{cat.title}</div>
                {cat.description && <div className="category-desc">{cat.description}</div>}
                {votedMap[cat.id] && <div className="voted-badge">✓ {votedMap[cat.id]}に投票済み</div>}
              </div>
              {isAdmin && (
                <div className="admin-btns">
                  <button
                    className={`btn-publish ${cat.is_published == 1 ? 'published' : ''}`}
                    onClick={e => { e.stopPropagation(); handleTogglePublish(cat) }}
                  >
                    {cat.is_published == 1 ? '公開中' : '結果を公開'}
                  </button>
                  <button className="btn-delete" onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id) }}>✕</button>
                </div>
              )}
            </div>

            {isAdmin && selectedCategory?.id === cat.id && (
              <div className="member-select-area">
                <div className="member-select-title">投票対象メンバーを編集</div>
                <div className="member-select-list">
                  {members.map(m => (
                    <div
                      key={m.id}
                      className={`member-select-item ${(categoryMembers[cat.id] || []).includes(m.name) ? 'selected' : ''}`}
                      onClick={() => handleToggleCategoryMember(cat.id, m.name)}
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
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
              <button className="btn-results" onClick={() => {
                setShowResults(!showResults)
                if (!showResults) fetchResults(selectedCategory.id)
              }}>
                {showResults ? '投票画面' : '集計結果'}
              </button>
            )}
          </div>

          {showResults && isAdmin ? (
            <div className="results">
              {results.length === 0 ? (
                <p className="no-results">まだ投票がありません</p>
              ) : (
                results.map((r, i) => (
                  <div key={i} className="result-item">
                    <div className="result-rank">{i + 1}位</div>
                    <div className="result-name">{r.candidate}</div>
                    <div className="result-count">{r.count}票</div>
                    <div className="result-bar">
                      <div
                        className="result-fill"
                        style={{ width: `${(r.count / results[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              {votedMap[selectedCategory.id] && !showResults ? (
                <div className="already-voted">
                  <div>✓ {votedMap[selectedCategory.id]}に投票しました</div>
                  {!isAdmin && (
                    <button className="btn-change-vote" onClick={handleChangeVote}>投票を変更する</button>
                  )}
                  {selectedCategory.is_published == 1 && (
                    <button className="btn-results-user" onClick={() => {
                      setShowResults(true)
                      fetchResults(selectedCategory.id)
                    }}>
                      結果を見る
                    </button>
                  )}
                </div>
              ) : showResults && !isAdmin ? (
                <div className="results">
                  {results.length === 0 ? (
                    <p className="no-results">まだ投票がありません</p>
                  ) : (
                    results.map((r, i) => (
                      <div key={i} className="result-item">
                        <div className="result-rank">{i + 1}位</div>
                        <div className="result-name">{r.candidate}</div>
                        <div className="result-count">{r.count}票</div>
                        <div className="result-bar">
                          <div
                            className="result-fill"
                            style={{ width: `${(r.count / results[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                  <button className="btn-change-vote" onClick={() => setShowResults(false)}>戻る</button>
                </div>
              ) : (
                <>
                  {!isAdmin && (
                    <input
                      className="input search-input"
                      type="text"
                      placeholder="🔍 名前で検索"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  )}
                  <div className="members-list">
                    {filteredMembers(selectedCategory.id).map(m => (
                      <div
                        key={m.id}
                        className="member-vote-card"
                        onClick={() => !isAdmin && handleVote(m.name)}
                      >
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

      {!isAdmin && (
        <button className="btn-change" onClick={() => {
          localStorage.removeItem('voter')
          setVoter('')
          setVoterInput('')
        }}>
          名前を変更
        </button>
      )}
    </div>
  )
}

export default App