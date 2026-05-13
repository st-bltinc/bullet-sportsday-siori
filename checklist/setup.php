<?php
require 'db.php';

// チェックリスト項目テーブル
$pdo->exec("CREATE TABLE IF NOT EXISTS checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0
)");

// チェック状態テーブル
$pdo->exec("CREATE TABLE IF NOT EXISTS checklist_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  checked TINYINT(1) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_check (item_id, user_name)
)");

// デフォルト項目を挿入
$items = [
    '動きやすい服装・運動靴',
    '着替え',
    'タオル・汗拭きタオル',
    '水筒・飲み物',
    '日焼け止め・帽子',
    '保険証',
    'レジャーシート',
    'スマートフォン',
];

$stmt = $pdo->prepare('INSERT IGNORE INTO checklist_items (text, sort_order) VALUES (?, ?)');
foreach ($items as $i => $text) {
    $stmt->execute([$text, $i]);
}

echo "セットアップ完了！";
?>