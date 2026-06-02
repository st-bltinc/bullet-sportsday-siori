<?php
/**
 * login/me.php
 * ─────────────────────────────────────────────────────────────
 * 【API】現在ログイン中のユーザー情報を返すエンドポイント
 *
 * メソッド: GET
 * 認証:    必要 (セッション)
 *
 * レスポンス例 (200 ログイン済み):
 * {
 *   "id": 1,
 *   "display_name": "山田 太郎",
 *   "email": "yamada@example.com",
 *   "team_name": "営業部",
 *   "bus_number": 2,
 *   "role": "user"
 * }
 *
 * レスポンス例 (401 未ログイン):
 * { "error": "ログインしていません" }
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/functions.php';

// セッション開始 (auth_check.phpは使わず、401を返す形にする)
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// 未ログインは 401 を返す (リダイレクトしない)
if (empty($_SESSION['user'])) {
    json_response(['error' => 'ログインしていません'], 401);
}

$user = $_SESSION['user'];

json_response([
    'id'           => $user['id'],
    'display_name' => $user['display_name'],
    'email'        => $user['email'],
    'team_name'    => $user['team_name'],
    'bus_number'   => $user['bus_number'],
    'role'         => $user['role'],
]);
