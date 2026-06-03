<?php
/**
 * common/config.php
 * ─────────────────────────────────────────────────────────────
 * アプリ全体で使う設定値を定数として定義します。
 * 本番環境では .env ファイルや環境変数に移行してください。
 * ─────────────────────────────────────────────────────────────
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ベースパス自動検出
// localhost → ''  /  wagahai.mixh.jp/2026 → '/2026'
// これを使うことでどのサブディレクトリに置いても動く
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$_known_dirs = ['login', 'attendance', 'common'];
$_segments = array_filter(explode('/', $_SERVER['SCRIPT_NAME'] ?? '/'));
$_base_parts = [];
foreach ($_segments as $_seg) {
    if (in_array($_seg, $_known_dirs) || str_contains($_seg, '.'))
        break;
    $_base_parts[] = $_seg;
}
define('APP_BASE', $_base_parts ? '/' . implode('/', $_base_parts) : '');
unset($_known_dirs, $_segments, $_base_parts, $_seg);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// セッション設定
// 共有サーバーではデフォルトの保存先が書き込めないことがあるため
// アプリ内の sessions/ フォルダに保存先を変更する
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$_sess_path = __DIR__ . '/sessions';
if (!is_dir($_sess_path)) {
    mkdir($_sess_path, 0755, true);
}
session_save_path($_sess_path);
unset($_sess_path);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// .env 読み込み（プロジェクトルートの .env を優先、既存の環境変数は上書きしない）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Microsoft Entra ID (旧 Azure AD) 認証設定
// .env の各キーに値を設定してください（.env.example を参照）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** テナントID: Azure Portal > Microsoft Entra ID > 概要 で確認 */
define('AZURE_TENANT_ID', getenv('AZURE_TENANT_ID') ?: '');

/** クライアントID (アプリケーションID): アプリの登録画面で確認 */
define('AZURE_CLIENT_ID', getenv('AZURE_CLIENT_ID') ?: '');

/** クライアントシークレット: アプリの登録 > 証明書とシークレット で作成 */
define('AZURE_CLIENT_SECRET', getenv('AZURE_CLIENT_SECRET') ?: '');

/**
 * コールバックURL: HTTP_HOST から動的に生成する
 * localhost/127.0.0.1 → http、それ以外 → https
 * Azure Portal に登録するリダイレクトURIをこのホストで登録すること
 */
$_host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_isLocal = str_contains($_host, 'localhost') || str_contains($_host, '127.0.0.1');
define(
    'AZURE_REDIRECT_URI',
    ($_isLocal ? 'http' : 'https') . '://' . $_host . '/2026/login/callback.php'
);
unset($_host, $_isLocal);

/** 要求するスコープ (openid profile email は必須) */
define('AZURE_SCOPES', 'openid profile email');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// データベース設定 (SQLite: ファイル1つで動く)
// MySQLは不要。php.ini で extension=pdo_sqlite が有効なこと
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** SQLiteデータベースファイルのパス */
define('SQLITE_PATH', __DIR__ . '/database/company_trip.sqlite');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// アプリ共通設定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

define('APP_NAME', 'しおりアプリログイン');

/** セッション有効期間: 8時間 (秒単位) */
define('SESSION_LIFETIME', 3600 * 8);

/** 旅行の開催日 (YYYY-MM-DD形式) */
define('EVENT_DATE', '2026-06-20');
