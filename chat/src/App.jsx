import { useState, useEffect, useRef } from 'react'
import { db } from './firebase'
import { ref, push, onValue, serverTimestamp, set, get, update } from 'firebase/database'
import './App.css'

const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'
const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'

function App() {
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [currentRoom, setCurrentRoom] = useState('general')
  const [currentRoomType, setCurrentRoomType] = useState('channel') // channel / dm / group
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
  const bottomRef = useRef(null)

  // ログイン確認
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

  // メンバー取得
  useEffect(() => {
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => setMembers(data))
  }, [])

  // チャンネル一覧
  const channels = members.length > 0 ? [
    { id: 'general', label: '💬 全体' },
    ...([...new Set(members.map(m => m.team).filter(Boolean))].map(t => ({
      id: `team_${t}`,
      label: `🏃 ${t}`
    })))
  ] : [{ id: 'general', label: '💬 全体' }]

  // カスタムグループ取得
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

  // DM履歴取得
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

  // 未読数取得
  useEffect(() => {
    if (!user) return
    const unreadRef = ref(db, `unread/${user.display_name}`)
    onValue(unreadRef, (snapshot) => {
      const data = snapshot.val()
      setUnreadMap(data || {})
    })
  }, [user])

  // メッセージ取得
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

        // 既読処理
        const readUpdate = {}
        list.forEach(msg => {
          if (msg.name !== user.display_name) {
            readUpdate[`reads/${roomId}/${msg.id}/${user.display_name}`] = true
          }
        })
        if (Object.keys(readUpdate).length > 0) {
          update(ref(db), readUpdate)
        }

        // 未読リセット
        set(ref(db, `unread/${user.display_name}/${roomId}`), 0)
      } else {
        setMessages([])
      }
    })
    return () => unsubscribe()
  }, [user, currentRoom, currentRoomType, dmTarget])

  // 既読数取得
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!text.trim() || !user) return
    const roomId = currentRoomType === 'dm'
      ? `dm_${[user.display_name, dmTarget].sort().join('_')}`
      : currentRoom

    const msgRef = push(ref(db, `messages/${roomId}`), {
      name: user.display_name,
      team: user.team_name || '',
      text: text.trim(),
      timestamp: serverTimestamp()
    })

    // DM履歴更新
    if (currentRoomType === 'dm' && dmTarget) {
      const now = Date.now()
      set(ref(db, `dm_history/${user.display_name}/${dmTarget}`), { lastAt: now })
      set(ref(db, `dm_history/${dmTarget}/${user.display_name}`), { lastAt: now })

      // 相手の未読を増やす
      get(ref(db, `unread/${dmTarget}/${roomId}`)).then(snap => {
        const current = snap.val() || 0
        set(ref(db, `unread/${dmTarget}/${roomId}`), current + 1)
      })
    }

    // チャンネル・グループの未読を増やす
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

    setText('')
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
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const getRoomId = () => currentRoomType === 'dm'
    ? `dm_${[user?.display_name, dmTarget].sort().join('_')}`
    : currentRoom

  const getReadCount = (msgId) => {
    const roomId = getRoomId()
    const reads = readMap[msgId] || {}
    return Object.keys(reads).filter(name => name !== user?.display_name).length
  }

  const getMemberCount = () => {
    if (currentRoomType === 'dm') return 1
    if (currentRoomType === 'group') {
      const group = customGroups.find(g => g.id === currentRoom)
      return group ? group.members.length - 1 : 0
    }
    return members.length - 1
  }

  const currentRoomLabel = currentRoomType === 'dm'
    ? `💬 ${dmTarget}`
    : currentRoomType === 'group'
      ? `👥 ${customGroups.find(g => g.id === currentRoom)?.name || 'グループ'}`
      : channels.find(r => r.id === currentRoom)?.label || '💬 全体'

  if (!user) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <div className="header">
        <button className="btn-room" onClick={() => {
          setShowRoomList(!showRoomList)
          setShowCreateGroup(false)
        }}>
          {currentRoomLabel} ▼
        </button>
        <div className="user-name">{user.display_name}</div>
      </div>

      {showRoomList && !showCreateGroup && (
        <div className="room-list">
          {/* チャンネル */}
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
              <span>{room.label}</span>
              {unreadMap[room.id] > 0 && <span className="unread-badge">{unreadMap[room.id]}</span>}
            </div>
          ))}

          {/* グループ */}
          <div className="room-section-title-row">
            <span className="room-section-title">グループ</span>
          </div>
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
              <span>👥 {g.name}</span>
              {unreadMap[g.id] > 0 && <span className="unread-badge">{unreadMap[g.id]}</span>}
            </div>
          ))}
          <div className="room-create-group">
            <button className="btn-create-group" onClick={() => setShowCreateGroup(true)}>
              ＋ グループを作成
            </button>
          </div>

          {/* DM */}
          <div className="room-section-title">ダイレクトメッセージ</div>
          <div className="dm-search-wrap">
            <input
              className="dm-search"
              type="text"
              placeholder="🔍 名前で検索"
              value={dmSearch}
              onChange={e => setDmSearch(e.target.value)}
            />
          </div>

          {/* DM履歴 */}
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
                <span>👤 {h.name}</span>
                {unreadMap[roomId] > 0 && <span className="unread-badge">{unreadMap[roomId]}</span>}
              </div>
            )
          })}

          {/* DM検索結果 */}
          {dmSearch !== '' && members
            .filter(m =>
              m.name !== user.display_name &&
              (m.name.includes(dmSearch) || (m.yomi && m.yomi.includes(dmSearch)))
            )
            .map(m => {
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
                  <span>👤 {m.name}</span>
                  {unreadMap[roomId] > 0 && <span className="unread-badge">{unreadMap[roomId]}</span>}
                </div>
              )
            })}
        </div>
      )}

      {/* グループ作成 */}
      {showCreateGroup && (
        <div className="room-list">
          <div className="create-group-header">
            <span>グループを作成</span>
            <button className="btn-back" onClick={() => setShowCreateGroup(false)}>← 戻る</button>
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
              placeholder="🔍 メンバーを検索"
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
              <div className="selected-members">
                選択中：{selectedMembers.join('、')}
              </div>
            )}
            <button className="btn-primary" onClick={handleCreateGroup}>
              グループを作成
            </button>
          </div>
        </div>
      )}

      {/* メッセージ */}
      <div className="messages">
        {messages.map(msg => {
          const isMine = msg.name === user.display_name
          const readCount = isMine ? getReadCount(msg.id) : 0
          const memberCount = getMemberCount()

          return (
            <div key={msg.id} className={`message ${isMine ? 'mine' : 'other'}`}>
              {!isMine && (
                <div className="msg-name">{msg.name}{msg.team ? ` · ${msg.team}` : ''}</div>
              )}
              <div className="msg-bubble">{msg.text}</div>
              <div className="msg-meta">
                {isMine && (
                  <span className="msg-read">
                    {currentRoomType === 'dm'
                      ? readCount > 0 ? '既読' : '未読'
                      : readCount > 0 ? `既読 ${readCount}` : ''}
                  </span>
                )}
                <span className="msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="input-area">
        <input
          className="input-msg"
          type="text"
          placeholder="メッセージを入力"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-send" onClick={handleSend}>送信</button>
      </div>
    </div>
  )
}

export default App