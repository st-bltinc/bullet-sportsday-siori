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

$OPENAI_API_KEY = getenv('OPENAI_API_KEY') ?: '';

function getAiAnswer($question, $apiKey)
{
    if (empty($apiKey)) {
        return 'AIの回答準備中です。しばらくお待ちください。';
    }

    $response = file_get_contents('https://api.openai.com/v1/chat/completions', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ]),
            'content' => json_encode([
                'model' => 'gpt-4o-mini',
                'max_tokens' => 500,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'あなたはSDC運動会のアシスタントです。以下のイベント情報をもとに質問に答えてください。簡潔に日本語で答えてください。わからない場合は「担当者にお問い合わせください」と答えてください。

【イベント基本情報】
- イベント名：SDC運動会
- コンセプト：One Team One SDC
- 日時：2026年7月17日（金）
- 受付開始：10:00
- 集合期限：10:30
- 会場：東急ドレッセとどろきアリーナ

【タイムスケジュール】
- 10:00 受付開始（とどろきアリーナ）
- 10:30 集合期限
- 10:45 開会式
- 13:00 お昼（観客席）
- 15:30 閉会式
- 16:00 バス出発
- 17:00 BBQ開始（キラナガーデン豊洲）
- 19:00 ラストオーダー
- 20:00 解散
- 21:00 二次会（新宿野村ビル）

【持ち物】
- 室内シューズ（持っていない場合は外履きシューズを事前に洗ってから持参）
- 動きやすい服装（ズボンや靴下など）
- 当日オリジナルTシャツ配布あり

【会場アクセス】
※各最寄り駅ごと、チームでまとまって現地に向かってください。距離的に現地集合が近い方はアリーナ集合でOK。

武蔵小杉駅から：
- 徒歩約20分
- バス利用：小杉駅前1番乗り場（川崎市バス）[溝05]溝口駅行き・[杉40]市民ミュージアム行き・[杉40]中原駅行き「とどろきアリーナ前」下車
- バス利用：小杉駅前2番乗り場（東急バス）[溝02][川31]「市営等々力グランド入口」下車
- バス利用：東横線小杉駅バス停（東急バス）[川31][川32][川33]「市営等々力グランド入口」下車

武蔵中原駅から：
- 徒歩約15分
- バス利用：中原駅前バス停（川崎市バス）[杉40]小杉駅前行き「とどろきアリーナ前」下車

新丸子駅から：
- 徒歩約15分

溝の口駅・武蔵溝ノ口駅から：
- バス約20分：溝の口駅5番乗り場（東急バス）[溝02][溝03][川31]「市営等々力グランド入口」下車

高津駅から：
- バス約12分：高津駅前バス停（東急バス）[溝02][溝03][川31]「市営等々力グランド入口」下車

【運動会種目】
玉入れ・綱引き・大玉送り・紙飛行機・一部参加・大縄飛び・かりびと競争・チャンバ乱・障害物リレー

【運営メンバー】
ひでさん・小山・纐纈さん・谷くん（しおり作成）・谷口くん（しおり作成）・原田さん・末永さん。
 簡潔に日本語で答えてください。わからない場合は「担当者にお問い合わせください」と答えてください。'
                    ],
                    [
                        'role' => 'user',
                        'content' => $question
                    ]
                ]
            ])
        ]
    ]));

    if (!$response)
        return 'AI回答の取得に失敗しました。';

    $result = json_decode($response, true);
    return $result['choices'][0]['message']['content'] ?? 'AI回答の取得に失敗しました。';
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->query('SELECT * FROM qna ORDER BY created_at DESC');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? null;

        if ($action === 'question') {
            $question = $data['question'];
            $userName = $data['user_name'];

            // 同じ質問がDBにあるか確認
            $stmt = $pdo->prepare('SELECT answer FROM qna WHERE question = ? AND answer IS NOT NULL LIMIT 1');
            $stmt->execute([$question]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // キャッシュから回答を返す
                $aiAnswer = $existing['answer'];
                $isAi = 1;
            } else {
                // AIに問い合わせ
                $aiAnswer = getAiAnswer($question, $OPENAI_API_KEY);
                $isAi = 1;
            }

            $stmt = $pdo->prepare('INSERT INTO qna (question, answer, user_name, is_ai) VALUES (?, ?, ?, ?)');
            $stmt->execute([$question, $aiAnswer, $userName, $isAi]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId(), 'answer' => $aiAnswer]);
        }

        if ($action === 'edit_answer') {
            $stmt = $pdo->prepare('UPDATE qna SET answer = ?, is_ai = 0 WHERE id = ?');
            $stmt->execute([$data['answer'], $data['id']]);
            echo json_encode(['success' => true]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('DELETE FROM qna WHERE id = ?');
        $stmt->execute([$data['id']]);
        echo json_encode(['success' => true]);
        break;
}
?>