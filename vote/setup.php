<?php
require 'db.php';

$pdo->exec("CREATE TABLE IF NOT EXISTS vote_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    is_published TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    candidate VARCHAR(255) NOT NULL,
    voter VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (category_id, voter)
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS vote_category_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    UNIQUE KEY unique_member (category_id, member_name)
)");

// is_publishedカラムを追加（既存テーブルの場合）
try {
    $pdo->exec("ALTER TABLE vote_categories ADD COLUMN is_published TINYINT(1) DEFAULT 0");
} catch (PDOException $e) {
    // すでに存在する場合は無視
}

echo "セットアップ完了！";
?>