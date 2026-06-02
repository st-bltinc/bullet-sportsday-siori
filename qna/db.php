<?php
// .env 読み込み（プロジェクトルートの .env を優先、既存の環境変数は上書きしない）
$_envPath = __DIR__ . '/../.env';
if (is_file($_envPath)) {
    foreach (file($_envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        $_line = trim($_line);
        if ($_line === '' || $_line[0] === '#' || !str_contains($_line, '=')) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_k = trim($_k);
        $_v = trim($_v);
        if (strlen($_v) >= 2 && in_array($_v[0], ['"', "'"], true) && $_v[-1] === $_v[0]) {
            $_v = substr($_v, 1, -1);
        }
        if ($_k !== '' && getenv($_k) === false) putenv("$_k=$_v");
    }
}
unset($_envPath, $_line, $_k, $_v);

try {
    $pdo = new PDO(
        'mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_NAME') . ';charset=utf8mb4',
        getenv('DB_USER'),
        getenv('DB_PASSWORD'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB接続失敗']);
    exit;
}
