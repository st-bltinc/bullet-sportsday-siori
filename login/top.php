<?php
/**
 * index.php - トップページ (ログイン後のリダイレクト先)
 */
require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php';
$user = current_user();

$redirect_to = APP_BASE . '/';
if (!empty($_SESSION['login_redirect'])) {
  $redirect_to = $_SESSION['login_redirect'];
  unset($_SESSION['login_redirect']);
}

require_once __DIR__ . '/../common/db.php';
$db = get_db();
$attendance_message = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['checkin'])) {
  $stmt = $db->prepare('INSERT OR IGNORE INTO attendance_logs (user_id, event_date) VALUES (?, ?)');
  $stmt->execute([$user['id'], EVENT_DATE]);
  if ($stmt->rowCount() > 0) {
    $_SESSION['attended'] = true;
    $attendance_message = '出席を記録しました！';
  } else {
    $_SESSION['attended'] = true;
    $attendance_message = 'すでに出席済みです';
  }
}

if (!empty($_SESSION['attended']) && !$attendance_message) {
  $attendance_message = 'すでに出席済みです';
}
?>
<!DOCTYPE html>
<html lang="ja">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>
    <?= htmlspecialchars(APP_NAME) ?>
  </title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #080810;
      color: #f0f0f8;
      margin: 0;
    }

    header {
      background: #0d0d1c;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: #fff;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    header h1 {
      margin: 0;
      font-size: 18px;
    }

    header a {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      text-decoration: none;
    }

    header a:hover {
      color: #fff;
    }

    main {
      max-width: 600px;
      margin: 24px auto;
      padding: 0 16px;
    }

    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 24px;
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #fff;
    }

    .card>p {
      color: #888;
      margin: 0 0 16px;
    }

    .info {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      font-size: 14px;
      line-height: 1.8;
      color: #ccc;
    }

    .info strong {
      display: inline-block;
      width: 100px;
      color: #888;
    }

    .btn {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      margin-right: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-primary {
      background: #E84040;
      color: #fff;
      font-size: 16px;
      padding: 14px 32px;
    }

    .btn-primary:hover {
      background: #c83030;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #ccc;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .btn-app {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      max-width: 225px;
      margin-top: 16px;
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border: 1px solid rgba(232, 64, 64, 0.5);
      box-shadow: 0 0 20px rgba(232, 64, 64, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      letter-spacing: 0.04em;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }

    .btn-app::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(232, 64, 64, 0.8), transparent);
    }

    .btn-app:hover {
      box-shadow: 0 0 30px rgba(232, 64, 64, 0.4);
      transform: translateY(-1px);
    }

    .btn-app:active {
      transform: scale(0.98);
    }

    .attended-msg {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #40C84A !important;
      font-weight: 700;
      margin-bottom: 16px;
    }
  </style>
</head>

<body>

  <header>
    <h1 style="display:flex;align-items:center;gap:0.4rem;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
      <?= htmlspecialchars(APP_NAME) ?>
    </h1>
    <a href="<?= APP_BASE ?>/login/logout.php">ログアウト</a>
  </header>

  <main>
    <div class="card">
      <h2>ログイン成功！</h2>
      <p>Microsoft Teamsアカウントで認証されました。</p>

      <div class="info">
        <strong>氏名</strong>
        <?= htmlspecialchars($user['display_name']) ?><br>
        <strong>メール</strong>
        <?= htmlspecialchars($user['email']) ?><br>
        <strong>チーム</strong>
        <?= htmlspecialchars($user['team_name'] ?? '未設定') ?><br>
        <strong>バス</strong>
        <?= $user['bus_number'] ? $user['bus_number'] . '号車' : '未設定' ?><br>
        <strong>ロール</strong>
        <?= htmlspecialchars($user['role']) ?>
      </div>

      <?php if ($attendance_message): ?>
        <p class="attended-msg">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <?= htmlspecialchars($attendance_message) ?>
        </p>
      <?php endif; ?>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <form method="post" style="display:inline">
          <button type="submit" name="checkin" value="1" class="btn btn-primary"
            style="display:inline-flex;align-items:center;gap:0.4rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>出席を記録する
          </button>
        </form>
        <?php if (is_admin()): ?>
          <a href="<?= APP_BASE ?>/attendance/admin.php" class="btn btn-secondary"
            style="display:inline-flex;align-items:center;gap:0.4rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M12 11h4" />
              <path d="M12 16h4" />
              <path d="M8 11h.01" />
              <path d="M8 16h.01" />
            </svg>管理画面 (出席一覧)
          </a>
        <?php endif; ?>
      </div>

      <a href="<?= htmlspecialchars($redirect_to) ?>" class="btn-app">
        <img src="/2026/logo.png" alt="" style="width:48px;height:48px;object-fit:contain;">
        アプリへ
      </a>
    </div>
  </main>

</body>

</html>