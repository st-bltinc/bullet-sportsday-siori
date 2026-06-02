/**
 * frontend/src/components/AttendanceCheck.jsx
 * ─────────────────────────────────────────────────────────────
 * 出席確認画面コンポーネント。
 * ・出席チェックインボタン
 * ・チーム別・バス別の出席統計
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { postAttendance, getStats } from '../api/client'

// ─── スタイル定義 ────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', background: '#f5f7fa' },

  header: {
    background: '#0078d4', color: '#fff',
    padding: '14px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { margin: 0, fontSize: '18px', fontWeight: '700' },
  logoutBtn: {
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px', padding: '6px 14px',
    fontSize: '13px', cursor: 'pointer',
  },

  main: { maxWidth: '900px', margin: '0 auto', padding: '24px 16px' },

  checkinCard: {
    background: '#fff', borderRadius: '12px',
    padding: '32px', marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  greeting: { fontSize: '20px', fontWeight: '700', marginBottom: '6px' },
  teamInfo: { color: '#666', fontSize: '14px', marginBottom: '24px' },

  checkinBtn: {
    background: '#0078d4', color: '#fff',
    border: 'none', borderRadius: '8px',
    padding: '16px 40px', fontSize: '18px', fontWeight: '700',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  checkinBtnDone: {
    background: '#28a745', color: '#fff',
    border: 'none', borderRadius: '8px',
    padding: '16px 40px', fontSize: '18px', fontWeight: '700',
    cursor: 'default',
  },
  checkinBtnLoading: {
    background: '#999', color: '#fff',
    border: 'none', borderRadius: '8px',
    padding: '16px 40px', fontSize: '18px', fontWeight: '700',
    cursor: 'not-allowed',
  },
  message: { marginTop: '16px', fontSize: '15px', color: '#555' },
  messageOk: { marginTop: '16px', fontSize: '15px', color: '#28a745', fontWeight: '600' },
  messageErr: { marginTop: '16px', fontSize: '15px', color: '#dc3545' },

  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  statsCard: {
    background: '#fff', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  statsTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#333' },

  totalRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginBottom: '8px',
  },
  bigNum: { fontSize: '48px', fontWeight: '700', color: '#0078d4', lineHeight: 1 },
  bigDenom: { fontSize: '18px', color: '#999', alignSelf: 'flex-end', paddingBottom: '6px' },
  rateText: { fontSize: '14px', color: '#666', marginTop: '4px' },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    background: '#f0f0f0', padding: '8px 12px',
    textAlign: 'left', fontWeight: '600', color: '#555',
    borderBottom: '2px solid #ddd',
  },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0' },

  progressBar: { height: '6px', background: '#e9ecef', borderRadius: '3px', marginTop: '4px' },
  progressFill: (rate) => ({
    height: '100%', borderRadius: '3px',
    background: rate >= 80 ? '#28a745' : rate >= 50 ? '#ffc107' : '#dc3545',
    width: `${rate}%`, transition: 'width 0.5s ease',
  }),
}
// ─────────────────────────────────────────────────────────────

/** 出席確認メイン画面 */
export default function AttendanceCheck({ user }) {
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [posting, setPosting]       = useState(false)
  const [message, setMessage]       = useState(null)  // { text, type: 'ok'|'err' }
  const [attended, setAttended]     = useState(false)

  // 統計データを取得
  const loadStats = useCallback(async () => {
    try {
      const data = await getStats()
      if (data) {
        setStats(data)
        setAttended(data.my_status.attended)
      }
    } catch (err) {
      setMessage({ text: 'データの取得に失敗しました: ' + err.message, type: 'err' })
    } finally {
      setLoading(false)
    }
  }, [])

  // 画面表示時に統計を取得
  useEffect(() => { loadStats() }, [loadStats])

  // 出席ボタンを押したときの処理
  const handleCheckin = async () => {
    if (posting || attended) return
    setPosting(true)
    setMessage(null)

    try {
      const result = await postAttendance()
      if (result?.success) {
        setAttended(true)
        setMessage({
          text: result.already_checked ? '✅ すでに出席済みです' : '✅ 出席を記録しました！',
          type: 'ok',
        })
        // ボタンを押した後、統計を更新
        await loadStats()
      }
    } catch (err) {
      setMessage({ text: '❌ エラーが発生しました: ' + err.message, type: 'err' })
    } finally {
      setPosting(false)
    }
  }

  // チェックインボタンのスタイルを状態に応じて切り替え
  const btnStyle = posting ? s.checkinBtnLoading : attended ? s.checkinBtnDone : s.checkinBtn
  const btnText  = posting ? '記録中...' : attended ? '✅ 出席済み' : '出席を確認する'

  return (
    <div style={s.page}>
      {/* ヘッダー */}
      <header style={s.header}>
        <h1 style={s.headerTitle}>✈️ 社員旅行出席管理</h1>
        <button style={s.logoutBtn} onClick={() => { window.location.href = '/login/logout.php' }}>
          ログアウト
        </button>
      </header>

      <main style={s.main}>
        {/* チェックインカード */}
        <div style={s.checkinCard}>
          <p style={s.greeting}>こんにちは、{user?.display_name ?? '—'} さん</p>
          <p style={s.teamInfo}>
            {user?.team_name ?? '—'} ／ {user?.bus_number ? `${user.bus_number}号車` : 'バス未設定'}
          </p>

          <button style={btnStyle} onClick={handleCheckin} disabled={posting || attended}>
            {btnText}
          </button>

          {message && (
            <p style={message.type === 'ok' ? s.messageOk : s.messageErr}>
              {message.text}
            </p>
          )}
        </div>

        {/* 統計エリア */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999' }}>読み込み中...</p>
        ) : stats ? (
          <div style={s.statsGrid}>
            {/* 全体集計 */}
            <div style={s.statsCard}>
              <h2 style={s.statsTitle}>📊 全体出席状況</h2>
              <div style={s.totalRow}>
                <span style={s.bigNum}>{stats.total.attended}</span>
                <span style={s.bigDenom}>/ {stats.total.all} 名</span>
              </div>
              <p style={s.rateText}>出席率 {stats.total.rate}%</p>
              <div style={s.progressBar}>
                <div style={s.progressFill(stats.total.rate)} />
              </div>
            </div>

            {/* バス別 */}
            <div style={s.statsCard}>
              <h2 style={s.statsTitle}>🚌 バス別出席状況</h2>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>バス</th>
                      <th style={s.th}>出席</th>
                      <th style={s.th}>出席率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_bus.map((b) => (
                      <tr key={b.bus_number}>
                        <td style={s.td}>{b.bus_number}号車</td>
                        <td style={s.td}>{b.attended} / {b.total}</td>
                        <td style={s.td}>
                          {b.rate}%
                          <div style={s.progressBar}>
                            <div style={s.progressFill(b.rate)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* チーム別 */}
            <div style={{ ...s.statsCard, gridColumn: '1 / -1' }}>
              <h2 style={s.statsTitle}>👥 チーム別出席状況</h2>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>チーム名</th>
                      <th style={s.th}>出席数</th>
                      <th style={s.th}>合計</th>
                      <th style={s.th}>出席率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_team.map((t) => (
                      <tr key={t.team_name}>
                        <td style={s.td}>{t.team_name}</td>
                        <td style={s.td}>{t.attended}</td>
                        <td style={s.td}>{t.total}</td>
                        <td style={s.td}>
                          {t.rate}%
                          <div style={s.progressBar}>
                            <div style={s.progressFill(t.rate)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
