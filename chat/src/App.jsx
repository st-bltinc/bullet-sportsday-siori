import { useState, useEffect, useRef } from 'react'
import { Camera, Send, X, Users, Plus, ChevronDown, Loader2, MessageCircle, User, Search, ArrowLeft, SmilePlus, Flag, Hash } from 'lucide-react'
import { db } from './firebase'
import { ref, push, onValue, serverTimestamp, set, get, update, remove } from 'firebase/database'
import './App.css'

const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'
const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'

function App() {
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [memberPhotoMap, setMemberPhotoMap] = useState({}) // ★ 名前→写真マップ
  const [messages, setMessages] = useState([])
  const [memberTeamMap, setMemberTeamMap] = useState({})
  const [text, setText] = useState('')
  const [currentRoom, setCurrentRoom] = useState('general')
  const [currentRoomType, setCurrentRoomType] = useState('channel')
  const [dmTarget, setDmTarget] = useState(null)
  const [showRoomList, setShowRoomList] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [groupSearch, setGroupSearch] = useState('')
  const [customGroups, setCustomGroups] = useState([])
  const [dmHistory, setDmHistory] = useState([])
  const [unreadMap, setUnreadMap] = useState({})
  const [readMap, setReadMap] = useState({})
  const [uploading, setUploading] = useState(false)
  const [reactionMap, setReactionMap] = useState({})
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

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
        if (data) setUser(data)
      })
  }, [])

  useEffect(() => {
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => {
        setMembers(data)
        // ★ 名前→写真のマップを作成
        const photoMap = {}
        const teamMap = {}
        data.forEach(m => {
          if (m.photo) photoMap[m.name] = m.photo
          if (m.team) teamMap[m.name] = m.team
        })
        setMemberPhotoMap(photoMap)
        setMemberTeamMap(teamMap)
      })
  }, [])

  const TEAM_COLORS_MAP = {
    '赤チーム': '#FF5C8A',
    '青チーム': '#4088E8',
    '緑チーム': '#40C84A',
    '黄色チーム': '#C8A040',
  }
  const channels = members.length > 0 ? [
    { id: 'general', label: '全体', color: null },
    ...([...new Set(members.map(m => m.team).filter(Boolean))].map(t => ({
      id: `team_${t}`,
      label: t,
      color: TEAM_COLORS_MAP[t] || '#888'
    })))
  ] : [{ id: 'general', label: '全体', color: null }]

  useEffect(() => {
    if (!user) return
    const groupsRef = ref(db, 'groups')
    onValue(groupsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, g]) => ({ id, ...g }))
          .filter(g => g.members && g.members.includes(user.display_name))
        setCustomGroups(list)
      } else {
        setCustomGroups([])
      }
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const historyRef = ref(db, `dm_history/${user.display_name}`)
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([name, info]) => ({ name, ...info }))
          .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
        setDmHistory(list)
      } else {
        setDmHistory([])
      }
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const unreadRef = ref(db, `unread/${user.display_name}`)
    onValue(unreadRef, (snapshot) => {
      const data = snapshot.val()
      setUnreadMap(data || {})
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const roomId = currentRoomType === 'dm'
      ? `dm_${[user.display_name, dmTarget].sort().join('_')}`
      : currentRoom

    const messagesRef = ref(db, `messages/${roomId}`)
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        list.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(list)

        const readUpdate = {}
        list.forEach(msg => {
          if (msg.name !== user.display_name) {
            readUpdate[`reads/${roomId}/${msg.id}/${user.display_name}`] = true
          }
        })
        if (Object.keys(readUpdate).length > 0) {
          update(ref(db), readUpdate)
        }

        set(ref(db, `unread/${user.display_name}/${roomId}`), 0)
      } else {
        setMessages([])
      }
    })
    return () => unsubscribe()
  }, [user, currentRoom, currentRoomType, dmTarget])

  useEffect(() => {
    if (!user || messages.length === 0) return
    const roomId = currentRoomType === 'dm'
      ? `dm_${[user.display_name, dmTarget].sort().join('_')}`
      : currentRoom

    const readsRef = ref(db, `reads/${roomId}`)
    const unsubscribe = onValue(readsRef, (snapshot) => {
      const data = snapshot.val()
      setReadMap(data || {})
    })
    return () => unsubscribe()
  }, [user, currentRoom, currentRoomType, dmTarget, messages])

  // リアクション取得
  useEffect(() => {
    if (!user) return
    const roomId = getRoomId()
    const reactionsRef = ref(db, `reactions/${roomId}`)
    const unsubscribe = onValue(reactionsRef, (snapshot) => {
      const data = snapshot.val()
      setReactionMap(data || {})
    })
    return () => unsubscribe()
  }, [user, currentRoom, currentRoomType, dmTarget])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getRoomId = () => currentRoomType === 'dm'
    ? `dm_${[user?.display_name, dmTarget].sort().join('_')}`
    : currentRoom

  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🤔']

  const handleReaction = (msgId, emoji) => {
    const roomId = getRoomId()
    const path = `reactions/${roomId}/${msgId}/${emoji}/${user.display_name}`
    const current = reactionMap[msgId]?.[emoji]?.[user.display_name]
    if (current) {
      set(ref(db, path), null)
    } else {
      set(ref(db, path), true)
    }
    setShowReactionPicker(null)
  }

  const sendMessage = (msgData) => {
    const roomId = getRoomId()
    push(ref(db, `messages/${roomId}`), {
      ...msgData,
      name: user.display_name,
      team: user.team_name || '',
      timestamp: serverTimestamp()
    })

    if (currentRoomType === 'dm' && dmTarget) {
      const now = Date.now()
      set(ref(db, `dm_history/${user.display_name}/${dmTarget}`), { lastAt: now })
      set(ref(db, `dm_history/${dmTarget}/${user.display_name}`), { lastAt: now })
      get(ref(db, `unread/${dmTarget}/${roomId}`)).then(snap => {
        const current = snap.val() || 0
        set(ref(db, `unread/${dmTarget}/${roomId}`), current + 1)
      })
    }

    if (currentRoomType !== 'dm') {
      members.forEach(m => {
        if (m.name !== user.display_name) {
          get(ref(db, `unread/${m.name}/${roomId}`)).then(snap => {
            const current = snap.val() || 0
            set(ref(db, `unread/${m.name}/${roomId}`), current + 1)
          })
        }
      })
    }
  }

  const handleSend = () => {
    if (!text.trim() || !user) return
    sendMessage({ text: text.trim(), type: 'text' })
    setText('')
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('JPG・PNG・GIF・WebP形式の画像のみ送信できます')
      fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('https://wagahai.mixh.jp/2026/chat/upload.php', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.url) {
        sendMessage({ imageUrl: data.url, type: 'image' })
      } else {
        alert('画像のアップロードに失敗しました')
      }
    } catch (err) {
      alert('画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
      fileInputRef.current.value = ''
    }
  }

  const handleCreateGroup = () => {
    if (!groupName.trim()) return alert('グループ名を入力してください')
    if (selectedMembers.length === 0) return alert('メンバーを選択してください')

    const groupId = `group_${Date.now()}`
    const allMembers = [...selectedMembers, user.display_name]

    set(ref(db, `groups/${groupId}`), {
      name: groupName.trim(),
      members: allMembers,
      createdBy: user.display_name,
      createdAt: Date.now()
    })

    setCurrentRoom(groupId)
    setCurrentRoomType('group')
    setDmTarget(null)
    setShowCreateGroup(false)
    setGroupName('')
    setSelectedMembers([])
    setGroupSearch('')
    setShowRoomList(false)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    const now = new Date()
    const isToday = d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    if (isToday) return time
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`
  }

  const getReadCount = (msgId) => {
    const reads = readMap[msgId] || {}
    return Object.keys(reads).filter(name => name !== user?.display_name).length
  }

  const currentRoomLabel = currentRoomType === 'dm'
    ? dmTarget
    : currentRoomType === 'group'
      ? (customGroups.find(g => g.id === currentRoom)?.name || 'グループ')
      : channels.find(r => r.id === currentRoom)?.label || '全体'

  const filteredDmMembers = members.filter(m =>
    m.name !== user?.display_name &&
    (dmSearch === '' || m.name.includes(dmSearch) || (m.yomi && m.yomi.includes(dmSearch)))
  )

  // ★ メッセージアバターコンポーネント
  const TEAM_COLORS = {
    '赤チーム': { color: '#E84040', glow: 'rgba(232,64,64,0.5)' },
    '青チーム': { color: '#4088E8', glow: 'rgba(64,136,232,0.5)' },
    '緑チーム': { color: '#40C84A', glow: 'rgba(64,200,74,0.5)' },
    '黄色チーム': { color: '#C8A040', glow: 'rgba(200,160,64,0.5)' },
  }
  const MsgAvatar = ({ name }) => {
    const photo = memberPhotoMap[name]
    const team = memberTeamMap[name]
    const tc = TEAM_COLORS[team]
    const borderStyle = tc
      ? { border: `2px solid ${tc.color}`, boxShadow: `0 0 6px ${tc.glow}` }
      : { border: '2px solid rgba(255,255,255,0.15)' }
    return (
      <div className="msg-avatar" style={borderStyle}>
        {photo
          ? <img src={photo} alt={name} />
          : <span style={tc ? { color: tc.color } : {}}>{name?.[0] ?? '?'}</span>
        }
      </div>
    )
  }

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <div className="header">
        <button className="btn-room" onClick={() => {
          setShowRoomList(!showRoomList)
          setShowCreateGroup(false)
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{currentRoomLabel} <ChevronDown size={14} strokeWidth={2} /></span>
        </button>
        <div className="user-name">{user.display_name}</div>
      </div>

      {showRoomList && !showCreateGroup && (
        <div className="room-list">
          <div className="room-section-title">チャンネル</div>
          {channels.map(room => (
            <div
              key={room.id}
              className={`room-item ${currentRoom === room.id && currentRoomType === 'channel' ? 'active' : ''}`}
              onClick={() => {
                setCurrentRoom(room.id)
                setCurrentRoomType('channel')
                setDmTarget(null)
                setShowRoomList(false)
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{room.color ? <Flag size={13} strokeWidth={1.8} color={room.color} /> : <Hash size={13} strokeWidth={1.8} color="#888" />}{room.label}</span>
              {unreadMap[room.id] > 0 && <span className="unread-badge">{unreadMap[room.id]}</span>}
            </div>
          ))}

          {customGroups.length > 0 && (
            <>
              <div className="room-section-title">グループ</div>
              {customGroups.map(g => (
                <div
                  key={g.id}
                  className={`room-item ${currentRoom === g.id && currentRoomType === 'group' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentRoom(g.id)
                    setCurrentRoomType('group')
                    setDmTarget(null)
                    setShowRoomList(false)
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Users size={14} strokeWidth={1.8} />{g.name}</span>
                  {unreadMap[g.id] > 0 && <span className="unread-badge">{unreadMap[g.id]}</span>}
                </div>
              ))}
            </>
          )}

          <div className="room-create-group">
            <button className="btn-create-group" onClick={() => setShowCreateGroup(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Plus size={14} strokeWidth={2} />グループを作成</span>
            </button>
          </div>

          <div className="room-section-title">ダイレクトメッセージ</div>
          <div className="dm-search-wrap">
            <input
              className="dm-search"
              type="text"
              placeholder="名前で検索"
              value={dmSearch}
              onChange={e => setDmSearch(e.target.value)}
            />
          </div>

          {dmSearch === '' && dmHistory.map(h => {
            const roomId = `dm_${[user.display_name, h.name].sort().join('_')}`
            return (
              <div
                key={h.name}
                className={`room-item ${dmTarget === h.name ? 'active' : ''}`}
                onClick={() => {
                  setDmTarget(h.name)
                  setCurrentRoomType('dm')
                  setShowRoomList(false)
                  setDmSearch('')
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><User size={14} strokeWidth={1.8} />{h.name}</span>
                {unreadMap[roomId] > 0 && <span className="unread-badge">{unreadMap[roomId]}</span>}
              </div>
            )
          })}

          {dmSearch !== '' && filteredDmMembers.map(m => {
            const roomId = `dm_${[user.display_name, m.name].sort().join('_')}`
            return (
              <div
                key={m.id}
                className={`room-item ${dmTarget === m.name ? 'active' : ''}`}
                onClick={() => {
                  setDmTarget(m.name)
                  setCurrentRoomType('dm')
                  setShowRoomList(false)
                  setDmSearch('')
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><User size={14} strokeWidth={1.8} />{m.name}</span>
                {unreadMap[roomId] > 0 && <span className="unread-badge">{unreadMap[roomId]}</span>}
              </div>
            )
          })}
        </div>
      )}

      {showCreateGroup && (
        <div className="room-list">
          <div className="create-group-header">
            <span>グループを作成</span>
            <button className="btn-back" onClick={() => setShowCreateGroup(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ArrowLeft size={14} strokeWidth={2} />戻る</button>
          </div>
          <div className="create-group-body">
            <input
              className="input"
              type="text"
              placeholder="グループ名*"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <input
              className="input"
              type="text"
              placeholder="メンバーを検索"
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
            />
            <div className="member-select-list">
              {members
                .filter(m =>
                  m.name !== user.display_name &&
                  (groupSearch === '' || m.name.includes(groupSearch) || (m.yomi && m.yomi.includes(groupSearch)))
                )
                .map(m => (
                  <div
                    key={m.id}
                    className={`member-select-item ${selectedMembers.includes(m.name) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMembers(prev =>
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
            {selectedMembers.length > 0 && (
              <div className="selected-members">選択中：{selectedMembers.join('、')}</div>
            )}
            <button className="btn-primary" onClick={handleCreateGroup}>グループを作成</button>
          </div>
        </div>
      )}

      <div className="messages">
        {messages.map(msg => {
          const isMine = msg.name === user.display_name
          const readCount = isMine ? getReadCount(msg.id) : 0

          return (
            <div key={msg.id} className={`message ${isMine ? 'mine' : 'other'}`}>
              {/* ★ 相手のメッセージにアバター表示 */}
              {!isMine && <MsgAvatar name={msg.name} />}

              <div className="msg-content">
                {!isMine && (
                  <div className="msg-name">{msg.name}{msg.team ? ` · ${msg.team}` : ''}</div>
                )}
                <div className="msg-bubble-wrap">
                  {msg.type === 'image' ? (
                    <img src={msg.imageUrl} alt="画像" className="msg-image" />
                  ) : (
                    <div className="msg-bubble">{msg.text}</div>
                  )}
                  {!isMine && (
                    <button
                      className="btn-reaction-add"
                      onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                    >
                      <SmilePlus size={16} strokeWidth={1.8} />
                    </button>
                  )}
                </div>

                {/* リアクションピッカー */}
                {showReactionPicker === msg.id && (
                  <div className="reaction-picker">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        className="reaction-btn"
                        onClick={() => handleReaction(msg.id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* リアクション表示 */}
                {reactionMap[msg.id] && (
                  <div className="reaction-list">
                    {Object.entries(reactionMap[msg.id]).map(([emoji, users]) => {
                      const count = Object.keys(users).length
                      const myReaction = users[user.display_name]
                      return (
                        <button
                          key={emoji}
                          className={`reaction-item ${myReaction ? 'reacted' : ''}`}
                          onClick={() => handleReaction(msg.id, emoji)}
                        >
                          {emoji} {count}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="msg-meta">
                  {isMine && (
                    <span className="msg-read">
                      {currentRoomType === 'dm'
                        ? readCount > 0 ? '既読' : '未読'
                        : readCount > 0 ? `既読 ${readCount}` : ''}
                    </span>
                  )}
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                  {user.role === 'admin' && currentRoomType === 'channel' && (
                    <button
                      className="btn-delete-msg"
                      onClick={() => {
                        if (window.confirm('このメッセージを取り消しますか？')) {
                          remove(ref(db, `messages/${currentRoom}/${msg.id}`))
                        }
                      }}
                    ><X size={13} strokeWidth={2} /></button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          className="btn-image"
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={20} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={20} strokeWidth={1.8} />}
        </button>
        <input
          className="input-msg"
          type="text"
          placeholder="メッセージを入力"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-send" onClick={handleSend}><Send size={18} strokeWidth={1.8} /></button>
      </div>
    </div>
  )
}

export default App