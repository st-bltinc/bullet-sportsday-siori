<?php
require 'db.php';

$sql = "CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  yomi VARCHAR(100),
  bus_number INT,
  photo VARCHAR(255),
  team VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

$pdo->exec($sql);
echo "テーブル作成完了！";
?>