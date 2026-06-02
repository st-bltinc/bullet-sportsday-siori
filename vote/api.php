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
    case 'GET':
        $action = $_GET['action'] ?? 'categories';

        if ($action === 'categories') {
            $stmt = $pdo->query('SELECT * FROM vote_categories ORDER BY created_at ASC');
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($action === 'results') {
            $categoryId = $_GET['category_id'] ?? null;
            $stmt = $pdo->prepare('SELECT candidate, COUNT(*) as count FROM votes WHERE category_id = ? GROUP BY candidate ORDER BY count DESC');
            $stmt->execute([$categoryId]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($action === 'check') {
            $categoryId = $_GET['category_id'] ?? null;
            $voter = $_GET['voter'] ?? null;
            $stmt = $pdo->prepare('SELECT candidate FROM votes WHERE category_id = ? AND voter = ?');
            $stmt->execute([$categoryId, $voter]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['voted' => $result ? $result['candidate'] : null]);
        }

        if ($action === 'category_members') {
            $categoryId = $_GET['category_id'] ?? null;
            $stmt = $pdo->prepare('SELECT member_name FROM vote_category_members WHERE category_id = ?');
            $stmt->execute([$categoryId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(array_column($rows, 'member_name'));
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? null;

        if ($action === 'vote') {
            try {
                $stmt = $pdo->prepare('INSERT INTO votes (category_id, candidate, voter) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE candidate = VALUES(candidate)');
                $stmt->execute([$data['category_id'], $data['candidate'], $data['voter']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                echo json_encode(['error' => 'エラーが発生しました']);
            }
        }

        if ($action === 'delete_vote') {
            $stmt = $pdo->prepare('DELETE FROM votes WHERE category_id = ? AND voter = ?');
            $stmt->execute([$data['category_id'], $data['voter']]);
            echo json_encode(['success' => true]);
        }

        if ($action === 'add_category') {
            $stmt = $pdo->prepare('INSERT INTO vote_categories (title, description) VALUES (?, ?)');
            $stmt->execute([$data['title'], $data['description'] ?? null]);
            $categoryId = $pdo->lastInsertId();

            if (!empty($data['members'])) {
                $stmt = $pdo->prepare('INSERT IGNORE INTO vote_category_members (category_id, member_name) VALUES (?, ?)');
                foreach ($data['members'] as $memberName) {
                    $stmt->execute([$categoryId, $memberName]);
                }
            }

            echo json_encode(['success' => true, 'id' => $categoryId]);
        }

        if ($action === 'add_category_member') {
            $stmt = $pdo->prepare('INSERT IGNORE INTO vote_category_members (category_id, member_name) VALUES (?, ?)');
            $stmt->execute([$data['category_id'], $data['member_name']]);
            echo json_encode(['success' => true]);
        }

        if ($action === 'remove_category_member') {
            $stmt = $pdo->prepare('DELETE FROM vote_category_members WHERE category_id = ? AND member_name = ?');
            $stmt->execute([$data['category_id'], $data['member_name']]);
            echo json_encode(['success' => true]);
        }

        if ($action === 'toggle_publish') {
            $stmt = $pdo->prepare('UPDATE vote_categories SET is_published = ? WHERE id = ?');
            $stmt->execute([$data['is_published'], $data['id']]);
            echo json_encode(['success' => true]);
        }

        break;

    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare('DELETE FROM votes WHERE category_id = ?')->execute([$data['id']]);
        $pdo->prepare('DELETE FROM vote_category_members WHERE category_id = ?')->execute([$data['id']]);
        $pdo->prepare('DELETE FROM vote_categories WHERE id = ?')->execute([$data['id']]);
        echo json_encode(['success' => true]);
        break;
}
?>