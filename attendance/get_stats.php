<?php
/**
 * attendance/get_stats.php
 * ─────────────────────────────────────────────────────────────
 * 【API】出席統計をJSONで返すエンドポイント
 *
 * メソッド: GET
 * 認証:    必要 (セッション)
 *
 * レスポンス例:
 * {
 *   "event_date": "2026-06-20",
 *   "total": { "attended": 45, "all": 80, "rate": 56.3 },
 *   "by_team": [
 *     { "team_name": "営業部", "attended": 12, "total": 20, "rate": 60.0 },
 *     ...
 *   ],
 *   "by_bus": [
 *     { "bus_number": 1, "attended": 15, "total": 20, "rate": 75.0 },
 *     ...
 *   ],
 *   "my_status": { "attended": true, "checked_in_at": "2026-06-20 09:15:00" }
 * }
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php';
require_once __DIR__ . '/../common/db.php';
require_once __DIR__ . '/../common/functions.php';

$user = current_user();
$db   = get_db();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① 全体集計
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$sql_total = '
    SELECT
        COUNT(DISTINCT u.id)  AS all_users,
        COUNT(al.id)          AS attended
    FROM users u
    LEFT JOIN attendance_logs al
           ON al.user_id = u.id AND al.event_date = :event_date
';
$stmt = $db->prepare($sql_total);
$stmt->execute([':event_date' => EVENT_DATE]);
$total_row  = $stmt->fetch();
$all_count  = (int) $total_row['all_users'];
$att_count  = (int) $total_row['attended'];
$total_rate = $all_count > 0 ? round($att_count * 100 / $all_count, 1) : 0.0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ② チーム別集計
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$sql_team = '
    SELECT
        u.team_name,
        COUNT(DISTINCT u.id)                                          AS total_members,
        COUNT(al.id)                                                  AS attended_count,
        ROUND(COUNT(al.id) * 100.0 / COUNT(DISTINCT u.id), 1)        AS rate
    FROM users u
    LEFT JOIN attendance_logs al
           ON al.user_id = u.id AND al.event_date = :event_date
    GROUP BY u.team_name
    ORDER BY u.team_name
';
$stmt = $db->prepare($sql_team);
$stmt->execute([':event_date' => EVENT_DATE]);
$by_team = array_map(static function (array $row): array {
    return [
        'team_name' => $row['team_name'] ?? '未設定',
        'attended'  => (int) $row['attended_count'],
        'total'     => (int) $row['total_members'],
        'rate'      => (float) $row['rate'],
    ];
}, $stmt->fetchAll());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ③ バス別集計
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$sql_bus = '
    SELECT
        u.bus_number,
        COUNT(DISTINCT u.id)                                          AS total_members,
        COUNT(al.id)                                                  AS attended_count,
        ROUND(COUNT(al.id) * 100.0 / COUNT(DISTINCT u.id), 1)        AS rate
    FROM users u
    LEFT JOIN attendance_logs al
           ON al.user_id = u.id AND al.event_date = :event_date
    WHERE u.bus_number IS NOT NULL
    GROUP BY u.bus_number
    ORDER BY u.bus_number
';
$stmt = $db->prepare($sql_bus);
$stmt->execute([':event_date' => EVENT_DATE]);
$by_bus = array_map(static function (array $row): array {
    return [
        'bus_number' => (int) $row['bus_number'],
        'attended'   => (int) $row['attended_count'],
        'total'      => (int) $row['total_members'],
        'rate'       => (float) $row['rate'],
    ];
}, $stmt->fetchAll());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ④ 自分の出席状況
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$sql_me = '
    SELECT checked_in_at
    FROM attendance_logs
    WHERE user_id = :user_id AND event_date = :event_date
    LIMIT 1
';
$stmt = $db->prepare($sql_me);
$stmt->execute([':user_id' => $user['id'], ':event_date' => EVENT_DATE]);
$my_row = $stmt->fetch();

$my_status = [
    'attended'       => (bool) $my_row,
    'checked_in_at'  => $my_row ? $my_row['checked_in_at'] : null,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑤ まとめてJSONで返す
//    current_user を含めることでReact側がセッション確認と
//    ユーザー情報取得を1リクエストで済ませられる
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
json_response([
    'event_date'   => EVENT_DATE,
    'total'        => [
        'attended' => $att_count,
        'all'      => $all_count,
        'rate'     => $total_rate,
    ],
    'by_team'      => $by_team,
    'by_bus'       => $by_bus,
    'my_status'    => $my_status,
    'current_user' => [
        'id'           => $user['id'],
        'display_name' => $user['display_name'],
        'team_name'    => $user['team_name'],
        'bus_number'   => $user['bus_number'],
        'role'         => $user['role'],
    ],
]);
