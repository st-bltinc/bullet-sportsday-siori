<?php
require 'db.php';

$pdo->exec("ALTER TABLE members ADD COLUMN birthday DATE NULL");
$pdo->exec("ALTER TABLE members ADD COLUMN department VARCHAR(100) NULL");

echo "カラム追加完了！";
?>