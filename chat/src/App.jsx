import { useState, useEffect, useRef } from 'react'
import { db } from './firebase'
import { ref, push, onValue, serverTimestamp } from 'firebase/database'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [userName, setUserName] = useState(() => localStorage.getItem('chat_user') || '')
  const [nameInput, setNameInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const messagesRef = ref(db, 'messages')
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        list.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(list)
      } else {
        setMessages([])
      }
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSetName = () => {
    if (!nameInput.trim()) return alert('名前を入力してください')
    localStorage.setItem('chat_user', nameInput.trim())
    setUserName(nameInput.trim())
  }

  const handleSend = () => {
    if (!text.trim()) return
    push(ref(db, 'messages'), {
      name: userName,
      text: text.trim(),
      timestamp: serverTimestamp()
    })
    setText('')
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (!userName) {
    return (
      <div className="container">
        <h1 className="title">💬 チャット</h1>
        <div className="name-form">
          <p>あなたの名前を入力してください</p>
          <input
            className="input"
            type="text"
            placeholder="名前"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetName()}
          />
          <button className="btn-primary" onClick={handleSetName}>はじめる</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">💬 チャット</h1>
        <button className="btn-name" onClick={() => {
          localStorage.removeItem('chat_user')
          setUserName('')
          setNameInput('')
        }}>
          {userName}
        </button>
      </div>

      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.name === userName ? 'mine' : 'other'}`}>
            {msg.name !== userName && <div className="msg-name">{msg.name}</div>}
            <div className="msg-bubble">{msg.text}</div>
            <div className="msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <input
          className="input"
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