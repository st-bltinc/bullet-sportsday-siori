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

    // メンバー追加
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
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