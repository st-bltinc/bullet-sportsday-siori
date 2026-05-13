<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    // 項目一覧＋チェック状態取得
    case 'GET':
        $userName = $_GET['user'] ?? null;

        // 項目一覧取得
        $items = $pdo->query('SELECT * FROM checklist_items ORDER BY sort_order ASC')->fetchAll(PDO::FETCH_ASSOC);

        if ($userName) {
            // 自分のチェック状態を取得
            $stmt = $pdo->prepare('SELECT item_id, checked FROM checklist_checks WHERE user_name = ?');
            $stmt->execute([$userName]);
            $checks = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            foreach ($items as &$item) {
                $item['checked'] = isset($checks[$item['id']]) ? (bool) $checks[$item['id']] : false;
            }
        }

        echo json_encode($items);
        break;

    // チェック状態の更新
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? null;

        if ($action === 'check') {
            $stmt = $pdo->prepare('INSERT INTO checklist_checks (item_id, user_name, checked) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE checked = VALUES(checked)');
            $stmt->execute([$data['item_id'], $data['user_name'], $data['checked'] ? 1 : 0]);
            echo json_encode(['success' => true]);
        }

        // 管理者：全員のチェック状態取得
        if ($action === 'admin') {
            $stmt = $pdo->query('
                SELECT ci.text, cc.user_name, cc.checked
                FROM checklist_items ci
                LEFT JOIN checklist_checks cc ON ci.id = cc.item_id
                ORDER BY ci.sort_order ASC, cc.user_name ASC
            ');
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;
}
?>