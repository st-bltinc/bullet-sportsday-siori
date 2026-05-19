<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'db.php';

if (!isset($_FILES['csv'])) {
    echo json_encode(['error' => 'CSVファイルがありません']);
    exit;
}

$file = $_FILES['csv']['tmp_name'];
$handle = fopen($file, 'r');

// ヘッダー行をスキップ
fgetcsv($handle);

$count = 0;
$errors = [];

while (($row = fgetcsv($handle)) !== false) {
    if (empty($row[0]))
        continue;

    $name = $row[0] ?? null;
    $yomi = $row[1] ?? null;
    $department = $row[2] ?? null;
    $team = $row[3] ?? null;
    $birthday = $row[4] ?? null;

    try {
        $stmt = $pdo->prepare('INSERT INTO members (name, yomi, department, team, birthday) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$name, $yomi, $department, $team, $birthday]);
        $count++;
    } catch (PDOException $e) {
        $errors[] = "{$name}の登録に失敗しました";
    }
}

fclose($handle);

echo json_encode(['success' => true, 'count' => $count, 'errors' => $errors]);
?>