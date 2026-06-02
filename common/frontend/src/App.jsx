/**
 * frontend/src/App.jsx
 * ─────────────────────────────────────────────────────────────
 * アプリのルートコンポーネント。
 * セッションの状態に応じて「ログイン画面」か「出席確認画面」を表示します。
 *
 * 認証フロー:
 *   1. getStats() を呼んで現在のセッション状態を確認
 *   2. 401 が返ったら → ログインページへリダイレクト (api/client.js が処理)
 *   3. 200 が返ったら → 出席確認画面を表示
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react'
import Login from './components/Login'
import AttendanceCheck from './components/AttendanceCheck'
import { getStats } from './api/client'

export default function App() {
  // 'loading' | 'unauthenticated' | 'authenticated'
  const [authState, setAuthState] = useState('loading')
  const [user, setUser]           = useState(null)

  useEffect(() => {
    // 画面表示時にAPIを叩いてセッション状態を確認
    ;(async () => {
      try {
        const data = await getStats()
        if (data) {
          // セッション有効: ユーザー情報はセッションにあるが
          // getStats は my_status しか返さないため、
          // URLパラメータやページ変数からユーザー名を取得する想定
          // ここでは暫定でセッションユーザーを別エンドポイントから取るか、
          // index.phpからhtmlに埋め込む方法を取ります。
          // 簡易実装として my_status と一緒に user を返すように
          // get_stats.php を拡張しても良いです。
          setUser(data.current_user ?? null)
          setAuthState('authenticated')
        } else {
          setAuthState('unauthenticated')
        }
      } catch {
        // api/client.js で401は自動リダイレクト済み
        // それ以外のエラーはとりあえずloginへ
        setAuthState('unauthenticated')
      }
    })()
  }, [])

  // ロード中はスピナー表示
  if (authState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f5f7fa',
      }}>
        <p style={{ color: '#999', fontSize: '16px' }}>読み込み中...</p>
      </div>
    )
  }

  // 未認証 → ログイン画面
  if (authState === 'unauthenticated') {
    return <Login />
  }

  // 認証済み → 出席確認画面
  return <AttendanceCheck user={user} />
}
