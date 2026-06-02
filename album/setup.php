<?php
/**
 * album/setup.php
 * ─────────────────────────────────────────────────────────────
 * 【一回限りのセットアップ】ftani@bulletgroup.jp が実行する
 *
 * やること:
 *   1. ログイン中のユーザーのトークンで OneDrive ドライブIDを取得
 *   2. アルバムフォルダが存在しなければ作成
 *   3. onedrive_config.json に保存
 *
 * 実行方法:
 *   ftani さんがアプリにログインした状態で
 *   https://wagahai.mixh.jp/2026/album/setup.php にアクセス
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php'; // 未ログインはログインページへ
require 'graph.php';

$user    = current_user();
$message = null;
$error   = null;
$config  = file_exists(ONEDRIVE_CONFIG)
    ? json_decode(file_get_contents(ONEDRIVE_CONFIG), true)
    : null;

// セットアップ実行
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['run_setup'])) {
    try {
        $token = graph_token();

        // ① 自分の OneDrive ドライブID を取得
        $ctx = stream_context_create(['http' => [
            'method'        => 'GET',
            'header'        => "Authorization: Bearer {$token}\r\n",
            'ignore_errors' => true,
        ]]);
        $driveData = json_decode(
            file_get_contents('https://graph.microsoft.com/v1.0/me/drive', false, $ctx),
            true
        );

        if (empty($driveData['id'])) {
            throw new RuntimeException('ドライブIDの取得に失敗しました: ' . json_encode($driveData));
        }
        $driveId = $driveData['id'];

        // ② フォルダの存在確認 or 作成
        $folderPath  = GRAPH_FOLDER;
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $folderPath)));
        $folderUrl   = "https://graph.microsoft.com/v1.0/me/drive/root:/{$encodedPath}";

        $ctx = stream_context_create(['http' => [
            'method'        => 'GET',
            'header'        => "Authorization: Bearer {$token}\r\n",
            'ignore_errors' => true,
        ]]);
        $folderData = json_decode(file_get_contents($folderUrl, false, $ctx), true);

        if (empty($folderData['id'])) {
            // フォルダが存在しないので作成
            $parts      = explode('/', $folderPath);
            $folderName = array_pop($parts);
            $parentPath = implode('/', $parts);
            $encodedParent = implode('/', array_map('rawurlencode', explode('/', $parentPath)));

            $createUrl = "https://graph.microsoft.com/v1.0/me/drive/root:/{$encodedParent}:/children";
            $ctx = stream_context_create(['http' => [
                'method'        => 'POST',
                'header'        => "Authorization: Bearer {$token}\r\nContent-Type: application/json\r\n",
                'content'       => json_encode([
                    'name'                              => $folderName,
                    'folder'                            => new stdClass(),
                    '@microsoft.graph.conflictBehavior' => 'rename',
                ]),
                'ignore_errors' => true,
            ]]);
            $folderData = json_decode(file_get_contents($createUrl, false, $ctx), true);

            if (empty($folderData['id'])) {
                throw new RuntimeException('フォルダ作成に失敗しました: ' . json_encode($folderData));
            }
        }

        // ③ 設定ファイルに保存
        $saveData = [
            'drive_id'    => $driveId,
            'drive_owner' => $user['email'],
            'folder_path' => $folderPath,
            'folder_id'   => $folderData['id'],
            'setup_at'    => date('Y-m-d H:i:s'),
        ];
        file_put_contents(ONEDRIVE_CONFIG, json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

        $config  = $saveData;
        $message = 'セットアップが完了しました！';

    } catch (RuntimeException $e) {
        $error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>アルバム セットアップ</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; margin: 0; }
    .header { background: #0078d4; color: #fff; padding: 14px 24px; }
    .header h1 { margin: 0; font-size: 18px; }
    .main { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 20px; }
    .card h2 { font-size: 16px; margin: 0 0 16px; color: #333; }
    .info { background: #f0f7ff; border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 2; margin-bottom: 20px; }
    .info strong { display: inline-block; width: 130px; color: #555; }
    .success { background: #d4edda; color: #155724; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-weight: 600; }
    .error-box { background: #f8d7da; color: #721c24; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; word-break: break-all; }
    .btn { background: #0078d4; color: #fff; border: none; border-radius: 8px; padding: 12px 28px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .btn:hover { background: #006bbf; }
    .config-box { background: #f8f9fa; border-radius: 8px; padding: 14px 16px; font-size: 12px; font-family: monospace; word-break: break-all; color: #333; }
    .back { display: inline-block; margin-top: 16px; color: #0078d4; text-decoration: none; font-size: 13px; }
    .warn { background: #fff3cd; color: #856404; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="header"><h1>📷 アルバム セットアップ</h1></div>
  <div class="main">

    <?php if ($message): ?>
      <div class="success">✅ <?= htmlspecialchars($message) ?></div>
    <?php endif; ?>
    <?php if ($error): ?>
      <div class="error-box">❌ エラー: <?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <div class="card">
      <h2>📋 実行するユーザー</h2>
      <div class="info">
        <strong>ログイン中:</strong><?= htmlspecialchars($user['display_name']) ?><br>
        <strong>メール:</strong><?= htmlspecialchars($user['email']) ?><br>
      </div>

      <?php if ($user['email'] !== 'ftani@bulletgroup.jp'): ?>
        <div class="warn">
          ⚠️ このセットアップは <strong>ftani@bulletgroup.jp</strong> のアカウントで実行してください。<br>
          （アップロード先が ftani さんの OneDrive のため）
        </div>
      <?php endif; ?>

      <h2>⚙️ セットアップ内容</h2>
      <div class="info">
        <strong>対象フォルダ:</strong><?= htmlspecialchars(GRAPH_FOLDER) ?><br>
        <strong>処理内容:</strong>OneDrive ドライブID を取得し保存<br>
        <strong>フォルダ:</strong>存在しない場合は自動作成<br>
      </div>

      <form method="post">
        <button type="submit" name="run_setup" value="1" class="btn">
          🚀 セットアップを実行
        </button>
      </form>
    </div>

    <?php if ($config): ?>
    <div class="card">
      <h2>✅ 現在の設定</h2>
      <div class="config-box">
        Drive ID: <?= htmlspecialchars($config['drive_id'] ?? '') ?><br>
        Owner:    <?= htmlspecialchars($config['drive_owner'] ?? '') ?><br>
        Folder:   <?= htmlspecialchars($config['folder_path'] ?? '') ?><br>
        Setup at: <?= htmlspecialchars($config['setup_at'] ?? '') ?>
      </div>
    </div>
    <?php endif; ?>

    <a href="./index.html" class="back">← アルバムに戻る</a>
  </div>
</body>
</html>
