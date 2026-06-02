<?php
/**
 * login/grant_admin.php
 * 現在ログイン中のユーザーを管理者にする1回限りのセットアップ用スクリプト。
 * 使い終わったらこのファイルは削除してください。
 */
require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php';
require_once __DIR__ . '/../common/db.php';

$user = current_user();
$db   = get_db();

$db->prepare('UPDATE users SET role = ? WHERE id = ?')
   ->execute(['admin', $user['id']]);

// セッションのロールも更新してすぐ反映
$_SESSION['user']['role'] = 'admin';

echo '<p style="font-family:sans-serif;padding:32px">
  ✅ <strong>' . htmlspecialchars($user['display_name']) . '</strong> を管理者にしました。<br><br>
  <a href="/attendance/admin.php">→ 管理画面を開く</a>
  <a href="/login/top.php">→ トップに戻る</a>
  <br><br>
  <small style="color:#999">⚠️ このファイル (grant_admin.php) は使い終わったら削除してください</small>
</p>';
