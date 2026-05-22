<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_FILES['image'])) {
    echo json_encode(['error' => '画像がありません']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir))
    mkdir($uploadDir, 0755, true);

$ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

if (!in_array($ext, $allowed)) {
    echo json_encode(['error' => '許可されていないファイル形式です']);
    exit;
}

$filename = uniqid() . '.' . $ext;
$filepath = $uploadDir . $filename;

if (move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
    echo json_encode([
        'success' => true,
        'url' => 'https://wagahai.mixh.jp/2026/chat/uploads/' . $filename
    ]);
} else {
    echo json_encode(['error' => 'アップロード失敗']);
}
?>