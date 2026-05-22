import { useState, useEffect } from 'react'
import './App.css'

const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'

const scheduleData = [
  { time: '10:00', label: '受付開始' },
  { time: '10:30', label: '集合期限' },
  { time: '10:45', label: '開会式' },
  { time: '13:00', label: 'お昼' },
  { time: '15:30', label: '閉会式' },
  { time: '16:00', label: 'バス出発' },
  { time: '17:00', label: 'BBQ開始（キラナガーデン豊洲）' },
  { time: '19:00', label: 'ラストオーダー' },
  { time: '20:00', label: '解散' },
  { time: '21:00', label: '二次会（新宿野村ビル）' },
]

function getNextSchedule() {
  const now = new Date()
  for (let i = 0; i < scheduleData.length; i++) {
    const [h, m] = scheduleData[i].time.split(':').map(Number)
    const itemDate = new Date()
    itemDate.setHours(h, m, 0, 0)
    if (now < itemDate) return scheduleData[i]
  }
  return null
}

function App() {
  const [user, setUser] = useState(null)
  const [myData, setMyData] = useState(null)
  const [nextSchedule, setNextSchedule] = useState(getNextSchedule())
  const [loading, setLoading] = useState(true)

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
        if (data) {
          setUser(data)
        }
      })
  }, [])

  // メンバーリストから自分のデータを取得
  useEffect(() => {
    if (!user) return
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => {
        const found = data.find(m => m.name === user.display_name)
        if (found) setMyData(found)
        setLoading(false)
      })
  }, [user])

  // スケジュール更新
  useEffect(() => {
    const timer = setInterval(() => {
      setNextSchedule(getNextSchedule())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  if (!user || loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="container">
      <h1 className="title">マイページ</h1>

      {/* プロフィール */}
      <div className="profile-card">
        <div className="profile-avatar">
          {myData?.photo
            ? <img src={myData.photo} alt={user.display_name} />
            : <span>{user.display_name[0]}</span>
          }
        </div>
        <div className="profile-info">
          <div className="profile-name">{user.display_name}</div>
          {myData?.department && <div className="profile-dept">{myData.department}</div>}
          {myData?.birthday && <div className="profile-meta">🎂 {myData.birthday}</div>}
          {myData?.bus_number && <div className="profile-meta">🚌 {myData.bus_number}号車</div>}
          {myData?.team && <div className="profile-meta">🏃 {myData.team}</div>}
        </div>
      </div>

      {/* 次の予定 */}
      <div className="next-schedule">
        <div className="next-label">次の予定</div>
        {nextSchedule ? (
          <div className="next-content">
            <div className="next-time">{nextSchedule.time}</div>
            <div className="next-event">{nextSchedule.label}</div>
          </div>
        ) : (
          <div className="next-content">
            <div className="next-event">本日のスケジュールは終了しました🎉</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App