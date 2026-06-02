/**
 * frontend/src/api/client.js
 * ─────────────────────────────────────────────────────────────
 * PHPバックエンドとのHTTP通信をまとめたAPIクライアント。
 *
 * credentials: 'include' でセッションCookie を自動送信します。
 * Viteのプロキシ設定により /attendance → localhost:8000 に転送されます。
 * ─────────────────────────────────────────────────────────────
 */

/** 共通フェッチ関数: エラー処理を一元化 */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include', // セッションCookieを送る (PHP sessionと連携するために必須)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  // 401: 未ログイン → ログインページへ
  if (response.status === 401) {
    window.location.href = '/login/'
    return null
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error ?? `HTTPエラー: ${response.status}`)
  }

  return response.json()
}

/**
 * 出席を記録する
 * POST /attendance/post_attendance.php
 *
 * @returns {{ success: boolean, message: string, already_checked: boolean }}
 */
export async function postAttendance() {
  return apiFetch('/attendance/post_attendance.php', { method: 'POST' })
}

/**
 * 出席統計を取得する
 * GET /attendance/get_stats.php
 *
 * @returns {{
 *   event_date: string,
 *   total: { attended: number, all: number, rate: number },
 *   by_team: Array<{ team_name: string, attended: number, total: number, rate: number }>,
 *   by_bus:  Array<{ bus_number: number, attended: number, total: number, rate: number }>,
 *   my_status: { attended: boolean, checked_in_at: string|null }
 * }}
 */
export async function getStats() {
  return apiFetch('/attendance/get_stats.php')
}
