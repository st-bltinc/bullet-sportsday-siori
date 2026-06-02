<?php
/**
 * attendance/post_attendance.php
 * ─────────────────────────────────────────────────────────────
 * 【API】出席を記録するエンドポイント
 *
 * メソッド: POST
 * 認証:    必要 (セッション)
 *
 * レスポンス例 (成功):
 *   { "success": true, "message": "出席を記録しました", "already_checked": false }
 *
 * レスポンス例 (重複):
 *   { "success": true, "message": "すでに出席済みです", "already_checked": true }
 * ─────────────────────────────────────────────────────────────
 */

// 認証チェック: 未ログインなら /login/ へリダイレクト
require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php';
require_once __DIR__ . '/../common/db.php';
require_once __DIR__ . '/../common/functions.php';

// POSTメソッド以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'POSTメソッドのみ受け付けます'], 405);
}

$user = current_user();
$db   = get_db();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 出席を記録 (同じ日に2回押しても1件のみ登録)
// INSERT IGNORE: 同じ (user_id, event_date) の組み合わせが
// すでに存在する場合は何もしない (エラーにもならない)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSERT OR IGNORE: 同じ (user_id, event_date) が既にあれば何もしない (SQLite構文)
$sql = '
    INSERT OR IGNORE INTO attendance_logs (user_id, event_date)
    VALUES (:user_id, :event_date)
';
$stmt = $db->prepare($sql);
$stmt->execute([
    ':user_id'    => $user['id'],
    ':event_date' => EVENT_DATE,
]);

// affectedRows が 0 = すでに記録済み
$already_checked = ($stmt->rowCount() === 0);

json_response([
    'success'         => true,
    'message'         => $already_checked ? 'すでに出席済みです' : '出席を記録しました',
    'already_checked' => $already_checked,
    'user'            => [
        'display_name' => $user['display_name'],
        'team_name'    => $user['team_name'],
        'bus_number'   => $user['bus_number'],
    ],
]);
