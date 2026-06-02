<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// セッション開始（委任トークン取得のため）
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

require 'db.php';
require 'graph.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ── 写真一覧取得 ───────────────────────────────────────────
    case 'GET':
        $stmt = $pdo->query('SELECT * FROM album_photos ORDER BY created_at DESC');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
        break;

    // ── 写真アップロード → OneDrive ───────────────────────────
    case 'POST':
        if (!isset($_FILES['photo'])) {
            http_response_code(400);
            echo json_encode(['error' => '画像ファイルがありません']);
            exit;
        }

        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $ext     = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));

        if (!in_array($ext, $allowed)) {
            http_response_code(400);
            echo json_encode(['error' => '許可されていないファイル形式です（jpg / png / gif / webp）']);
            exit;
        }

        if ($_FILES['photo']['size'] > 10 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['error' => 'ファイルサイズは10MB以内にしてください']);
            exit;
        }

        try {
            $result = graph_upload(
                $_FILES['photo']['tmp_name'],
                $_FILES['photo']['name']
            );
        } catch (RuntimeException $e) {
            http_response_code(502);
            echo json_encode(['error' => 'OneDriveへのアップロードに失敗しました: ' . $e->getMessage()]);
            exit;
        }

        $caption    = trim($_POST['caption']     ?? '');
        $uploadedBy = trim($_POST['uploaded_by'] ?? '');

        $stmt = $pdo->prepare(
            'INSERT INTO album_photos (item_id, drive_id, filename, caption, uploaded_by) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $result['item_id'],
            $result['drive_id'],
            $result['filename'],
            $caption    ?: null,
            $uploadedBy ?: null,
        ]);

        echo json_encode([
            'success'  => true,
            'id'       => (int) $pdo->lastInsertId(),
            'item_id'  => $result['item_id'],
            'drive_id' => $result['drive_id'],
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ── 写真削除（OneDrive + DB）──────────────────────────────
    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = isset($data['id']) ? (int) $data['id'] : 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'IDが必要です']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT item_id, drive_id FROM album_photos WHERE id = ?');
        $stmt->execute([$id]);
        $photo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$photo) {
            http_response_code(404);
            echo json_encode(['error' => '写真が見つかりません']);
            exit;
        }

        // OneDrive から削除（失敗しても DB 削除は続行）
        if (!empty($photo['drive_id']) && !empty($photo['item_id'])) {
            try {
                graph_delete($photo['drive_id'], $photo['item_id']);
            } catch (RuntimeException $e) {
                // Graph API 削除失敗はログのみ（DB は削除する）
                error_log('Graph削除失敗: ' . $e->getMessage());
            }
        }

        // ローカルキャッシュも削除
        $cacheFile = __DIR__ . '/cache/' . md5($photo['drive_id'] . '_' . $photo['item_id']);
        if (file_exists($cacheFile))       unlink($cacheFile);
        if (file_exists($cacheFile . '.meta')) unlink($cacheFile . '.meta');

        $pdo->prepare('DELETE FROM album_photos WHERE id = ?')->execute([$id]);

        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
}
?>
