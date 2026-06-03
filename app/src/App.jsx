import { useState, useEffect } from 'react'
import { CalendarClock, MessageCircle, LayoutGrid, MapPin, Users, Vote, ClipboardCheck, HelpCircle, Images, BookOpen, UserCog, Gamepad2, LogOut, CheckSquare, Camera, Trash2, Plus, X, ChevronUp, ChevronDown, Phone, MessageSquare, Star, Lock, Settings, Pencil, Bus, Clock, Flame, Trophy, Flag, DoorOpen, UtensilsCrossed, Sparkles, Wine, Bell, ArrowRightFromLine, Award, Target, Link, Circle, Send, RotateCcw, Zap, Shield } from 'lucide-react'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref as fbRef, set as fbSet, onValue as fbOnValue, get as fbGet } from 'firebase/database'
import './App.css'

// Firebase初期化（既存のchatと同じconfig）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "bullet-sportsday.firebaseapp.com",
  databaseURL: "https://bullet-sportsday-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bullet-sportsday",
  storageBucket: "bullet-sportsday.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const fdb = getDatabase(firebaseApp)

const ME_API = '/2026/login/me.php'
const MEMBERS_API = '/2026/members/api.php'
const NOTICES_API = '/2026/notices/api.php'

const scheduleData = [
  { time: '10:00', endTime: '10:30', label: '受付開始', icon: '🚪', lucide: DoorOpen, place: 'メイングラウンド' },
  { time: '10:30', endTime: '10:45', label: '集合期限', icon: '📍', lucide: MapPin, place: 'メイングラウンド' },
  { time: '10:45', endTime: '13:00', label: '開会式', icon: '🎌', lucide: Flag, place: 'メイングラウンド' },
  { time: '13:00', endTime: '14:00', label: 'お昼', icon: '🍱', lucide: UtensilsCrossed, place: '休憩エリア' },
  { time: '15:30', endTime: '16:00', label: '閉会式', icon: '🏆', lucide: Trophy, place: 'メイングラウンド' },
  { time: '16:00', endTime: '17:00', label: 'バス出発', icon: '🚌', lucide: Bus, place: '駐車場' },
  { time: '17:00', endTime: '19:00', label: 'BBQ開始', icon: '🔥', lucide: Flame, place: 'キラナガーデン豊洲' },
  { time: '19:00', endTime: '20:00', label: 'ラストオーダー', icon: '🍺', lucide: Wine, place: 'キラナガーデン豊洲' },
  { time: '20:00', endTime: '21:00', label: '解散', icon: '👋', lucide: ArrowRightFromLine, place: '' },
  { time: '21:00', endTime: '23:00', label: '二次会', icon: '🎉', lucide: Sparkles, place: '新宿野村ビル' },
]

const TEAM_COLORS = {
  '赤チーム': { color: '#FF5C8A', glow: 'rgba(255,92,138,0.45)', dim: 'rgba(255,92,138,0.15)', border: 'rgba(255,92,138,0.55)', logo: '/2026/logo-red.png' },
  '青チーム': { color: '#4088E8', glow: 'rgba(64,136,232,0.5)', dim: 'rgba(64,136,232,0.15)', border: 'rgba(64,136,232,0.6)', logo: '/2026/logo-blue.png' },
  '緑チーム': { color: '#40C84A', glow: 'rgba(64,200,74,0.5)', dim: 'rgba(64,200,74,0.15)', border: 'rgba(64,200,74,0.6)', logo: '/2026/logo-green.png' },
  '黄色チーム': { color: '#C8A040', glow: 'rgba(200,160,64,0.5)', dim: 'rgba(200,160,64,0.15)', border: 'rgba(200,160,64,0.6)', logo: '/2026/logo-yellow.png' },
}

function getTeamColor(teamName) {
  return TEAM_COLORS[teamName] || TEAM_COLORS['赤チーム']
}

function getNextSchedule() {
  const now = new Date()
  for (let i = 0; i < scheduleData.length; i++) {
    const [h, m] = scheduleData[i].time.split(':').map(Number)
    const itemDate = new Date(); itemDate.setHours(h, m, 0, 0)
    if (now < itemDate) return { ...scheduleData[i], isNow: false }
  }
  return null
}

// ========= お知らせ編集モーダル =========
function NoticeEditModal({ notices, onSave, onClose }) {
  const [items, setItems] = useState(notices.map(n => ({ ...n })))

  const update = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    setItems(next)
  }

  const addRow = () => setItems([...items, { label: '', value: '' }])
  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Bell size={16} strokeWidth={1.8} /> お知らせ編集</span>
          <button className="modal-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        </div>
        <div className="modal-body">
          {items.map((item, i) => (
            <div key={i} className="modal-row">
              <input
                className="modal-input label"
                placeholder="項目名"
                value={item.label}
                onChange={e => update(i, 'label', e.target.value)}
              />
              <input
                className="modal-input value"
                placeholder="内容"
                value={item.value}
                onChange={e => update(i, 'value', e.target.value)}
              />
              <button className="modal-del" onClick={() => removeRow(i)}><Trash2 size={15} strokeWidth={1.8} /></button>
            </div>
          ))}
          <button className="modal-add" onClick={addRow}><Plus size={14} strokeWidth={2} style={{ display: 'inline', marginRight: '0.3rem' }} /> 行を追加</button>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>キャンセル</button>
          <button className="modal-btn save" onClick={() => onSave(items)}>保存</button>
        </div>
      </div>
    </div>
  )
}

function HomePage({ user, myData }) {
  // scheduleをFirebaseから取得（SchedulePageと同期）
  useEffect(() => {
    fbOnValue(fbRef(fdb, 'schedule_overrides'), snap => {
      const data = snap.val()
      if (data) {
        scheduleData.forEach((item, i) => {
          if (data[i]) Object.assign(item, data[i])
        })
      }
    })
  }, [])

  const [nextSchedule, setNextSchedule] = useState(getNextSchedule())
  const [countdown, setCountdown] = useState('')
  const [barProgress, setBarProgress] = useState(0)
  const [avatarFlipped, setAvatarFlipped] = useState(false)
  const [notices, setNotices] = useState([])
  const [editingNotice, setEditingNotice] = useState(false)
  const team = myData?.team || user.team_name
  const busNumber = myData?.bus_number || user.bus_number
  const teamColor = getTeamColor(team)
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    const tick = () => {
      const ns = getNextSchedule()
      setNextSchedule(ns)
      if (ns) {
        const now = new Date()
        const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000

        // 次イベント開始時刻（ms）
        const [nh, nm] = ns.time.split(':').map(Number)
        const targetMs = nh * 3600000 + nm * 60000
        const diff = Math.max(0, targetMs - nowMs)

        // カウントダウン表示
        const totalSec = Math.floor(diff / 1000)
        const hh = Math.floor(totalSec / 3600)
        const mm = Math.floor((totalSec % 3600) / 60)
        const ss = totalSec % 60
        const countdown = hh > 0
          ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
          : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
        setCountdown(countdown)

        // 直前イベントの開始時刻を基点にバー計算
        const idx = scheduleData.findIndex(s => s.time === ns.time)
        let fromMs = nowMs - 30 * 60000 // デフォルト: 30分前
        if (idx > 0) {
          const [bh, bm] = scheduleData[idx - 1].time.split(':').map(Number)
          fromMs = bh * 3600000 + bm * 60000
        }
        const totalMs = targetMs - fromMs
        const elapsed = nowMs - fromMs
        const progress = totalMs > 0 ? Math.min(100, Math.max(0, (elapsed / totalMs) * 100)) : 0
        setBarProgress(progress)
      } else {
        setCountdown('')
        setBarProgress(100)
      }

    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch(NOTICES_API, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNotices(data))
      .catch(() => setNotices([
        { label: '日時', value: '2026年7月17日（金）' },
        { label: '会場', value: '東急ドレッセとどろきアリーナ' },
        { label: 'テーマ', value: 'One Team One SDC' },
      ]))
  }, [])

  const saveNotices = (items) => {
    fetch(NOTICES_API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    })
      .then(res => res.json())
      .then(() => {
        setNotices(items)
        setEditingNotice(false)
      })
  }

  return (
    <div className="home-page">
      <div className="home-bg-glow" style={{ background: `radial-gradient(ellipse at 50% -10%, ${teamColor.glow} 0%, transparent 65%)` }} />
      <div className="home-bg-grid" />

      <div className="home-hero">
        <div className="home-avatar-area" onClick={() => setAvatarFlipped(!avatarFlipped)}>
          <div className="home-avatar-outer-ring" style={{ borderColor: teamColor.border, boxShadow: `0 0 30px ${teamColor.glow}` }} />
          <div className="home-avatar-inner-ring" style={{ borderColor: teamColor.color }} />
          {/* ベース：プロフィール写真 */}
          <div className="home-avatar avatar-base" style={{ borderColor: teamColor.color, boxShadow: `0 0 40px ${teamColor.glow}` }}>
            {myData?.photo
              ? <img src={myData.photo} alt={user.display_name} />
              : <span>{user.display_name?.[0] ?? '?'}</span>
            }
          </div>
          {/* オーバーレイ：チームロゴ（中央から広がる） */}
          <div className={`home-avatar avatar-logo ${avatarFlipped ? 'expanded' : ''}`} style={{ borderColor: teamColor.color, boxShadow: `0 0 40px ${teamColor.glow}` }}>
            {teamColor.logo && <img src={teamColor.logo} alt="チームロゴ" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />}
          </div>
        </div>
        <div className="home-name">{user.display_name}</div>
        <div className="home-badges">
          {team && (
            <span className="home-badge team" style={{ background: teamColor.dim, borderColor: teamColor.border, color: teamColor.color }}>
              {team}
            </span>
          )}
          {busNumber && (
            <span className="home-badge bus" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Bus size={12} strokeWidth={1.8} />{busNumber}号車</span>
          )}
        </div>
      </div>

      <div className="home-quest">
        <div className="home-quest-header">
          <span className="home-quest-label-tag">NEXT EVENT</span>
        </div>
        {nextSchedule ? (
          <>
            <div className="home-quest-title">{nextSchedule.label}</div>
            <div className="home-quest-meta">
              <span className="home-quest-time" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={13} strokeWidth={1.8} />{nextSchedule.time}{nextSchedule.endTime ? ` - ${nextSchedule.endTime}` : ''}</span>
              {nextSchedule.place && <span className="home-quest-place" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} strokeWidth={1.8} />{nextSchedule.place}</span>}
            </div>
            <div className="home-quest-footer">
              <div className="home-quest-bar-wrap">
                <div className="home-quest-bar" style={{ background: teamColor.color, width: `${barProgress}%`, transition: 'width 1s linear' }} />
              </div>
              {countdown && <div className="home-quest-countdown-wrap">
                <span className="home-quest-countdown-label">イベントまで</span>
                <span className="home-quest-countdown" style={{ color: teamColor.color }}>残り {countdown}</span>
              </div>}
            </div>
          </>
        ) : (
          <div className="home-quest-title">🎊 本日のイベント終了！</div>
        )}
      </div>

      <div className="home-actions">
        <a href="/2026/login/top.php" className="home-action-btn" style={{ '--ac': teamColor.color, '--ag': teamColor.glow, '--ad': teamColor.dim, '--ab': teamColor.border }}>
          <div className="home-action-glow" />
          <span className="home-action-icon"><CheckSquare size={32} strokeWidth={1.5} color={teamColor.color} /></span>
          <span className="home-action-label">出席確認</span>
        </a>
        <a href="/2026/album/" className="home-action-btn dim">
          <div className="home-action-glow" />
          <span className="home-action-icon"><Camera size={32} strokeWidth={1.5} color="#bbb" /></span>
          <span className="home-action-label">アルバム</span>
        </a>
      </div>

      <div className="home-notice">
        <div className="home-notice-header">
          <span className="home-notice-dot" style={{ background: teamColor.color }} />
          <span className="home-notice-title">お知らせ</span>
          {isAdmin && (
            <button className="home-notice-edit" onClick={() => setEditingNotice(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Pencil size={12} strokeWidth={2} /> 編集</button>
          )}
        </div>
        <div className="home-notice-body">
          {notices.map((n, i) => (
            <>
              <span key={`l${i}`} className="home-notice-label">{n.label}</span>
              <span key={`v${i}`} className="home-notice-val">{n.value}</span>
            </>
          ))}
        </div>
      </div>

      {editingNotice && (
        <NoticeEditModal
          notices={notices}
          onSave={saveNotices}
          onClose={() => setEditingNotice(false)}
        />
      )}
    </div>
  )
}

function SchedulePage({ user }) {
  const isAdmin = user?.role === 'admin'
  const [schedule, setSchedule] = useState(scheduleData)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    fbOnValue(fbRef(fdb, 'schedule_overrides'), snap => {
      const data = snap.val()
      if (data) {
        setSchedule(scheduleData.map((item, i) => data[i] ? { ...item, ...data[i] } : item))
      }
    })
  }, [])

  const handleEdit = (i) => {
    setEditingIdx(i)
    setEditForm({ time: schedule[i].time || '', endTime: schedule[i].endTime || '', place: schedule[i].place || '' })
  }

  const handleSave = (i) => {
    const updated = [...schedule]
    updated[i] = { ...updated[i], ...editForm }
    setSchedule(updated)
    const overrides = {}
    updated.forEach((item, idx) => {
      overrides[idx] = { time: item.time || '', endTime: item.endTime || '', place: item.place || '' }
    })
    fbSet(fbRef(fdb, 'schedule_overrides'), overrides)
    setEditingIdx(null)
  }

  const getStatus = (time, endTime) => {
    const now = new Date()
    const [h, m] = time.split(':').map(Number)
    const itemDate = new Date(); itemDate.setHours(h, m, 0, 0)
    let endDate
    if (endTime) {
      const [eh, em] = endTime.split(':').map(Number)
      endDate = new Date(); endDate.setHours(eh, em, 0, 0)
    } else {
      endDate = new Date(itemDate.getTime() + 30 * 60000)
    }
    if (now >= itemDate && now < endDate) return 'current'
    if (now >= itemDate) return 'past'
    return 'future'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-accent" />
        <h2 className="page-title">タイムスケジュール</h2>
      </div>
      <div className="timeline">
        {schedule.map((item, i) => {
          const status = getStatus(item.time, item.endTime)
          return (
            <div key={i} className={'tl-item ' + status}>
              <div className="tl-time">{item.time}</div>
              <div className="tl-line">
                <div className="tl-dot" />
                {i < schedule.length - 1 && <div className="tl-bar" />}
              </div>
              <div className="tl-card">
                <div className="tl-card-main">
                  <span className="tl-icon">{(() => { const Icon = item.lucide; return Icon ? <Icon size={16} strokeWidth={1.8} /> : item.icon })()}</span>
                  <div className="tl-card-info">
                    <span className="tl-label">{item.label}</span>
                    {(item.endTime || item.place) && (
                      <div className="tl-meta">
                        {item.endTime && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={11} strokeWidth={1.8} />{item.time} - {item.endTime}</span>}
                        {item.place && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={11} strokeWidth={1.8} />{item.place}</span>}
                      </div>
                    )}
                  </div>
                  {status === 'current' && <span className="tl-now-badge">NOW</span>}
                </div>
                {isAdmin && editingIdx === i ? (
                  <div className="tl-edit-form">
                    <div className="tl-edit-row">
                      <label className="tl-edit-label">開始時刻</label>
                      <input className="tl-edit-input" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} placeholder="例: 10:00" />
                    </div>
                    <div className="tl-edit-row">
                      <label className="tl-edit-label">終了時刻</label>
                      <input className="tl-edit-input" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} placeholder="例: 10:30" />
                    </div>
                    <div className="tl-edit-row">
                      <label className="tl-edit-label">場所</label>
                      <input className="tl-edit-input" value={editForm.place} onChange={e => setEditForm({ ...editForm, place: e.target.value })} placeholder="例: メイングラウンド" />
                    </div>
                    <div className="tl-edit-actions">
                      <button className="tl-edit-save" onClick={() => handleSave(i)}>保存</button>
                      <button className="tl-edit-cancel" onClick={() => setEditingIdx(null)}>キャンセル</button>
                    </div>
                  </div>
                ) : isAdmin ? (
                  <button className="tl-edit-btn" onClick={() => handleEdit(i)}><Pencil size={13} strokeWidth={1.8} /></button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MapPage() {
  return (
    <div className="page page-full">
      <iframe src="/2026/map/" className="feature-iframe full" title="MAP" />
    </div>
  )
}

function ChatPage() {
  return (
    <div className="page page-full">
      <iframe src="/2026/chat/" className="feature-iframe full" title="チャット" />
    </div>
  )
}

function RulesPage({ user }) {
  const [openSection, setOpenSection] = useState(null)
  const [participants, setParticipants] = useState({})
  const [editingRule, setEditingRule] = useState(null)
  const [editText, setEditText] = useState('')
  const [checkedMap, setCheckedMap] = useState({})
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fbOnValue(fbRef(fdb, 'rule_participants'), snap => {
      setParticipants(snap.val() || {})
    })
  }, [])

  const saveParticipants = (ruleId) => {
    const names = editText.split('\n').map(s => s.trim()).filter(Boolean)
    fbSet(fbRef(fdb, `rule_participants/${ruleId}`), names.length > 0 ? names : null)
    setEditingRule(null)
  }

  const toggleCheck = (ruleId, name) => {
    const key = `${ruleId}_${name}`
    setCheckedMap(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const rules = [
    {
      id: 'general',
      title: '全体ルール',
      lucide: Award,
      content: [
        '4チーム対抗戦（緑・青・赤・水色）で総合得点を競います。',
        '競技ごとに順位に応じたポイントが加算されます。',
        '他チームへの妨害行為は禁止です。',
        'ケガ防止のため、無理のない範囲で参加してください。',
        '運営の指示に従って行動してください。',
      ]
    },
    {
      id: 'yoga',
      title: '耐久ヨガ（準備運動）',
      lucide: Zap,
      participation: '全員参加',
      content: [
        '開会式後の準備運動として全員で行います。',
        '最後まで正しいポーズをキープできた人が多いチームが勝利。',
        'ポーズが崩れたり倒れたりした場合は脱落となります。',
        '楽しく体をほぐしながら参加しましょう！',
      ]
    },
    {
      id: 'tamairi',
      title: '玉入れ',
      lucide: Target,
      participation: '全員参加',
      content: [
        '制限時間内にカゴに入った玉の数を競います。',
        '制限時間は2分間です。',
        'カゴの周りの線の内側には入れません。',
        '時間終了の合図と同時に手を止めてください。',
      ]
    },
    {
      id: 'tsunahiki',
      title: '綱引き',
      lucide: Link,
      participation: '全員参加',
      content: [
        '2チームずつ対戦するトーナメント形式です。',
        'センターラインを超えた時点で勝敗が決まります。',
        '制限時間は3分間、時間内に決着がつかない場合は引き分けです。',
        '転倒に注意して参加してください。',
      ]
    },
    {
      id: 'ohtama',
      title: '大玉送り',
      lucide: Circle,
      participation: '全員参加',
      content: [
        '大きなボールをチーム全員で頭上を使って送ります。',
        'ゴールラインに早くボールを運んだチームが勝利。',
        'ボールを落とした場合は落とした地点から再スタートです。',
        '全員で協力してボールを送りましょう。',
      ]
    },
    {
      id: 'paper',
      title: '紙飛行機×クイズ',
      lucide: Send,
      participation: '全員参加',
      content: [
        '紙飛行機を折って飛距離を競いながら、クイズに答えます。',
        'クイズの正解数と飛距離の合計で順位を決定します。',
        '紙飛行機は当日配布します。',
        'クイズはSDCや運動会に関する問題が出題されます。',
      ]
    },
    {
      id: 'ohtanawa',
      title: '大縄飛び',
      lucide: RotateCcw,
      participation: '一部参加（各チーム15人程度）',
      content: [
        '各チームから15人程度を選出して参加します。',
        '3分間で連続して跳んだ回数を競います。',
        '縄に引っかかった場合はその時点の回数でカウントし再スタート。',
        'チームで声を合わせて挑みましょう！',
      ]
    },
    {
      id: 'karибito',
      title: 'かりびと競争',
      lucide: Zap,
      participation: '一部参加（各チーム10人程度）',
      content: [
        '各チームから10人程度を選出して参加します。',
        'お題のカードを引いて、該当する人を連れてゴールを目指します。',
        'お題に該当する人が見つからない場合は別のカードを引けます。',
        '最初にゴールしたチームが勝利です。',
      ]
    },
    {
      id: 'chanbara',
      title: 'チャンバ乱',
      lucide: Shield,
      participation: '一部参加（各チーム5人）',
      content: [
        '各チームから5人を選出して参加します。',
        '専用の棒を使い、相手の風船を割ったら勝ちです。',
        '自分の風船を守りながら相手の風船を狙いましょう。',
        '安全のため過度に激しい動きは禁止です。',
      ]
    },
    {
      id: 'relay',
      title: '障害物リレー',
      lucide: Trophy,
      participation: '一部参加（各チーム4人）',
      content: [
        '各チームから4人を選出して参加します。',
        '様々な障害物をクリアしながらバトンをつなぎます。',
        '障害物の内容は当日発表します。',
        '最後の走者がゴールした時点でタイムを計測します。',
      ]
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-accent" />
        <h2 className="page-title">競技ルール</h2>
      </div>
      <div className="rules-list">
        {rules.map(rule => (
          <div key={rule.id} className="rule-card">
            <button
              className={`rule-header ${openSection === rule.id ? 'open' : ''}`}
              onClick={() => setOpenSection(openSection === rule.id ? null : rule.id)}
            >
              <div className="rule-header-left">
                <span className="rule-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{rule.lucide && (() => { const Icon = rule.lucide; return <Icon size={15} strokeWidth={1.8} /> })()}{rule.title}</span>
                {rule.participation && (
                  <span className="rule-badge">{rule.participation}</span>
                )}
              </div>
              <span className="rule-arrow">{openSection === rule.id ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}</span>
            </button>
            {openSection === rule.id && (
              <div className="rule-body">
                {rule.content.map((line, i) => (
                  <div key={i} className="rule-line">
                    <span className="rule-dot">•</span>
                    <span>{line}</span>
                  </div>
                ))}
                {/* 参加者セクション */}
                {rule.id !== 'general' && (
                  <div className="rule-participants">
                    <div className="rule-participants-header">
                      <span className="rule-participants-title">👥 参加者</span>
                      {isAdmin && (
                        <button className="btn-edit-participants" onClick={() => {
                          setEditingRule(rule.id)
                          const current = participants[rule.id] || []
                          setEditText(current.join('\n'))
                        }}>編集</button>
                      )}
                    </div>
                    {editingRule === rule.id ? (
                      <div className="participants-edit">
                        <textarea
                          className="participants-textarea"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          placeholder="1行に1人の名前を入力"
                          rows={6}
                        />
                        <div className="participants-edit-actions">
                          <button className="btn-save-participants" onClick={() => saveParticipants(rule.id)}>保存</button>
                          <button className="btn-cancel-participants" onClick={() => setEditingRule(null)}>キャンセル</button>
                        </div>
                      </div>
                    ) : participants[rule.id] && participants[rule.id].length > 0 ? (
                      <div className="participants-list">
                        {participants[rule.id].map(name => (
                          <div key={name}
                            className={`participant-item ${isAdmin ? 'checkable' : ''} ${checkedMap[`${rule.id}_${name}`] ? 'checked' : ''}`}
                            onClick={() => isAdmin && toggleCheck(rule.id, name)}
                          >
                            <span className="participant-name">{name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="participants-empty">
                        {isAdmin ? '参加者を登録してください' : '未登録'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ========= 管理者ページ =========
function AdminPage({ user }) {
  const [gameEnabled, setGameEnabled] = useState(false)

  useEffect(() => {
    fbOnValue(fbRef(fdb, 'game_enabled'), snap => {
      setGameEnabled(snap.val() === true)
    })
  }, [])

  const toggleGame = () => {
    const next = !gameEnabled
    fbSet(fbRef(fdb, 'game_enabled'), next)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-accent" />
        <h2 className="page-title">管理者画面</h2>
      </div>
      <div className="admin-section">
        <div className="admin-section-title">🎮 ミニゲーム設定</div>
        <div className="admin-card">
          <div className="admin-row">
            <div>
              <div className="admin-label">ミニゲーム開放</div>
              <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.2rem' }}>
                {gameEnabled ? '現在プレイ可能な状態です' : '現在ロック中です'}
              </div>
            </div>
            <button className={`admin-toggle ${gameEnabled ? 'on' : 'off'}`} onClick={toggleGame}>
              {gameEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function StaffPage({ user, onTabChange }) {
  const TEAMS_URL = 'https://teams.microsoft.com/l/chat/0/0?users='
  const [memberMap, setMemberMap] = useState({})
  const isAdmin = user?.role === 'admin'
  const [thanks, setThanks] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')

  useEffect(() => {
    fbOnValue(fbRef(fdb, 'super_thanks'), snap => {
      const data = snap.val() || {}
      setThanks(Object.entries(data).map(([id, v]) => ({ id, ...v })))
    })
  }, [])

  const handleThanksAdd = () => {
    if (!newName.trim() || !newContent.trim()) return alert('名前と内容を入力してください')
    fbSet(fbRef(fdb, `super_thanks/thanks_${Date.now()}`), { name: newName.trim(), content: newContent.trim() })
    setNewName(''); setNewContent(''); setShowAddForm(false)
  }
  const handleThanksEdit = (t) => { setEditingId(t.id); setEditName(t.name); setEditContent(t.content) }
  const handleThanksSave = () => {
    if (!editName.trim() || !editContent.trim()) return
    fbSet(fbRef(fdb, `super_thanks/${editingId}`), { name: editName.trim(), content: editContent.trim() })
    setEditingId(null)
  }
  const handleThanksDelete = (id) => {
    if (!window.confirm('削除しますか？')) return
    fbSet(fbRef(fdb, `super_thanks/${id}`), null)
  }

  useEffect(() => {
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => {
        // 名前をキーにしたマップを作成
        const map = {}
        data.forEach(m => { map[m.name] = m })
        setMemberMap(map)
      })
  }, [])

  const sections = [
    {
      title: '統括',
      members: [
        { key: '佐藤 英信', email: 'hisato@bltinc.co.jp', phone: '080-6516-3100', note: '緊急連絡先' },
      ]
    },
    {
      title: '運営',
      members: [
        { key: '小山 萌果', email: 'mkoyama@bltinc.co.jp' },
        { key: '纐纈 明穂', email: 'akoketsu@bltinc.co.jp' },
        { key: '原田 奈々', email: 'nharada@bltinc.co.jp' },
        { key: '末永 あい', email: 'asuenaga@bltinc.co.jp' },
      ]
    },
    {
      title: 'しおり',
      members: [
        { key: '谷 風汰', email: 'ftani@bulletgroup.jp' },
        { key: '谷口 柊翔', email: 'staniguchi@bltinc.co.jp' },
      ]
    },
  ]

  // メンバーリストから名前を部分一致で検索
  const findMember = (key) => {
    // 完全一致を優先
    if (memberMap[key]) return memberMap[key]
    // 部分一致
    return Object.values(memberMap).find(m => m.name.includes(key)) || null
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-accent" />
        <h2 className="page-title">運営メンバー</h2>
        {isAdmin && (
          <button className="staff-admin-btn" onClick={() => onTabChange('admin')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Settings size={13} strokeWidth={2} /> 管理者</button>
        )}
      </div>

      {sections.map((section, si) => (
        <div key={si} className="staff-section">
          <div className="staff-section-title">{section.title}</div>
          {section.members.map((m, mi) => {
            const member = findMember(m.key)
            const displayName = member?.name || m.key
            const photo = member?.photo || null
            const memberTeamName = member?.team || member?.team_name
            const tc = getTeamColor(memberTeamName)
            return (
              <div key={mi} className="staff-card">
                <div className="staff-avatar" style={{ background: tc.dim, borderColor: tc.border, color: tc.color }}>
                  {photo
                    ? <img src={photo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : displayName[0]
                  }
                </div>
                <div className="staff-info">
                  <div className="staff-name">{displayName}</div>
                  {m.note && <div className="staff-note">{m.note}</div>}
                </div>
                <div className="staff-actions">
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="staff-btn phone"><Phone size={16} strokeWidth={1.8} color="#fff" /></a>
                  )}
                  <a
                    href={`${TEAMS_URL}${m.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="staff-btn teams"
                  >
                    <MessageSquare size={16} strokeWidth={1.8} color="#fff" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* Super Thanks */}
      <div className="staff-section" style={{ marginTop: '1rem' }}>
        <div className="staff-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Star size={13} strokeWidth={1.8} color="#E8C040" fill="#E8C040" /> Super Thanks</span>
          {isAdmin && (
            <button className="admin-btn small" onClick={() => setShowAddForm(!showAddForm)}>＋ 追加</button>
          )}
        </div>
        {showAddForm && isAdmin && (
          <div className="thanks-edit-form" style={{ marginBottom: '0.75rem' }}>
            <input className="thanks-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="名前" />
            <input className="thanks-input" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="協力内容" />
            <div className="thanks-edit-actions">
              <button className="admin-btn" onClick={handleThanksAdd}>追加</button>
              <button className="admin-btn secondary" onClick={() => setShowAddForm(false)}>キャンセル</button>
            </div>
          </div>
        )}
        {thanks.length === 0 && <div className="thanks-empty">準備中です</div>}
        {thanks.map(t => (
          <div key={t.id} className="thanks-card">
            <div className="thanks-star"><Star size={14} strokeWidth={1.8} color="#E8C040" fill="#E8C040" /></div>
            {editingId === t.id && isAdmin ? (
              <div className="thanks-edit-form" style={{ flex: 1 }}>
                <input className="thanks-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="名前" />
                <input className="thanks-input" value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="協力内容" />
                <div className="thanks-edit-actions">
                  <button className="admin-btn" onClick={handleThanksSave}>保存</button>
                  <button className="admin-btn secondary" onClick={() => setEditingId(null)}>キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <div className="thanks-info" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="thanks-name">{t.name}</div>
                  <div className="thanks-content">{t.content}</div>
                </div>
                {isAdmin && (
                  <div className="thanks-admin-btns">
                    <button className="admin-btn small" onClick={() => handleThanksEdit(t)}>編集</button>
                    <button className="admin-btn small danger" onClick={() => handleThanksDelete(t.id)}>削除</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OtherPage({ onTabChange, gameEnabled, user }) {
  const items = [
    { lucide: Users, label: 'メンバーリスト', url: '/2026/members/', color: '#7B6EE8' },
    { lucide: Vote, label: '投票', url: '/2026/vote/', color: '#E8A040' },
    { lucide: ClipboardCheck, label: '持ち物チェック', url: '/2026/checklist/', color: '#40C84A' },
    { lucide: HelpCircle, label: 'Q&A', url: '/2026/qna/', color: '#40C8E8' },
    { lucide: Images, label: 'アルバム', url: '/2026/album/', color: '#E84080' },
    { lucide: BookOpen, label: '競技ルール', url: null, color: '#40A0E8', isInternal: true, tab: 'rules' },
    { lucide: UserCog, label: '運営メンバー', url: null, color: '#A040E8', isInternal: true, tab: 'staff' },
    { lucide: Gamepad2, label: 'ミニゲーム', url: '/2026/game/', color: '#E8E040', locked: !gameEnabled },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-accent" />
        <h2 className="page-title">その他</h2>
      </div>
      <div className="other-grid">
        {items.map((item, i) => (
          item.isInternal ? (
            <button key={i} className="other-btn" onClick={() => onTabChange(item.tab)} style={{ '--oc': item.color, '--og': item.color + '33', '--ob': item.color + '55', cursor: 'pointer' }}>
              <div className="other-btn-bg" />
              <span className="other-btn-icon">{item.lucide ? <item.lucide size={28} strokeWidth={1.5} color={item.color} /> : item.icon}</span>
              <span className="other-btn-label">{item.label}</span>
            </button>
          ) : item.locked ? (
            <div key={i} className="other-btn other-btn--locked"
              style={{ '--oc': '#555', '--og': '#55555533', '--ob': '#55555555', cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={() => {
                if (user?.role === 'admin') {
                  onTabChange('admin')
                } else {
                  alert('まだ開放されていません！管理者にお問い合わせください。')
                }
              }}
            >
              <span className="other-btn-icon" style={{ filter: 'grayscale(1) opacity(0.4)' }}>{item.lucide ? <item.lucide size={28} strokeWidth={1.5} color="#555" /> : item.icon}</span>
              <span className="other-btn-label" style={{ color: '#555' }}>{item.label}</span>
              <span className="other-btn-lock">🔒</span>
            </div>
          ) : (
            <a key={i} href={item.url} className="other-btn" style={{ '--oc': item.color, '--og': item.color + '33', '--ob': item.color + '55' }}>
              <div className="other-btn-bg" />
              <span className="other-btn-icon">{item.lucide ? <item.lucide size={28} strokeWidth={1.5} color={item.color} /> : item.icon}</span>
              <span className="other-btn-label">{item.label}</span>
            </a>
          )
        ))}
      </div>

      {/* ログアウトボタン */}
      <a
        href="/2026/login/logout.php"
        className="logout-btn"
      >
        <span><LogOut size={18} strokeWidth={1.8} /></span>
        <span>ログアウト</span>
      </a>
    </div>
  )
}

const tabs = [
  { id: 'schedule', icon: null, lucide: CalendarClock, label: 'スケジュール' },
  { id: 'chat', icon: null, lucide: MessageCircle, label: 'チャット' },
  { id: 'home', icon: '🏠', label: 'ホーム' },
  { id: 'map', icon: null, lucide: MapPin, label: 'MAP' },
  { id: 'other', icon: null, lucide: LayoutGrid, label: 'その他' },
]

function App() {
  const [user, setUser] = useState(null)
  const [myData, setMyData] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [gameEnabled, setGameEnabled] = useState(false)

  useEffect(() => {
    fbOnValue(fbRef(fdb, 'game_enabled'), snap => {
      setGameEnabled(snap.val() === true)
    })
  }, [])




  useEffect(() => {
    const CACHE_KEY = 'me_cache'
    const CACHE_TTL = 30 * 60 * 1000 // 30分

    // キャッシュ確認
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          setUser(data)
          return
        }
      }
    } catch (e) { }

    fetch(ME_API, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem(CACHE_KEY)
          const redirect = encodeURIComponent(window.location.href)
          window.location.href = `/2026/login/?redirect=${redirect}`
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          // キャッシュ保存
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
          } catch (e) { }
          setUser(data)
        }
      })
  }, [])

  useEffect(() => {
    if (!user) return
    fetch(MEMBERS_API)
      .then(res => res.json())
      .then(data => {
        const found = data.find(m => m.name === user.display_name)
        if (found) setMyData(found)
      })
  }, [user])

  if (!user) return (
    <div className="loading">
      <div className="loading-ring" />
      <span>読み込み中...</span>
    </div>
  )

  const teamColor = getTeamColor(myData?.team || user.team_name)

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <HomePage user={user} myData={myData} />
      case 'schedule': return <SchedulePage user={user} />
      case 'chat': return <ChatPage />
      case 'map': return <MapPage />
      case 'other': return <OtherPage onTabChange={setActiveTab} gameEnabled={gameEnabled} user={user} />
      case 'staff': return <StaffPage user={user} onTabChange={setActiveTab} />
      case 'admin': return <AdminPage user={user} />
      case 'rules': return <RulesPage user={user} />
      default: return <HomePage user={user} myData={myData} />
    }
  }

  return (
    <div className="app">
      <div className="content">{renderPage()}</div>
      <nav className="tab-bar">
        <div className="tab-bar-blur" />
        {tabs.map(tab => {
          const isHome = tab.id === 'home'
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`tab-btn${isHome ? ' tab-btn--home' : ''}${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={isActive ? { '--tc': teamColor.color, '--tg': teamColor.glow } : {}}
            >
              {isHome ? (
                <div className="tab-home-wrap logo-wrap" style={isActive ? { boxShadow: `0 0 20px ${teamColor.glow}` } : {}}>
                  {/* グレースケール版（ベース） */}
                  <img src="/2026/logo-home.png" alt="ホーム" className="logo-gray" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
                  {/* カラー版（ホームアクティブ時に表示） */}
                  <img src="/2026/logo-home.png" alt="" className={`logo-color ${isActive ? 'animating' : ''}`} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
                </div>
              ) : (
                <>
                  <span className="tab-icon">
                    {tab.lucide
                      ? <tab.lucide size={22} strokeWidth={1.8} color={isActive ? teamColor.color : 'rgba(255,255,255,0.4)'} />
                      : tab.icon
                    }
                  </span>
                  <span className="tab-label">{tab.label}</span>
                  {isActive && <div className="tab-active-dot" style={{ background: teamColor.color }} />}
                </>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App