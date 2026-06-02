-- ================================================================
-- 社員旅行出席管理システム - データベーススキーマ
-- 対象DB: MySQL 8.0 / MariaDB 10.6 以降
--
-- セットアップ手順:
--   1. MySQL に接続: mysql -u root -p
--   2. このファイルを実行: source /path/to/schema.sql
-- ================================================================

-- データベースを作成
CREATE DATABASE IF NOT EXISTS company_trip
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE company_trip;

-- ================================================================
-- users テーブル
-- Microsoft Entra IDで認証したユーザー情報を保管
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '内部ID',
    azure_oid    VARCHAR(100)  NOT NULL         COMMENT 'Azure AD Object ID (一意)',
    email        VARCHAR(255)  NOT NULL         COMMENT 'メールアドレス',
    display_name VARCHAR(255)  NOT NULL         COMMENT '表示名',
    team_name    VARCHAR(100)  DEFAULT NULL     COMMENT 'チーム名 (例: 営業部, 開発部)',
    bus_number   TINYINT UNSIGNED DEFAULT NULL  COMMENT 'バス番号 (1〜4 など)',
    role         ENUM('user','admin') NOT NULL DEFAULT 'user' COMMENT 'ロール',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- azure_oid で高速検索 (ログイン時に使用)
    UNIQUE KEY uq_azure_oid (azure_oid),
    -- 統計クエリで GROUP BY するカラムにインデックスを張る
    INDEX idx_team_name  (team_name),
    INDEX idx_bus_number (bus_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- attendance_logs テーブル
-- 出席記録。1ユーザー1日につき1レコードのみ
-- ================================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '記録ID',
    user_id       INT UNSIGNED NOT NULL COMMENT 'users.id への外部キー',
    event_date    DATE         NOT NULL COMMENT '旅行開催日',
    checked_in_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '出席確認日時',

    -- 同じユーザーが同じ日に2回登録できないよう制約
    UNIQUE KEY uq_user_event (user_id, event_date),
    -- 日付での絞り込みを高速化
    INDEX idx_event_date (event_date),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- サンプルデータ (開発・テスト用)
-- 本番環境ではこの INSERT 文を実行しないこと
-- ================================================================

-- 管理者ユーザーを1名追加 (azure_oidは実際の値に変更してください)
-- INSERT INTO users (azure_oid, email, display_name, team_name, bus_number, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'admin@example.com', '管理者 太郎', '総務部', 1, 'admin');

-- 一般ユーザーのサンプル (80名分はCSVインポートを推奨)
-- INSERT INTO users (azure_oid, email, display_name, team_name, bus_number) VALUES
--   ('00000000-0000-0000-0000-000000000002', 'yamada@example.com', '山田 花子', '営業部', 1),
--   ('00000000-0000-0000-0000-000000000003', 'tanaka@example.com', '田中 次郎', '開発部', 2),
--   ('00000000-0000-0000-0000-000000000004', 'suzuki@example.com', '鈴木 三郎', '人事部', 3);

-- ================================================================
-- 管理者ロール付与 (運用開始後に手動実行)
-- 対象ユーザーのメールアドレスを指定して管理者にする
-- ================================================================
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin@example.com';
