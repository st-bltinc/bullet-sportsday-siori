<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require 'db.php';
$method = $_SERVER['REQUEST_METHOD'];

// キャッシュファイルのパス
$cache_file = sys_get_temp_dir() . '/members_cache.json';
$cache_ttl = 300; // 5分

// ========= 画像リサイズ関数（GD使用）=========
function resizeAndSaveImage($src_path, $dest_path, $max_size = 800, $quality = 80)
{
    $info = getimagesize($src_path);
    if (!$info)
        return false;
    $mime = $info['mime'];
    switch ($mime) {
        case 'image/jpeg':
            $src = imagecreatefromjpeg($src_path);
            break;
        case 'image/png':
            $src = imagecreatefrompng($src_path);
            break;
        case 'image/gif':
            $src = imagecreatefromgif($src_path);
            break;
        case 'image/webp':
            $src = imagecreatefromwebp($src_path);
            break;
        default:
            return false;
    }
    $w = imagesx($src);
    $h = imagesy($src);
    // リサイズ不要なら圧縮のみ
    if ($w <= $max_size && $h <= $max_size) {
        $new_w = $w;
        $new_h = $h;
    } elseif ($w > $h) {
        $new_w = $max_size;
        $new_h = (int) ($h * $max_size / $w);
    } else {
        $new_h = $max_size;
        $new_w = (int) ($w * $max_size / $h);
    }
    $dst = imagecreatetruecolor($new_w, $new_h);
    // PNG/GIF の透過対応
    if ($mime === 'image/png' || $mime === 'image/gif') {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $new_w, $new_h, $w, $h);
    // 常にJPEGで保存
    $result = imagejpeg($dst, $dest_path, $quality);
    imagedestroy($src);
    imagedestroy($dst);
    return $result;
}

switch ($method) {
    // メンバー一覧取得（キャッシュあり）
    case 'GET':
        if (file_exists($cache_file) && time() - filemtime($cache_file) < $cache_ttl) {
            echo file_get_contents($cache_file);
            exit;
        }
        $stmt = $pdo->query('SELECT * FROM members ORDER BY yomi ASC');
        $result = json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        file_put_contents($cache_file, $result);
        echo $result;
        break;

    // 写真アップロード or メンバー追加
    case 'POST':
        if (isset($_FILES['photo'])) {
            $uploadDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0755, true);
            $filename = uniqid() . '.jpg'; // 常にJPEGで保存
            $filepath = $uploadDir . $filename;
            $tmp = $_FILES['photo']['tmp_name'];
            // リサイズ・圧縮して保存
            if (resizeAndSaveImage($tmp, $filepath)) {
                echo json_encode(['success' => true, 'path' => 'https://wagahai.mixh.jp/2026/members/uploads/' . $filename]);
            } else {
                // GD失敗時はそのまま保存
                if (move_uploaded_file($tmp, $filepath)) {
                    echo json_encode(['success' => true, 'path' => 'https://wagahai.mixh.jp/2026/members/uploads/' . $filename]);
                } else {
                    echo json_encode(['error' => 'アップロード失敗']);
                }
            }
            break;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            echo json_encode(['error' => '名前は必須です']);
            break;
        }
        $stmt = $pdo->prepare('INSERT INTO members (name, yomi, bus_number, photo, team, birthday, department, hometown, residence, hobby, skill, dream, role_assignment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['name'],
            $data['yomi'] ?? null,
            $data['bus_number'] ?? null,
            $data['photo'] ?? null,
            $data['team'] ?? null,
            $data['birthday'] ?? null,
            $data['department'] ?? null,
            $data['hometown'] ?? null,
            $data['residence'] ?? null,
            $data['hobby'] ?? null,
            $data['skill'] ?? null,
            $data['dream'] ?? null,
            $data['role_assignment'] ?? null,
        ]);
        if (file_exists($cache_file))
            unlink($cache_file);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // メンバー更新
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('UPDATE members SET name=?, yomi=?, bus_number=?, photo=?, team=?, birthday=?, department=?, hometown=?, residence=?, hobby=?, skill=?, dream=?, role_assignment=? WHERE id=?');
        $stmt->execute([
            $data['name'],
            $data['yomi'] ?? null,
            $data['bus_number'] ?? null,
            $data['photo'] ?? null,
            $data['team'] ?? null,
            $data['birthday'] ?? null,
            $data['department'] ?? null,
            $data['hometown'] ?? null,
            $data['residence'] ?? null,
            $data['hobby'] ?? null,
            $data['skill'] ?? null,
            $data['dream'] ?? null,
            $data['role_assignment'] ?? null,
            $data['id']
        ]);
        if (file_exists($cache_file))
            unlink($cache_file);
        echo json_encode(['success' => true]);
        break;

    // メンバー削除
    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('DELETE FROM members WHERE id=?');
        $stmt->execute([$data['id']]);
        if (file_exists($cache_file))
            unlink($cache_file);
        echo json_encode(['success' => true]);
        break;
}
?>