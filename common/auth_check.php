<?php
/**
 * common/auth_check.php
 * ─────────────────────────────────────────────────────────────
 * 認証ガード: このファイルを require_once するだけで、
 * 未ログインのユーザーをログインページへ強制リダイレクトします。
 *
 * 使い方 (保護したいPHPファイルの先頭に1行追加するだけ):
 *   require_once __DIR__ . '/../common/auth_check.php';
 * ─────────────────────────────────────────────────────────────
 */

// セッションが開始されていなければ開始する
if (session_status() === PHP_SESSION_NONE) {
    // セッションのセキュリティ設定
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        'secure'   => isset($_SERVER['HTTPS']), // HTTPS環境では true
        'httponly' => true,   // JavaScriptからCookieを読めなくする
        'samesite' => 'Lax',  // CSRF対策
    ]);
    session_start();
}

// セッションにユーザー情報がなければログインページへ飛ばす
if (empty($_SESSION['user'])) {
    header('Location: ' . APP_BASE . '/login/');
    exit;
}

/**
 * 現在ログイン中のユーザー情報を返す便利関数
 *
 * 返り値の例:
 * [
 *   'id'           => 1,
 *   'azure_oid'    => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
 *   'email'        => 'taro.yamada@example.com',
 *   'display_name' => '山田 太郎',
 *   'team_name'    => '営業部',
 *   'bus_number'   => 2,
 *   'role'         => 'user',
 * ]
 */
function current_user(): array
{
    return $_SESSION['user'];
}

/**
 * 現在のユーザーが管理者かどうかを返す
 */
function is_admin(): bool
{
    return ($_SESSION['user']['role'] ?? 'user') === 'admin';
}
