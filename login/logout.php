<?php
/**
 * login/logout.php
 * ─────────────────────────────────────────────────────────────
 * ログアウト処理。
 * セッションを完全に削除し、ログインページへリダイレクトします。
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../common/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// セッションデータを全て削除
$_SESSION = [];

// セッションクッキーも削除
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// セッション自体を破棄
session_destroy();

// Microsoft側のセッションも切るにはこちらへリダイレクト:
// $logout_url = 'https://login.microsoftonline.com/' . AZURE_TENANT_ID . '/oauth2/v2.0/logout'
//             . '?post_logout_redirect_uri=' . urlencode('http://localhost:8000/login/');
// header('Location: ' . $logout_url);

// アプリのログインページに戻る
header('Location: ' . APP_BASE . '/login/');
exit;
