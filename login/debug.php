<?php
// エラーを画面に表示する (確認後このファイルは削除してください)
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo '<h2>PHP動作確認</h2>';
echo 'PHPバージョン: ' . PHP_VERSION . '<br>';

require_once __DIR__ . '/../common/config.php';
echo 'config.php: OK<br>';

require_once __DIR__ . '/../common/db.php';
echo 'db.php: OK<br>';

$db = get_db();
echo 'DB接続: OK<br>';

echo '<br>✅ 全て正常です';
