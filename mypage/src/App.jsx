import { useState, useEffect } from 'react'
import './App.css'

const MEMBERS_API = 'https://wagahai.mixh.jp/2026/members/api.php'

const scheduleData = [
  { time: '09:00', label: '移動開始' },
  { time: '09:30', label: 'とどろきアリーナ集合' },
  { time: '10:00', label: '開場・開会式・運動会開始' },
  { time: '12:00', label: 'ランチ' },
  { time: '13:00', label: '午後の部開始' },
  { time: '15:30', label: '閉会式・記念撮影' },
  { time: '16:00', label: 'バス移動' },
  { time: '17:00', label: 'キラナガーデン豊洲到着・BBQ開始' },
  { time: '20:00', label: 'BBQ終了・バス移動' },
  { time: '21:00', label: '新宿野村ビル到着・二次会（任意）' },
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
  const [members, setMembers] = useState([])
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('mypage_id') || '')
  const [myData, setMyData] = useState(null)
  const [nextSchedule, setNextSchedule] = useState(getNextSchedule())

  useEffect(() => {
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => setMembers(data))
  }, [])

  useEffect(() => {
    if (selectedId) {
      const found = members.find(m => String(m.id) === String(selectedId))
      if (found) setMyData(found)
    }
  }, [selectedId, members])

  useEffect(() => {
    const timer = setInterval(() => {
      setNextSchedule(getNextSchedule())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleSelect = (e) => {
    const id = e.target.value
    setSelectedId(id)
    localStorage.setItem('mypage_id', id)
  }

  if (!myData) {
    return (
      <div className="container">
        <h1 className="title">マイページ</h1>
        <div className="select-form">
          <p>あなたの名前を選択してください</p>
          <select className="select" value={selectedId} onChange={handleSelect}>
            <option value="">選択してください</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="title">マイページ</h1>

      {/* プロフィール */}
      <div className="profile-card">
        <div className="profile-avatar">
          {myData.photo
            ? <img src={myData.photo} alt={myData.name} />
            : <span>{myData.name[0]}</span>
          }
        </div>
        <div className="profile-info">
          <div className="profile-name">{myData.name}</div>
          {myData.department && <div className="profile-dept">{myData.department}</div>}
          {myData.birthday && <div className="profile-meta">🎂 {myData.birthday}</div>}
          {myData.bus_number && <div className="profile-meta">🚌 {myData.bus_number}号車</div>}
          {myData.team && <div className="profile-meta">🏃 {myData.team}</div>}
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

      {/* メンバー変更 */}
      <button className="btn-change" onClick={() => {
        localStorage.removeItem('mypage_id')
        setSelectedId('')
        setMyData(null)
      }}>
        メンバーを変更
      </button>
    </div>
  )
}

export default App