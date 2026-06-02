<?php
/**
 * album/image.php
 * OneDrive の画像をプロキシ配信 + ローカルキャッシュ
 *
 * GET /album/image.php?id={item_id}&drv={drive_id}
 */

// セッション開始（委任トークン取得のため）
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

require 'graph.php';

$itemId  = $_GET['id']  ?? '';
$driveId = $_GET['drv'] ?? '';

// ID を安全な文字のみに限定（パストラバーサル対策）
$itemId  = preg_replace('/[^a-zA-Z0-9\-_!.]/', '', $itemId);
$driveId = preg_replace('/[^a-zA-Z0-9\-_!.]/', '', $driveId);

if (!$itemId || !$driveId) {
    http_response_code(400);
    exit;
}

$cacheDir  = __DIR__ . '/cache/';
$cacheKey  = md5($driveId . '_' . $itemId);
$cacheFile = $cacheDir . $cacheKey;
$metaFile  = $cacheFile . '.meta';

// ── キャッシュヒット ──────────────────────────────────────
if (file_exists($cacheFile) && file_exists($metaFile)) {
    $meta = json_decode(file_get_contents($metaFile), true);
    header('Content-Type: ' . ($meta['ct'] ?? 'image/jpeg'));
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: HIT');
    readfile($cacheFile);
    exit;
}

// ── Graph API から取得 ────────────────────────────────────
try {
    $result = graph_get_content($driveId, $itemId);
} catch (RuntimeException $e) {
    http_response_code(503);
    exit;
}

if (empty($result['body'])) {
    http_response_code(404);
    exit;
}

// キャッシュに保存
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
file_put_contents($cacheFile, $result['body'], LOCK_EX);
file_put_contents($metaFile, json_encode(['ct' => $result['content_type']]), LOCK_EX);

header('Content-Type: ' . $result['content_type']);
header('Cache-Control: public, max-age=86400');
header('X-Cache: MISS');
echo $result['body'];
?>
