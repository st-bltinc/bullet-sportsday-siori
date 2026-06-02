<?php
/**
 * notices/api.php
 * お知らせの取得・更新API
 * GET  → お知らせ一覧を返す
 * POST → お知らせを更新する（管理者のみ）
 */
require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://wagahai.mixh.jp');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// お知らせデータの保存先（このPHPと同じフォルダ）
$data_file = __DIR__ . '/notices.json';

// デフォルトのお知らせ
$default = [
    ['label' => '日時', 'value' => '2026年7月17日（金）'],
    ['label' => '会場', 'value' => '東急ドレッセとどろきアリーナ'],
    ['label' => 'その他', 'value' => 'One Team One SDC'],
];

// GET: お知らせ取得
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($data_file)) {
        echo file_get_contents($data_file);
    } else {
        echo json_encode($default);
    }
    exit;
}

// POST: お知らせ更新（管理者のみ）
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['error' => '管理者のみ更新できます']);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['error' => '不正なデータです']);
        exit;
    }

    // label と value のみ保存（XSS対策）
    $notices = array_map(fn($item) => [
        'label' => mb_substr(strip_tags($item['label'] ?? ''), 0, 20),
        'value' => mb_substr(strip_tags($item['value'] ?? ''), 0, 100),
    ], $body);

    file_put_contents($data_file, json_encode($notices, JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}