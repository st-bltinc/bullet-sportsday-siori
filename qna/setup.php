<?php
require 'db.php';

$pdo->exec("CREATE TABLE IF NOT EXISTS qna (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(500) NOT NULL,
    answer TEXT NULL,
    user_name VARCHAR(100) NOT NULL,
    is_ai TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

echo "セットアップ完了！";
?>