<?php
/**
 * album/graph.php
 * Microsoft Graph API ヘルパー（委任トークンで OneDrive 操作）
 *
 * 必要なスコープ（委任・ユーザー同意のみ・管理者同意不要）:
 *   Files.ReadWrite.All  offline_access
 *
 * 前提:
 *   ftani@bulletgroup.jp が「アルバムテスト」フォルダを
 *   「bltinc 組織のユーザー(編集可)」で共有していること
 *   + album/setup.php を一度実行して onedrive_config.json を生成していること
 */

require_once __DIR__ . '/../common/config.php';

/** アルバム設定ファイルパス */
define('ONEDRIVE_CONFIG', __DIR__ . '/onedrive_config.json');

/** OneDrive フォルダパス */
define('GRAPH_FOLDER', 'Documents/アルバムテスト');

// ─────────────────────────────────────────────────────────────
// セッションから委任トークンを取得（期限切れ時はリフレッシュ）
// ─────────────────────────────────────────────────────────────

function graph_token(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
        session_start();
    }

    $token   = $_SESSION['graph_token']         ?? null;
    $expires = $_SESSION['graph_token_expires']  ?? 0;
    $refresh = $_SESSION['graph_refresh_token']  ?? null;

    // 有効なトークンがあればそのまま使う
    if ($token && $expires > time() + 120) {
        return $token;
    }

    // リフレッシュトークンで更新
    if ($refresh) {
        try {
            $new = graph_refresh_token($refresh);
            $_SESSION['graph_token']         = $new['access_token'];
            $_SESSION['graph_token_expires']  = time() + (int)($new['expires_in'] ?? 3600);
            if (!empty($new['refresh_token'])) {
                $_SESSION['graph_refresh_token'] = $new['refresh_token'];
            }
            return $new['access_token'];
        } catch (RuntimeException $e) {
            unset($_SESSION['graph_token'], $_SESSION['graph_token_expires'], $_SESSION['graph_refresh_token']);
        }
    }

    throw new RuntimeException('セッションにトークンがありません。再ログインしてください。');
}

function graph_refresh_token(string $refreshToken): array
{
    $url  = 'https://login.microsoftonline.com/' . AZURE_TENANT_ID . '/oauth2/v2.0/token';
    $body = http_build_query([
        'client_id'     => AZURE_CLIENT_ID,
        'client_secret' => AZURE_CLIENT_SECRET,
        'refresh_token' => $refreshToken,
        'grant_type'    => 'refresh_token',
        'scope'         => AZURE_SCOPES,
    ]);

    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content'       => $body,
        'ignore_errors' => true,
    ]]);

    $json = json_decode(file_get_contents($url, false, $ctx), true);
    if (empty($json['access_token'])) {
        throw new RuntimeException('トークンリフレッシュ失敗');
    }
    return $json;
}

// ─────────────────────────────────────────────────────────────
// OneDrive ドライブID 読み込み
// ─────────────────────────────────────────────────────────────

function get_drive_id(): string
{
    if (!file_exists(ONEDRIVE_CONFIG)) {
        throw new RuntimeException('OneDrive が未設定です。管理者が setup.php を実行してください。');
    }
    $cfg = json_decode(file_get_contents(ONEDRIVE_CONFIG), true);
    if (empty($cfg['drive_id'])) {
        throw new RuntimeException('onedrive_config.json に drive_id がありません。');
    }
    return $cfg['drive_id'];
}

// ─────────────────────────────────────────────────────────────
// ファイルアップロード
// ─────────────────────────────────────────────────────────────

/**
 * @return array{item_id:string, drive_id:string, filename:string}
 */
function graph_upload(string $tmpPath, string $originalName): array
{
    $token    = graph_token();
    $driveId  = get_drive_id();
    $ext      = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $filename = date('Ymd_His_') . substr(uniqid(), -6) . '.' . $ext;
    $fullPath = GRAPH_FOLDER . '/' . $filename;
    $encodedPath = implode('/', array_map('rawurlencode', explode('/', $fullPath)));
    $filesize = filesize($tmpPath);

    if ($filesize <= 4 * 1024 * 1024) {
        // シンプルアップロード
        $url  = "https://graph.microsoft.com/v1.0/drives/{$driveId}/root:/{$encodedPath}:/content";
        $ctx  = stream_context_create(['http' => [
            'method'        => 'PUT',
            'header'        => "Authorization: Bearer {$token}\r\nContent-Type: application/octet-stream\r\n",
            'content'       => file_get_contents($tmpPath),
            'ignore_errors' => true,
        ]]);
        $item = json_decode(file_get_contents($url, false, $ctx), true);

    } else {
        // アップロードセッション（4MB超）
        $sessionUrl = "https://graph.microsoft.com/v1.0/drives/{$driveId}/root:/{$encodedPath}:/createUploadSession";
        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Authorization: Bearer {$token}\r\nContent-Type: application/json\r\n",
            'content'       => json_encode(['item' => ['@microsoft.graph.conflictBehavior' => 'rename']]),
            'ignore_errors' => true,
        ]]);
        $session = json_decode(file_get_contents($sessionUrl, false, $ctx), true);

        if (empty($session['uploadUrl'])) {
            throw new RuntimeException('アップロードセッション作成失敗: ' . json_encode($session));
        }

        $chunkSize = 320 * 1024 * 10; // 3.2 MB (320KiBの倍数)
        $fh     = fopen($tmpPath, 'rb');
        $offset = 0;
        $item   = null;

        while ($offset < $filesize) {
            $chunk  = fread($fh, $chunkSize);
            $len    = strlen($chunk);
            $end    = $offset + $len - 1;
            $ctx    = stream_context_create(['http' => [
                'method'        => 'PUT',
                'header'        => "Content-Length: {$len}\r\nContent-Range: bytes {$offset}-{$end}/{$filesize}\r\n",
                'content'       => $chunk,
                'ignore_errors' => true,
            ]]);
            $item   = json_decode(file_get_contents($session['uploadUrl'], false, $ctx), true);
            $offset += $len;
        }
        fclose($fh);
    }

    if (empty($item['id'])) {
        throw new RuntimeException('アップロード失敗: ' . json_encode($item ?? []));
    }

    return [
        'item_id'  => $item['id'],
        'drive_id' => $item['parentReference']['driveId'] ?? $driveId,
        'filename' => $filename,
    ];
}

// ─────────────────────────────────────────────────────────────
// ファイル取得（画像プロキシ用）
// ─────────────────────────────────────────────────────────────

function graph_get_content(string $driveId, string $itemId): array
{
    $token = graph_token();
    $url   = "https://graph.microsoft.com/v1.0/drives/" . urlencode($driveId)
           . "/items/" . urlencode($itemId) . "/content";

    $ctx  = stream_context_create(['http' => [
        'method'        => 'GET',
        'header'        => "Authorization: Bearer {$token}\r\n",
        'ignore_errors' => true,
    ]]);
    $body = file_get_contents($url, false, $ctx);

    $ct = 'image/jpeg';
    foreach (($http_response_header ?? []) as $h) {
        if (stripos($h, 'content-type:') === 0) {
            $ct = trim(substr($h, 13));
            break;
        }
    }

    return ['content_type' => $ct, 'body' => (string)$body];
}

// ─────────────────────────────────────────────────────────────
// ファイル削除
// ─────────────────────────────────────────────────────────────

function graph_delete(string $driveId, string $itemId): void
{
    $token = graph_token();
    $url   = "https://graph.microsoft.com/v1.0/drives/" . urlencode($driveId)
           . "/items/" . urlencode($itemId);

    $ctx = stream_context_create(['http' => [
        'method'        => 'DELETE',
        'header'        => "Authorization: Bearer {$token}\r\n",
        'ignore_errors' => true,
    ]]);
    file_get_contents($url, false, $ctx);
}
?>
