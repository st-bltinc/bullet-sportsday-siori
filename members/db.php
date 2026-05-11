<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'nfqyowlb_2026');
define('DB_USER', 'nfqyowlb_syain-ryokou');
define('DB_PASS', 'Bullbase5100-Bltinc');
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB接続失敗']);
    exit;
}
?>