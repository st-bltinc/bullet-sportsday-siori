<?php
/**
 * login/index.php
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/functions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

if (!empty($_SESSION['user'])) {
    header('Location: ' . APP_BASE . '/');
    exit;
}

if (!empty($_GET['redirect'])) {
    $_SESSION['login_redirect'] = $_GET['redirect'];
}

$state = generate_state();
$_SESSION['oauth_state'] = $state;
$auth_url = build_auth_url($state);
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ログイン -
        <?= htmlspecialchars(APP_NAME) ?>
    </title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: #080810;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 48px 40px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
            text-align: center;
        }

        .logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 20px;
        }

        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        h1 {
            font-size: 22px;
            color: #fff;
            margin-bottom: 8px;
        }

        p {
            color: #888;
            font-size: 14px;
            margin-bottom: 32px;
            line-height: 1.6;
        }

        .btn-teams {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: #464EB8;
            color: #fff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            width: 100%;
            transition: background 0.2s;
        }

        .btn-teams:hover {
            background: #3b42a0;
        }

        .btn-teams svg {
            flex-shrink: 0;
        }

        .footer {
            margin-top: 32px;
            font-size: 12px;
            color: #555;
        }
    </style>
</head>

<body>
    <div class="card">
        <div class="logo">
            <img src="/2026/logo.png" alt="SDC運動会">
        </div>
        <h1>
            しおりアプリログイン
        </h1>
        <p>しおりアプリのログインシステムです。<br>Microsoft Teamsアカウントでログインしてください。</p>

        <a href="<?= htmlspecialchars($auth_url) ?>" class="btn-teams">
            <svg width="20" height="20" viewBox="0 0 2228.833 2073.333" xmlns="http://www.w3.org/2000/svg">
                <path fill="#fff"
                    d="M1554.637,777.5h575.713c54.391,0,98.483,44.092,98.483,98.483v524.398 c0,199.901-162.001,361.902-361.902,361.902h-1.711c-199.901,0.028-361.93-162.001-361.93-361.902V828.971 C1505.29,800.544,1527.365,777.5,1554.637,777.5z" />
                <circle fill="#fff" cx="1943.75" cy="440.583" r="233.25" />
                <path fill="#fff"
                    d="M1418.023,440.583c0,128.737-104.363,233.1-233.1,233.1s-233.1-104.363-233.1-233.1 s104.363-233.1,233.1-233.1S1418.023,311.846,1418.023,440.583z" />
                <path fill="#fff"
                    d="M1881.448,777.5H887.102c-53.186,0-96.268,43.082-96.268,96.268v600.411 c0,329.509,267.063,596.572,596.572,596.572s596.572-267.063,596.572-596.572V877.384 C1983.979,824.961,1937.871,777.5,1881.448,777.5z" />
            </svg>
            Microsoft Teams でログイン
        </a>

        <div class="footer">ご不明な点は総務部までお問い合わせください</div>
    </div>
</body>

</html>