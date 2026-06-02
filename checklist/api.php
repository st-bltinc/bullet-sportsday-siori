<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    // 項目一覧取得
    case 'GET':
        $action = $_GET['action'] ?? 'items';

        if ($action === 'items') {
            $stmt = $pdo->query('SELECT * FROM checklist_items ORDER BY sort_order ASC');
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        // チェック状態取得（個人）
        if ($action === 'checks') {
            $userName = $_GET['user_name'] ?? '';
            $stmt = $pdo->prepare('SELECT item_id FROM checklist_checks WHERE user_name = ?');
            $stmt->execute([$userName]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(array_column($rows, 'item_id'));
        }

        // 全員のチェック状況（管理者用）
        if ($action === 'stats') {
            $stmt = $pdo->query('
                SELECT ci.id, ci.text,
                    COUNT(cc.user_name) as checked_count,
                    GROUP_CONCAT(cc.user_name ORDER BY cc.user_name SEPARATOR ",") as checked_users
                FROM checklist_items ci
                LEFT JOIN checklist_checks cc ON ci.id = cc.item_id
                GROUP BY ci.id
                ORDER BY ci.sort_order ASC
            ');
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        // 全体の完了人数
        if ($action === 'total_users') {
            $stmt = $pdo->query('SELECT COUNT(DISTINCT user_name) as total FROM checklist_checks');
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? null;

        // チェック切り替え
        if ($action === 'toggle') {
            $itemId = $data['item_id'];
            $userName = $data['user_name'];

            $stmt = $pdo->prepare('SELECT id FROM checklist_checks WHERE item_id = ? AND user_name = ?');
            $stmt->execute([$itemId, $userName]);

            if ($stmt->fetch()) {
                $pdo->prepare('DELETE FROM checklist_checks WHERE item_id = ? AND user_name = ?')
                    ->execute([$itemId, $userName]);
                echo json_encode(['checked' => false]);
            } else {
                $pdo->prepare('INSERT INTO checklist_checks (item_id, user_name) VALUES (?, ?)')
                    ->execute([$itemId, $userName]);
                echo json_encode(['checked' => true]);
            }
        }

        // 項目追加
        if ($action === 'add_item') {
            $stmt = $pdo->prepare('INSERT INTO checklist_items (text, sort_order) VALUES (?, ?)');
            $maxOrder = $pdo->query('SELECT MAX(sort_order) FROM checklist_items')->fetchColumn();
            $stmt->execute([$data['text'], ($maxOrder ?? 0) + 1]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare('DELETE FROM checklist_checks WHERE item_id = ?')->execute([$data['id']]);
        $pdo->prepare('DELETE FROM checklist_items WHERE id = ?')->execute([$data['id']]);
        echo json_encode(['success' => true]);
        break;
}
?>