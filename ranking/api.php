<?php
require_once __DIR__ . '/../common/auth_check.php';
require_once __DIR__ . '/../common/db.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: https://wagahai.mixh.jp');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$user = current_user();

try {
    $db = get_db();

    switch ($method) {
        case 'GET':
            $eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : null;
            if (!$eventId) {
                json_response(['error' => '不正な競技IDです。'], 400);
            }

            $stmt = $db->prepare('SELECT * FROM ranking_events WHERE id = ?');
            $stmt->execute([$eventId]);
            $event = $stmt->fetch();

            if (!$event) {
                json_response(['error' => '競技が見つかりません。'], 404);
            }

            $stmt = $db->prepare('
                SELECT r.rank, r.result, r.points, r.member_id, u.display_name AS member_name, u.team_name
                FROM ranking_results r
                JOIN users u ON r.member_id = u.id
                WHERE r.event_id = ?
                ORDER BY r.rank ASC
            ');
            $stmt->execute([$eventId]);
            $rankings = $stmt->fetchAll();

            $teamScoresStmt = $db->prepare('
                SELECT u.team_name, SUM(r.points) AS total_points
                FROM ranking_results r
                JOIN users u ON r.member_id = u.id
                WHERE r.event_id = ?
                GROUP BY u.team_name
                ORDER BY total_points DESC
            ');
            $teamScoresStmt->execute([$eventId]);
            $teamScores = $teamScoresStmt->fetchAll();

            json_response([
                'success' => true,
                'event' => $event,
                'rankings' => $rankings,
                'team_scores' => $teamScores,
            ], 200);
            break;

        case 'POST':
            if (!is_admin()) {
                json_response(['error' => '管理者権限が必要です。'], 403);
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $eventId = isset($data['event_id']) ? (int)$data['event_id'] : null;
            $results = isset($data['results']) ? $data['results'] : null;

            if (!$eventId || !is_array($results)) {
                json_response(['error' => '入力が不正です。'], 400);
            }

            $db->beginTransaction();
            try {
                foreach ($results as $result) {
                    $memberId = isset($result['member_id']) ? (int)$result['member_id'] : null;
                    $competitionResult = trim($result['result']);

                    if (empty($memberId) || empty($competitionResult)) {
                        throw new Exception('無効な結果データです。');
                    }

                    $memberCheck = $db->prepare('SELECT COUNT(*) FROM users WHERE id = ?');
                    $memberCheck->execute([$memberId]);
                    if ($memberCheck->fetchColumn() === 0) {
                        throw new Exception('メンバーが存在しません。');
                    }

                    $stmt = $db->prepare('
                        INSERT INTO ranking_results (event_id, member_id, result, updated_at)
                        VALUES (?, ?, ?, datetime(\'now\',\'localtime\'))
                        ON CONFLICT(event_id, member_id) DO UPDATE SET
                        result = excluded.result,
                        updated_at = datetime(\'now\',\'localtime\')
                    ');
                    $stmt->execute([$eventId, $memberId, $competitionResult]);
                }
                $db->commit();
            } catch (Exception $e) {
                $db->rollBack();
                json_response(['error' => $e->getMessage()], 400);
            }

            json_response(['success' => true, 'message' => '順位を更新しました'], 200);
            break;

        default:
            json_response(['error' => '許可されていないメソッドです。'], 405);
    }
} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log($e->getMessage());
    json_response(['error' => 'サーバーエラーが発生しました。'], 500);
} catch (Exception $e) {
    json_response(['error' => '予期しないエラーが発生しました。'], 500);
}

### Reactコンポーネント

`app/src`ディレクトリに`LiveRankingBoard.jsx`として作成します。

#### ファイル: app/src/LiveRankingBoard.jsx