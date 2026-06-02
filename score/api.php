<?php
/**
 * score/api.php
 * ─────────────────────────────────────────────────────────────
 * 【API】ライブスコアの取得・更新エンドポイント
 *
 * メソッド: GET, POST
 * 認証:    GETは不要、POSTは管理者のみ
 *
 * GET レスポンス例:
 *   [
 *     { "team_name": "営業部", "score": 20 },
 *     { "team_name": "開発部", "score": 15 }
 *   ]
 *
 * POST リクエスト例:
 *   { "team_name": "営業部", "score": 25 }
 *
 * POST レスポンス例:
 *   { "success": true, "message": "スコアを更新しました" }
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/functions.php';
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

$db = get_db();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    // スコア一覧取得（認証不要）
    case 'GET':
        try {
            // 有効なチーム名リストを取得
            $valid_teams = $db->query("SELECT DISTINCT team_name FROM users WHERE team_name IS NOT NULL")
                              ->fetchAll(PDO::FETCH_COLUMN);

            // チームが存在しない場合は初期化
            foreach ($valid_teams as $team) {
                $stmt = $db->prepare('INSERT OR IGNORE INTO scores (team_name, score) VALUES (?, 0)');
                $stmt->execute([$team]);
            }

            // スコアを取得して返す
            $stmt = $db->query('SELECT team_name, score FROM scores ORDER BY score DESC');
            json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            error_log('[Score API] PDOException: ' . $e->getMessage());
            json_response(['error' => 'スコアの取得に失敗しました'], 500);
        }
        break;

    // スコア更新（管理者のみ）
    case 'POST':
        require_once __DIR__ . '/../common/auth_check.php';

        if (!is_admin()) {
            json_response(['error' => '管理者のみスコアを更新できます'], 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $team_name = trim($data['team_name'] ?? '');
        $score = $data['score'] ?? null;

        // バリデーション
        if (empty($team_name) || filter_var($score, FILTER_VALIDATE_INT) === false) {
            json_response(['error' => 'チーム名とスコアを正しく指定してください'], 400);
        }

        // チーム名のバリデーション
        $valid_teams = $db->query("SELECT DISTINCT team_name FROM users WHERE team_name IS NOT NULL")
                          ->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array($team_name, $valid_teams, true)) {
            json_response(['error' => '不正なチーム名です'], 400);
        }

        // スコアの範囲チェック
        $score = (int)$score;
        if ($score < 0 || $score > 9999) {
            json_response(['error' => 'スコアは0〜9999の範囲で指定してください'], 400);
        }

        // チーム名の長さチェック
        if (mb_strlen($team_name) > 50) {
            json_response(['error' => 'チーム名が長すぎます'], 400);
        }

        try {
            $stmt = $db->prepare('UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE team_name = ?');
            $stmt->execute([$score, $team_name]);

            if ($stmt->rowCount() === 0) {
                $stmt = $db->prepare('INSERT INTO scores (team_name, score) VALUES (?, ?)');
                $stmt->execute([$team_name, $score]);
            }

            // Firebase Realtime Databaseに更新を反映
            $stmt = $db->query('SELECT team_name, score FROM scores ORDER BY score DESC');
            $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $firebase_data = [];
            foreach ($scores as $s) {
                $firebase_data[$s['team_name']] = $s['score'];
            }

            $fb_url = 'https://bullet-sportsday-default-rtdb.asia-southeast1.firebasedatabase.app/live_scores.json';
            $ctx = stream_context_create(['http' => [
                'method' => 'PUT',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($firebase_data),
            ]]);
            @file_get_contents($fb_url, false, $ctx);

            json_response([
                'success' => true,
                'message' => 'スコアを更新しました'
            ]);
        } catch (PDOException $e) {
            error_log('[Score API] PDOException: ' . $e->getMessage());
            json_response(['error' => 'スコアの更新に失敗しました'], 500);
        }
        break;

    default:
        json_response(['error' => '許可されていないメソッドです'], 405);
        break;
}