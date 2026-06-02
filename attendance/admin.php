<?php
/**
 * attendance/admin.php
 */

require_once __DIR__ . '/../common/config.php';
require_once __DIR__ . '/../common/auth_check.php';
require_once __DIR__ . '/../common/db.php';

if (!is_admin()) {
    http_response_code(403);
    echo '<h1>403 Forbidden</h1><p>管理者のみアクセスできます。</p>';
    exit;
}

$db = get_db();

$sql = '
    SELECT
        u.id, u.display_name, u.email, u.team_name, u.bus_number,
        al.checked_in_at,
        CASE WHEN al.id IS NOT NULL THEN 1 ELSE 0 END AS attended
    FROM users u
    LEFT JOIN attendance_logs al ON al.user_id = u.id AND al.event_date = :event_date
    ORDER BY u.team_name, u.display_name
';
$stmt = $db->prepare($sql);
$stmt->execute([':event_date' => EVENT_DATE]);
$members = $stmt->fetchAll();

$total_count = count($members);
$attended_count = count(array_filter($members, fn($m) => $m['attended']));
$rate = $total_count > 0 ? round($attended_count * 100 / $total_count, 1) : 0;

$current = current_user();
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理者画面 -
        <?= htmlspecialchars(APP_NAME) ?>
    </title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            background: #080810;
            color: #f0f0f8;
        }

        header {
            background: #0d0d1c;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            color: #fff;
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
        }

        header h1 {
            margin: 0;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        header a {
            color: rgba(255, 255, 255, 0.6);
            font-size: 13px;
            text-decoration: none;
            white-space: nowrap;
        }

        header a:hover {
            color: #fff;
        }

        main {
            max-width: 1200px;
            margin: 16px auto;
            padding: 0 12px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }

        .card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 14px 8px;
            text-align: center;
        }

        .card .num {
            font-size: 28px;
            font-weight: 700;
            color: #E84040;
        }

        .card .label {
            font-size: 12px;
            color: #888;
            margin-top: 2px;
        }

        .filter {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .filter label {
            font-size: 13px;
            color: #aaa;
        }

        .filter select {
            padding: 7px 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            font-size: 13px;
            background: rgba(255, 255, 255, 0.06);
            color: #fff;
            font-family: inherit;
        }

        .export-btn {
            padding: 7px 14px;
            background: rgba(40, 167, 69, 0.15);
            color: #40C84A;
            border: 1px solid rgba(40, 167, 69, 0.4);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }

        .export-btn:hover {
            background: rgba(40, 167, 69, 0.25);
        }

        /* テーブル（PC） */
        table {
            width: 100%;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            border-collapse: collapse;
            overflow: hidden;
        }

        th {
            background: rgba(232, 64, 64, 0.15);
            color: #E84040;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 13px;
            color: #ccc;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.03);
        }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }

        .badge-ok {
            background: rgba(40, 167, 69, 0.2);
            color: #40C84A;
            border: 1px solid rgba(40, 167, 69, 0.4);
        }

        .badge-ng {
            background: rgba(232, 64, 64, 0.1);
            color: #E84040;
            border: 1px solid rgba(232, 64, 64, 0.3);
        }

        .home-fab {
            position: fixed;
            bottom: 24px;
            right: 16px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            overflow: hidden;
            background: #080810;
            box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            z-index: 9999;
        }

        /* スマホ：カード型レイアウト */
        @media (max-width: 640px) {
            .summary {
                grid-template-columns: repeat(2, 1fr);
            }

            table,
            thead,
            tbody,
            th,
            td,
            tr {
                display: block;
            }

            thead {
                display: none;
            }

            tr {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                margin-bottom: 8px;
                padding: 10px 12px;
            }

            td {
                border: none;
                padding: 3px 0;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            td::before {
                content: attr(data-label);
                color: #666;
                font-size: 11px;
                min-width: 70px;
                flex-shrink: 0;
            }

            td:empty {
                display: none;
            }

            .filter {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>

<body>

    <header>
        <h1>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path
                    d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
            <?= htmlspecialchars(APP_NAME) ?> — 管理者画面
        </h1>
        <span style="font-size:13px;color:#aaa;">
            <?= htmlspecialchars($current['display_name']) ?> |
            <a href="<?= APP_BASE ?>/login/logout.php">ログアウト</a>
        </span>
    </header>

    <main>
        <div class="summary">
            <div class="card">
                <div class="num">
                    <?= $attended_count ?>
                </div>
                <div class="label">出席済み</div>
            </div>
            <div class="card">
                <div class="num">
                    <?= $total_count - $attended_count ?>
                </div>
                <div class="label">未確認</div>
            </div>
            <div class="card">
                <div class="num">
                    <?= $total_count ?>
                </div>
                <div class="label">全社員</div>
            </div>
            <div class="card">
                <div class="num">
                    <?= $rate ?>%
                </div>
                <div class="label">出席率</div>
            </div>
        </div>

        <button class="export-btn" onclick="exportCsv()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSVダウンロード
        </button>

        <div class="filter">
            <label for="teamFilter">チーム：</label>
            <select id="teamFilter" onchange="filterTable()">
                <option value="">すべて</option>
                <?php
                $teams = array_unique(array_column($members, 'team_name'));
                sort($teams);
                foreach ($teams as $t) {
                    echo '<option value="' . htmlspecialchars($t) . '">' . htmlspecialchars($t ?? '未設定') . '</option>';
                }
                ?>
            </select>
            <label for="statusFilter">状態：</label>
            <select id="statusFilter" onchange="filterTable()">
                <option value="">すべて</option>
                <option value="1">出席済み</option>
                <option value="0">未確認</option>
            </select>
        </div>

        <table id="memberTable">
            <thead>
                <tr>
                    <th>氏名</th>
                    <th>チーム</th>
                    <th>バス</th>
                    <th>メールアドレス</th>
                    <th>出席状況</th>
                    <th>確認日時</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($members as $m): ?>
                    <tr data-team="<?= htmlspecialchars($m['team_name'] ?? '') ?>" data-attended="<?= $m['attended'] ?>">
                        <td data-label="氏名">
                            <?= htmlspecialchars($m['display_name']) ?>
                        </td>
                        <td data-label="チーム">
                            <?= htmlspecialchars($m['team_name'] ?? '未設定') ?>
                        </td>
                        <td data-label="バス">
                            <?= $m['bus_number'] !== null ? $m['bus_number'] . '号車' : '未設定' ?>
                        </td>
                        <td data-label="メール">
                            <?= htmlspecialchars($m['email']) ?>
                        </td>
                        <td data-label="出席">
                            <?php if ($m['attended']): ?>
                                <span class="badge badge-ok">出席済み</span>
                            <?php else: ?>
                                <span class="badge badge-ng">未確認</span>
                            <?php endif; ?>
                        </td>
                        <td data-label="日時">
                            <?= htmlspecialchars($m['checked_in_at'] ?? '—') ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </main>

    <a href="https://wagahai.mixh.jp/2026/" class="home-fab">
        <img src="/2026/logo-home.png" alt="ホーム" style="width:60px;height:60px;object-fit:contain;">
    </a>

    <script>
        function filterTable() {
            const teamVal = document.getElementById('teamFilter').value;
            const statusVal = document.getElementById('statusFilter').value;
            document.querySelectorAll('#memberTable tbody tr').forEach(tr => {
                const teamMatch = !teamVal || tr.dataset.team === teamVal;
                const statusMatch = !statusVal || tr.dataset.attended === statusVal;
                tr.style.display = (teamMatch && statusMatch) ? '' : 'none';
            });
        }

        function exportCsv() {
            const headers = ['氏名', 'チーム', 'バス', 'メールアドレス', '出席状況', '確認日時'];
            const rows = [...document.querySelectorAll('#memberTable tbody tr')]
                .filter(tr => tr.style.display !== 'none')
                .map(tr => [...tr.querySelectorAll('td')].map(td => '"' + td.innerText.trim().replace(/"/g, '""') + '"'));
            const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '出席状況_<?= EVENT_DATE ?>.csv';
            a.click();
        }
    </script>

</body>

</html>