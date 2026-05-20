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

$OPENAI_API_KEY = ''; // ここにOpenAI APIキーを入力

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
                        'content' => 'あなたは社内運動会のアシスタントです。以下のイベント情報をもとに質問に答えてください。日程：2025年XX月XX日、会場：とどろきアリーナ（川崎市）、BBQ会場：キラナガーデン豊洲。簡潔に日本語で答えてください。わからない場合は「担当者にお問い合わせください」と答えてください。'
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

            $aiAnswer = getAiAnswer($question, $OPENAI_API_KEY);

            $stmt = $pdo->prepare('INSERT INTO qna (question, answer, user_name, is_ai) VALUES (?, ?, ?, 1)');
            $stmt->execute([$question, $aiAnswer, $userName]);
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