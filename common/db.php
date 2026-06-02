<?php
/**
 * common/db.php
 * ─────────────────────────────────────────────────────────────
 * SQLiteデータベース接続を管理します。
 * MySQLと違い、ファイル1つで動くので別途サーバー不要です。
 *
 * 初回アクセス時に自動でテーブルを作成するため、
 * セットアップ作業は不要です。
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/config.php';

/**
 * PDO (SQLite) 接続インスタンスを返す
 */
function get_db(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        // DBファイルが置かれるディレクトリを自動作成
        $dir = dirname(SQLITE_PATH);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        try {
            $pdo = new PDO('sqlite:' . SQLITE_PATH);
            $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 複数リクエストが同時に書き込めるようWALモードを有効化
            $pdo->exec('PRAGMA journal_mode=WAL');
            // 外部キー制約を有効化 (SQLiteはデフォルト無効)
            $pdo->exec('PRAGMA foreign_keys=ON');

            // テーブルがなければ自動作成
            init_tables($pdo);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(
                ['error' => 'データベース接続に失敗しました: ' . $e->getMessage()],
                JSON_UNESCAPED_UNICODE
            );
            exit;
        }
    }

    return $pdo;
}

/**
 * テーブルを初期化する (存在しなければ作成)
 * アプリ起動時に一度だけ実行される
 */
function init_tables(PDO $pdo): void
{
    // ユーザーテーブル
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            azure_oid    TEXT    NOT NULL UNIQUE,
            email        TEXT    NOT NULL,
            display_name TEXT    NOT NULL,
            team_name    TEXT    DEFAULT NULL,
            bus_number   INTEGER DEFAULT NULL,
            role         TEXT    NOT NULL DEFAULT 'user'
                             CHECK(role IN ('user','admin')),
            created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        )
    ");

    // 出席記録テーブル
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance_logs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            event_date    TEXT    NOT NULL,
            checked_in_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(user_id, event_date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
}
