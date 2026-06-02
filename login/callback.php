<?php
/**
 * login/callback.php
 * ─────────────────────────────────────────────────────────────
 * Microsoft認証後のコールバック処理。
 * Microsoftから認証コードを受け取り、アクセストークンと交換します。
 * その後、ユーザー情報をDBに保存(初回のみ)してセッションに記録し、
 * トップページへリダイレクトします。
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/functions.php';
require_once __DIR__ . '/../common/db.php';

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① エラーチェック: Microsoftから認証失敗が返ってきた場合
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (isset($_GET['error'])) {
    $error_msg = htmlspecialchars($_GET['error_description'] ?? $_GET['error']);
    error_log('[Auth Error] ' . $error_msg);
    header('Location: ' . APP_BASE . '/login/?error=auth_failed');
    exit;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ② CSRF対策: state の一致を確認
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$received_state = $_GET['state'] ?? '';
$expected_state = $_SESSION['oauth_state'] ?? '';

// state確認後はセッションから削除 (リプレイ攻撃対策)
unset($_SESSION['oauth_state']);

if (empty($received_state) || !hash_equals($expected_state, $received_state)) {
    error_log('[Auth Error] State mismatch - possible CSRF attempt');
    header('Location: ' . APP_BASE . '/login/?error=state_mismatch');
    exit;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ③ 認証コードをトークンと交換
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$code = $_GET['code'] ?? '';
if (empty($code)) {
    header('Location: ' . APP_BASE . '/login/?error=no_code');
    exit;
}

try {
    $tokens = fetch_tokens($code);
} catch (RuntimeException $e) {
    error_log('[Auth Error] Token fetch failed: ' . $e->getMessage());
    header('Location: ' . APP_BASE . '/login/?error=token_error');
    exit;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ④ IDトークンからユーザー情報を取り出す
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
try {
    $claims = decode_id_token($tokens['id_token']);
} catch (RuntimeException $e) {
    error_log('[Auth Error] Token decode failed: ' . $e->getMessage());
    header('Location: ' . APP_BASE . '/login/?error=token_decode_error');
    exit;
}

// Entra IDから取れるユーザー情報
$azure_oid = $claims['oid'] ?? '';  // ユーザーの一意ID
$display_name = $claims['name'] ?? '';  // 表示名
$email = $claims['preferred_username'] ?? ($claims['email'] ?? '');

if (empty($azure_oid) || empty($email)) {
    error_log('[Auth Error] Required claims missing: ' . json_encode($claims));
    header('Location: ' . APP_BASE . '/login/?error=missing_claims');
    exit;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑤ DBにユーザーを登録 or 更新 (UPSERT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$db = get_db();

// azure_oid が同じなら更新、初めてなら挿入 (SQLite UPSERT構文)
$sql = "
    INSERT INTO users (azure_oid, email, display_name)
    VALUES (:oid, :email, :name)
    ON CONFLICT(azure_oid) DO UPDATE SET
        email        = excluded.email,
        display_name = excluded.display_name,
        updated_at   = datetime('now','localtime')
";
$stmt = $db->prepare($sql);
$stmt->execute([
    ':oid' => $azure_oid,
    ':email' => $email,
    ':name' => $display_name,
]);

// 最新のユーザー情報をDBから取得 (team_name, bus_number, role を含む)
$stmt = $db->prepare('SELECT * FROM users WHERE azure_oid = ? LIMIT 1');
$stmt->execute([$azure_oid]);
$user = $stmt->fetch();

if (!$user) {
    error_log('[Auth Error] User not found after upsert for oid: ' . $azure_oid);
    header('Location: ' . APP_BASE . '/login/?error=db_error');
    exit;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑥ セッションにユーザー情報を保存してトップページへ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// セッション固定攻撃対策: ログイン時にセッションIDを再生成
session_regenerate_id(true);

$_SESSION['user'] = [
    'id' => (int) $user['id'],
    'azure_oid' => $user['azure_oid'],
    'email' => $user['email'],
    'display_name' => $user['display_name'],
    'team_name' => $user['team_name'],
    'bus_number' => $user['bus_number'],
    'role' => $user['role'],
];

// ★ ログイン前に保存したリダイレクト先があればそこへ、なければtop.phpへ
// index.php で $_SESSION['login_redirect'] に保存しておいた値を使う
$redirect_to = APP_BASE . '/login/top.php';
if (!empty($_SESSION['login_redirect'])) {
    $redirect_to = $_SESSION['login_redirect'];
    unset($_SESSION['login_redirect']); // 使ったら削除
}

header('Location: ' . $redirect_to);
exit;