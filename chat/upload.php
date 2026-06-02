<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_FILES['image'])) {
    echo json_encode(['error' => '画像がありません']);
    exit;
}

$ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

if (!in_array($ext, $allowed)) {
    echo json_encode(['error' => '許可されていないファイル形式です']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir))
    mkdir($uploadDir, 0755, true);

// ========= 画像リサイズ関数（GD使用）=========
function resizeAndSaveImage($src_path, $dest_path, $max_size = 1200, $quality = 80)
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
    if ($mime === 'image/png' || $mime === 'image/gif') {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $new_w, $new_h, $w, $h);
    $result = imagejpeg($dst, $dest_path, $quality);
    imagedestroy($src);
    imagedestroy($dst);
    return $result;
}

$filename = uniqid() . '.jpg'; // 常にJPEGで保存
$filepath = $uploadDir . $filename;
$tmp = $_FILES['image']['tmp_name'];

if (resizeAndSaveImage($tmp, $filepath)) {
    echo json_encode([
        'success' => true,
        'url' => 'https://wagahai.mixh.jp/2026/chat/uploads/' . $filename
    ]);
} else {
    // GD失敗時はそのまま保存
    $filename = uniqid() . '.' . $ext;
    $filepath = $uploadDir . $filename;
    if (move_uploaded_file($tmp, $filepath)) {
        echo json_encode([
            'success' => true,
            'url' => 'https://wagahai.mixh.jp/2026/chat/uploads/' . $filename
        ]);
    } else {
        echo json_encode(['error' => 'アップロード失敗']);
    }
}
?>