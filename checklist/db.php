<?php
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=nfqyowlb_2026;charset=utf8mb4',
        'nfqyowlb_syain-ryokou',
        'Bullbase5100-Bltinc',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB接続失敗']);
    exit;
}
?>