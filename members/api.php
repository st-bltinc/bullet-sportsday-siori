<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    // メンバー一覧取得
    case 'GET':
        $stmt = $pdo->query('SELECT * FROM members ORDER BY yomi ASC');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    // 写真アップロード
    case 'POST':
        // 写真アップロードの場合
        if (isset($_FILES['photo'])) {
            $uploadDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0755, true);

            $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
            $filename = uniqid() . '.' . $ext;
            $filepath = $uploadDir . $filename;

            if (move_uploaded_file($_FILES['photo']['tmp_name'], $filepath)) {
                echo json_encode(['success' => true, 'path' => 'https://wagahai.mixh.jp/2026/members/uploads/' . $filename]);
            } else {
                echo json_encode(['error' => 'アップロード失敗']);
            }
            break;
        }

        // メンバー追加の場合
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            echo json_encode(['error' => '名前は必須です']);
            break;
        }
        $stmt = $pdo->prepare('INSERT INTO members (name, yomi, bus_number, photo, team) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['name'],
            $data['yomi'] ?? null,
            $data['bus_number'] ?? null,
            $data['photo'] ?? null,
            $data['team'] ?? null
        ]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // メンバー更新
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('UPDATE members SET name=?, yomi=?, bus_number=?, photo=?, team=? WHERE id=?');
        $stmt->execute([
            $data['name'],
            $data['yomi'] ?? null,
            $data['bus_number'] ?? null,
            $data['photo'] ?? null,
            $data['team'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true]);
        break;

    // メンバー削除
    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('DELETE FROM members WHERE id=?');
        $stmt->execute([$data['id']]);
        echo json_encode(['success' => true]);
        break;
}
?>