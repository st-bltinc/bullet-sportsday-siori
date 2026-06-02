/**
 * frontend/src/components/Login.jsx
 * ─────────────────────────────────────────────────────────────
 * ログイン画面コンポーネント。
 * 「Teamsでログイン」ボタンを押すと PHP の /login/ へ遷移し、
 * MicrosoftのOAuth認証フローが始まります。
 * ─────────────────────────────────────────────────────────────
 */

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    textAlign: 'center',
  },
  logo: {
    fontSize: '56px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.7',
    marginBottom: '36px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#464EB8',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    width: '100%',
    cursor: 'pointer',
    transition: 'background 0.2s',
    textDecoration: 'none',
  },
  footer: {
    marginTop: '28px',
    fontSize: '12px',
    color: '#aaa',
  },
}

/** TeamsアイコンSVGコンポーネント */
function TeamsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 2228.833 2073.333" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M1554.637,777.5h575.713c54.391,0,98.483,44.092,98.483,98.483v524.398
        c0,199.901-162.001,361.902-361.902,361.902h-1.711c-199.901,0.028-361.93-162.001-361.93-361.902V828.971
        C1505.29,800.544,1527.365,777.5,1554.637,777.5z"/>
      <circle fill="white" cx="1943.75" cy="440.583" r="233.25"/>
      <path fill="white" d="M1418.023,440.583c0,128.737-104.363,233.1-233.1,233.1s-233.1-104.363-233.1-233.1
        s104.363-233.1,233.1-233.1S1418.023,311.846,1418.023,440.583z"/>
      <path fill="white" d="M1881.448,777.5H887.102c-53.186,0-96.268,43.082-96.268,96.268v600.411
        c0,329.509,267.063,596.572,596.572,596.572s596.572-267.063,596.572-596.572V877.384
        C1983.979,824.961,1937.871,777.5,1881.448,777.5z"/>
    </svg>
  )
}

/**
 * ログイン画面
 *
 * Props:
 *   なし (PHP側にリダイレクトするだけなのでReact stateは不要)
 */
export default function Login() {
  const handleLogin = () => {
    // PHP側のログインページへ遷移 → Microsoft OAuth が始まる
    window.location.href = '/login/'
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>✈️</div>
        <h1 style={styles.title}>社員旅行出席管理</h1>
        <p style={styles.subtitle}>
          社員旅行の出席確認システムです。<br />
          Microsoft Teams アカウントでログインしてください。
        </p>

        <button style={styles.button} onClick={handleLogin}>
          <TeamsIcon />
          Microsoft Teams でログイン
        </button>

        <p style={styles.footer}>ご不明な点は総務部までお問い合わせください</p>
      </div>
    </div>
  )
}
