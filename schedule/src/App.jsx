import { useState, useEffect, useRef } from 'react'
import './App.css'

const scheduleData = [
  { time: '09:00', label: '移動開始', type: 'bus' },
  { time: '09:30', label: 'とどろきアリーナ集合・出欠確認', type: 'checkin' },
  { time: '10:00', label: '開場・開会式・運動会開始', type: 'event' },
  { time: '12:00', label: 'ランチ', type: 'break' },
  { time: '13:00', label: '午後の部開始', type: 'event' },
  { time: '15:30', label: '閉会式・記念撮影', type: 'event' },
  { time: '16:00', label: 'バス移動', type: 'bus' },
  { time: '17:00', label: 'キラナガーデン豊洲到着・BBQ開始', type: 'event' },
  { time: '20:00', label: 'BBQ終了・バス移動', type: 'bus' },
  { time: '21:00', label: '新宿野村ビル到着・二次会（任意）', type: 'after' },
]

function getCurrentIndex() {
  const now = new Date()
  for (let i = scheduleData.length - 1; i >= 0; i--) {
    const [h, m] = scheduleData[i].time.split(':').map(Number)
    const itemDate = new Date()
    itemDate.setHours(h, m, 0, 0)
    if (now >= itemDate) return i
  }
  return 0
}

function App() {
  const [now, setNow] = useState(new Date())
  const currentIndex = getCurrentIndex()
  const notifiedRef = useRef(new Set())

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date()
      setNow(current)

      if ('Notification' in window && Notification.permission === 'granted') {
        scheduleData.forEach((item, i) => {
          const [h, m] = item.time.split(':').map(Number)
          const itemDate = new Date()
          itemDate.setHours(h, m, 0, 0)

          const diff = itemDate - current
          const tenMin = 10 * 60 * 1000

          if (diff > 0 && diff <= tenMin + 30000 && diff >= tenMin - 30000 && !notifiedRef.current.has(i)) {
            notifiedRef.current.add(i)
            new Notification('📅 もうすぐ次の予定です', {
              body: `10分後：${item.time} ${item.label}`,
              icon: '/favicon.ico'
            })
          }
        })
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="container">
      <h1 className="title">タイムスケジュール</h1>
      <div className="now-time">
        現在時刻：{now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
      </div>

      <div className="timeline">
        {scheduleData.map((item, i) => {
          const status = i < currentIndex ? 'past' : i === currentIndex ? 'current' : 'future'
          return (
            <div key={i} className={`tl-item ${status}`}>
              <div className="tl-time">{item.time}</div>
              <div className="tl-line">
                <div className="tl-dot" />
                {i < scheduleData.length - 1 && <div className="tl-bar" />}
              </div>
              <div className="tl-card">
                <span className="tl-label">{item.label}</span>
                {status === 'current' && <span className="tl-now-badge">NOW</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App