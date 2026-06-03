<?php
/**
 * scoreboard/api.php
 * ─────────────────────────────────────────────────────────────
 * 【API】リアルタイムスコアボード
 *
 * メソッド: GET, POST
 * 認証:    必要 (セッション)
 *
 * GET  → 全チームの得点情報を返す
 * POST → チームの得点を更新する（管理者のみ）
 * ─────────────────────────────────────────────────────────────
 */

// 認証チェックをヘッダー送信前に実行
require_once __DIR__ . '/../common/auth_check.php';
require_once __DIR__ . '/../common/db.php';
require_once __DIR__ . '/../common/functions.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: https://wagahai.mixh.jp');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = get_db();
$user = current_user();

// 許可されたチーム名の定義
define('ALLOWED_TEAMS', ['赤チーム', '青チーム', '黄チーム', '緑チーム']);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    // ── 全チームの得点取得 ───────────────────────────────────
    case 'GET':
        try {
            $stmt = $db->query('
                SELECT team_name, score
                FROM team_scores
                ORDER BY score DESC
            ');
            $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // チーム名が登録されていない場合は初期化
            if (empty($scores)) {
                foreach (ALLOWED_TEAMS as $team) {
                    $db->prepare('INSERT OR IGNORE INTO team_scores (team_name, score) VALUES (?, 0)')
                       ->execute([$team]);
                }
                $stmt = $db->query('SELECT team_name, score FROM team_scores ORDER BY score DESC');
                $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // スコアを整数にキャスト
            $scores = array_map(function($team) {
                return [
                    'team_name' => $team['team_name'],
                    'score' => (int)$team['score']
                ];
            }, $scores);

            json_response($scores);
        } catch (PDOException $e) {
            json_response(['error' => '得点情報の取得に失敗しました: ' . $e->getMessage()], 500);
        }
        break;

    // ── チームの得点更新（管理者のみ） ───────────────────────
    case 'POST':
        if (!is_admin()) {
            json_response(['error' => '管理者のみ得点を更新できます'], 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $team_name = $data['team_name'] ?? null;
        $score = $data['score'] ?? null;

        // バリデーション
        if (!$team_name || !in_array($team_name, ALLOWED_TEAMS)) {
            json_response(['error' => '有効なチーム名を指定してください'], 400);
        }

        if (!filter_var($score, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 0, 'max_range' => 99999]
        ])) {
            json_response(['error' => '得点は0〜99999の整数で指定してください'], 400);
        }

        try {
            // チームの存在確認
            $stmt = $db->prepare('SELECT 1 FROM team_scores WHERE team_name = ?');
            $stmt->execute([$team_name]);
            if ($stmt->fetchColumn() === false) {
                json_response(['error' => '指定されたチームが存在しません'], 404);
            }

            // 更新
            $stmt = $db->prepare('
                UPDATE team_scores
                SET score = :score, updated_at = datetime(\'now\',\'localtime\')
                WHERE team_name = :team_name
            ');
            $stmt->execute([
                ':team_name' => $team_name,
                ':score' => (int)$score
            ]);

            json_response(['success' => true]);
        } catch (PDOException $e) {
            json_response(['error' => '得点の更新に失敗しました: ' . $e->getMessage()], 500);
        }
        break;

    default:
        json_response(['error' => '許可されていないメソッドです'], 405);
}
?>

---