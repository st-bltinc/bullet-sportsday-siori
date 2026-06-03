#!/usr/bin/env node
/**
 * multi-ai-sportsday.js
 * BULLET-SPORTSDAY のコードベースを読んで
 * Claude / GPT-4o / Mistral が役割を自分で決めてから
 * 新機能を議論しながら実装するマルチAIエージェント
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY;
const MISTRAL_API_KEY   = process.env.MISTRAL_API_KEY;

const MAX_LOOPS = 3;
const MAX_CHARS = 2000;   // ファイルごとの最大文字数
const ROOT_DIR  = path.resolve(__dirname, '..');

// ── ANSI カラー ──────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  blue:    '\x1b[34m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  gray:    '\x1b[90m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
};

// ── ロガー ────────────────────────────────────────
function stamp() {
  return new Date().toLocaleTimeString('ja-JP', { hour12: false });
}

function logAI(emoji, name, color, message) {
  console.log(`\n${C.gray}[${stamp()}]${C.reset} ${color}${C.bold}${emoji} ${name}:${C.reset}`);
  const preview = message.length > 900
    ? message.slice(0, 900) + `\n${C.gray}... (${message.length}文字)${C.reset}`
    : message;
  console.log(`${color}${preview}${C.reset}`);
}

function logSys(msg) {
  console.log(`\n${C.cyan}${'━'.repeat(62)}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${msg}${C.reset}`);
  console.log(`${C.cyan}${'━'.repeat(62)}${C.reset}`);
}

function logRole(label, value) {
  console.log(`  ${C.bold}${C.yellow}${label}:${C.reset} ${C.white}${value}${C.reset}`);
}

function logInfo(msg) {
  console.log(`${C.gray}  → ${msg}${C.reset}`);
}

// ── API クライアント ──────────────────────────────

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Claude ${res.status}: ${e}`); }
  return (await res.json()).content[0].text;
}

async function callGPT4o(systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 6000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`GPT-4o ${res.status}: ${e}`); }
  return (await res.json()).choices[0].message.content;
}

async function callMistral(systemPrompt, userPrompt) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${MISTRAL_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Mistral ${res.status}: ${e}`); }
  return (await res.json()).choices[0].message.content;
}

// AI名 → 呼び出し関数
function getAICaller(aiName) {
  if (aiName === 'Claude')  return callClaude;
  if (aiName === 'GPT-4o')  return callGPT4o;
  if (aiName === 'Mistral') return callMistral;
  throw new Error(`Unknown AI: ${aiName}`);
}

function getAIMeta(aiName) {
  if (aiName === 'Claude')  return { emoji: '🔵', color: C.blue };
  if (aiName === 'GPT-4o')  return { emoji: '🟢', color: C.green };
  if (aiName === 'Mistral') return { emoji: '🔴', color: C.red };
  return { emoji: '🤖', color: C.white };
}

// ── Step 0: コードベース読み込み ─────────────────

function readFileTruncated(absPath) {
  try {
    const content = fs.readFileSync(absPath, 'utf-8');
    if (content.length <= MAX_CHARS) return content;
    return content.slice(0, MAX_CHARS) + `\n// ...(省略: ${content.length}文字)`;
  } catch {
    return null;
  }
}

function buildCodebaseContext() {
  const phpFolders = [
    'album', 'attendance', 'chat', 'checklist', 'game',
    'login', 'map', 'members', 'mypage', 'notices', 'qna',
    'schedule', 'vote', 'common',
  ];
  const files = [];

  for (const folder of phpFolders) {
    const dir = path.join(ROOT_DIR, folder);
    if (!fs.existsSync(dir)) continue;
    const phpFiles = fs.readdirSync(dir).filter(f => f.endsWith('.php'));
    for (const file of phpFiles) {
      const content = readFileTruncated(path.join(dir, file));
      if (content) files.push({ relPath: `${folder}/${file}`, content });
    }
  }

  for (const rel of ['app/src/App.jsx', 'app/src/App.css']) {
    const content = readFileTruncated(path.join(ROOT_DIR, rel));
    if (content) files.push({ relPath: rel, content });
  }

  return files;
}

function formatCodebase(files) {
  return files.map(f => `=== ${f.relPath} ===\n${f.content}`).join('\n\n');
}

// ── 役割パース ────────────────────────────────────

function parseRoles(decisionText) {
  // JSONブロック優先
  const jsonBlock = decisionText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (jsonBlock) {
    try {
      const obj = JSON.parse(jsonBlock[1]);
      if (obj['設計'] && obj['実装'] && obj['レビュー']) {
        return { design: obj['設計'], implement: obj['実装'], review: obj['レビュー'] };
      }
    } catch { /* フォールバックへ */ }
  }

  // テキストパース
  const aiNames = ['Claude', 'GPT-4o', 'Mistral'];
  const roles   = { design: null, implement: null, review: null };

  for (const name of aiNames) {
    const lines = decisionText.split('\n').filter(l =>
      l.includes(name) || l.toLowerCase().includes(name.toLowerCase())
    );
    for (const line of lines) {
      const l = line.toLowerCase();
      if ((l.includes('設計') || l.includes('design') || l.includes('architect')) && !roles.design) {
        roles.design = name;
      } else if ((l.includes('実装') || l.includes('implement') || l.includes('engineer')) && !roles.implement) {
        roles.implement = name;
      } else if ((l.includes('レビュー') || l.includes('review') || l.includes('qa')) && !roles.review) {
        roles.review = name;
      }
    }
  }

  // 埋まっていない役割をデフォルト割り当て
  const used      = [roles.design, roles.implement, roles.review];
  const remaining = aiNames.filter(n => !used.includes(n));
  if (!roles.design)    roles.design    = remaining.shift() ?? 'Claude';
  if (!roles.implement) roles.implement = remaining.shift() ?? 'GPT-4o';
  if (!roles.review)    roles.review    = remaining.shift() ?? 'Mistral';

  return roles;
}

// ── コード・ファイル抽出 ──────────────────────────

function extractFilesFromImpl(text) {
  const result = { php: [], jsx: [] };

  // // FILE: path/to/file.ext パターン
  const fileRe = /\/\/\s*FILE:\s*([^\n]+)\n([\s\S]*?)(?=\/\/\s*FILE:|$)/g;
  let m;
  while ((m = fileRe.exec(text)) !== null) {
    const relPath = m[1].trim();
    const content = m[2].replace(/```[\w]*\n?|```$/gm, '').trim();
    if (relPath.endsWith('.php'))           result.php.push({ relPath, content });
    else if (/\.(jsx?|tsx?)$/.test(relPath)) result.jsx.push({ relPath, content });
  }

  // フォールバック: ```php / ```jsx ブロック
  if (result.php.length === 0 && result.jsx.length === 0) {
    const phpBlocks = [...text.matchAll(/```php\s*\n([\s\S]*?)\n```/gi)].map(m => m[1].trim());
    const jsxBlocks = [...text.matchAll(/```(?:jsx?|tsx?|javascript|react)\s*\n([\s\S]*?)\n```/gi)].map(m => m[1].trim());
    if (phpBlocks.length > 0) result.php.push({ relPath: null, content: phpBlocks[0] });
    if (jsxBlocks.length > 0) result.jsx.push({ relPath: null, content: jsxBlocks[0] });
  }

  return result;
}

function isOK(reviewText) {
  const firstLine = reviewText.trim().split('\n')[0].trim().toUpperCase();
  return /^OK[\s:,。]?/.test(firstLine) || firstLine === 'OK';
}

// ── Step 5: ファイル保存 & git push ──────────────

function saveAndCommit(allFiles, featureName) {
  const saved = [];

  for (const { relPath, content } of allFiles) {
    if (!relPath || !content) continue;
    const absPath = path.join(ROOT_DIR, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content, 'utf-8');
    saved.push(relPath);
    logInfo(`保存: ${relPath}`);
  }

  if (saved.length === 0) {
    console.log(`${C.yellow}⚠️  保存できるファイルがありませんでした。${C.reset}`);
    return;
  }

  const fileArgs = saved.map(f => `"${f}"`).join(' ');
  const msg = `feat: ${featureName} (multi-AI agent)`;

  try {
    execSync(`git add ${fileArgs}`, { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(
      `git commit -m "${msg}" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"`,
      { cwd: ROOT_DIR, stdio: 'inherit' }
    );
    execSync('git push origin HEAD', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`\n${C.green}${C.bold}🚀 git push 完了！GitHub Actions の AI Review が起動します。${C.reset}`);
  } catch (e) {
    console.log(`\n${C.yellow}⚠️  git操作エラー: ${e.message}${C.reset}`);
  }
}

// ── メイン ────────────────────────────────────────

async function main() {
  const missing = [
    ['ANTHROPIC_API_KEY', ANTHROPIC_API_KEY],
    ['OPENAI_API_KEY',    OPENAI_API_KEY],
    ['MISTRAL_API_KEY',   MISTRAL_API_KEY],
  ].filter(([, v]) => !v).map(([k]) => k);

  if (missing.length) {
    console.error(`${C.red}❌ 環境変数が未設定: ${missing.join(', ')}${C.reset}`);
    process.exit(1);
  }

  console.log(`
${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗
║  マルチAIエージェント — BULLET-SPORTSDAY 新機能開発          ║
║  🔵 Claude  🟢 GPT-4o  🔴 Mistral  が自分で役割を決める     ║
╚══════════════════════════════════════════════════════════════╝${C.reset}
`);

  // ────────────────────────────────────────────────────
  // Step 0: コードベース読み込み
  // ────────────────────────────────────────────────────
  logSys('Step 0 / コードベースを読み込み中...');
  const codebaseFiles = buildCodebaseContext();
  const codebaseText  = formatCodebase(codebaseFiles);
  logInfo(`読み込んだファイル数: ${codebaseFiles.length}`);
  codebaseFiles.forEach(f => logInfo(f.relPath));
  logInfo(`合計文字数: ${codebaseText.length.toLocaleString()}文字`);

  const CODEBASE_PREFIX = `以下はBULLET-SPORTSDAYという運動会管理アプリのコードです。
技術スタック: PHP / React (Vite) / SQLite / Azure AD認証

${codebaseText}

`;

  // ────────────────────────────────────────────────────
  // Step 1-A: 役割決め会議（並列）
  // ────────────────────────────────────────────────────
  logSys('Step 1-A / 役割決め会議 — 3つのAIが並列で提案中...');

  const roleProposalSys = `あなたはシニアエンジニアとして、コードを読んで自分の得意分野を述べ、
担当したい役割を300文字以内で提案します。`;

  const roleProposalUser = `${CODEBASE_PREFIX}このアプリに新機能を追加するプロジェクトで、
Claude・GPT-4o・Mistralの3つのAIが協力して開発します。

コードを読んだ上で、あなたが担当したい役割とその理由を提案してください。

役割の候補：
- 設計・アーキテクチャ（仕様策定・技術選定・データ設計）
- 実装・コーディング（PHPバックエンド + Reactフロントエンド）
- レビュー・品質管理（セキュリティ・既存コードとの整合性チェック）

コードを読んで気になった点や、どの役割が向いていると思うかも述べてください。`;

  const [rClaude, rGPT, rMistral] = await Promise.allSettled([
    callClaude(roleProposalSys, roleProposalUser),
    callGPT4o(roleProposalSys, roleProposalUser),
    callMistral(roleProposalSys, roleProposalUser),
  ]);

  const claudeProposal  = rClaude.status   === 'fulfilled' ? rClaude.value   : '（取得失敗）';
  const gptProposal     = rGPT.status      === 'fulfilled' ? rGPT.value      : '（取得失敗）';
  const mistralProposal = rMistral.status  === 'fulfilled' ? rMistral.value  : '（取得失敗）';

  logAI('🔵', 'Claude（役割提案）',  C.blue,  claudeProposal);
  logAI('🟢', 'GPT-4o（役割提案）', C.green, gptProposal);
  logAI('🔴', 'Mistral（役割提案）', C.red,   mistralProposal);

  // ────────────────────────────────────────────────────
  // Step 1-B: 役割最終決定
  // ────────────────────────────────────────────────────
  logSys('Step 1-B / Claude が役割を最終決定中...');

  const decisionUser = `以下の3つのAIの役割提案を読んで、最適な役割分担を決定してください。

【Claude の提案】
${claudeProposal}

【GPT-4o の提案】
${gptProposal}

【Mistral の提案】
${mistralProposal}

以下のJSON形式で回答してください（必ずこのフォーマットで）：
\`\`\`json
{
  "設計": "Claude または GPT-4o または Mistral",
  "実装": "Claude または GPT-4o または Mistral",
  "レビュー": "Claude または GPT-4o または Mistral",
  "理由": "決定の理由を2〜3行で"
}
\`\`\``;

  const roleDecision = await callClaude(
    'あなたはAIチームのリーダーです。各メンバーの提案を公平に評価し、3つの異なる役割に割り当ててください。1人のAIが複数役割を担当することはできません。',
    decisionUser
  );
  logAI('🔵', 'Claude（役割決定）', C.blue, roleDecision);

  const roles = parseRoles(roleDecision);

  console.log(`\n${C.bold}${C.magenta}${'═'.repeat(62)}${C.reset}`);
  console.log(`${C.bold}${C.magenta}  決定した役割分担${C.reset}`);
  console.log(`${C.bold}${C.magenta}${'═'.repeat(62)}${C.reset}`);
  logRole('設計担当',   `${getAIMeta(roles.design).emoji}   ${roles.design}`);
  logRole('実装担当',   `${getAIMeta(roles.implement).emoji} ${roles.implement}`);
  logRole('レビュー担当', `${getAIMeta(roles.review).emoji}  ${roles.review}`);
  console.log(`${C.bold}${C.magenta}${'═'.repeat(62)}${C.reset}\n`);

  // ────────────────────────────────────────────────────
  // Step 2: 設計担当AIが新機能を提案
  // ────────────────────────────────────────────────────
  const designMeta = getAIMeta(roles.design);
  logSys(`Step 2 / ${designMeta.emoji} ${roles.design}（設計）が新機能を提案中...`);

  const featureUser = `${CODEBASE_PREFIX}あなたはこのBULLET-SPORTSDAYアプリの「設計担当」です。

既存の技術スタック・コードスタイルを踏まえて、追加すべき新機能を1つ提案してください。

条件：
- PHP / React / SQLite の既存構成に合わせること
- 運動会管理に実際に役立つ機能であること
- 1〜2ファイル程度で実装できる規模であること

出力：
1. 機能名
2. 概要（2〜3行）
3. PHPエンドポイントの設計（URL・メソッド・レスポンス形式）
4. Reactコンポーネントの設計（状態・UIの構成）
5. SQLiteのテーブル定義（CREATE TABLE文）`;

  const featureProposal = await getAICaller(roles.design)(
    `あなたは${roles.design}です。BULLET-SPORTSDAYの設計担当として、既存コードを分析し最適な新機能を提案します。`,
    featureUser
  );
  logAI(designMeta.emoji, `${roles.design}（設計）`, designMeta.color, featureProposal);

  // 機能名を抽出
  const nameMatch = featureProposal.match(/機能名[：:]\s*([^\n]+)/)
    ?? featureProposal.match(/^#+\s*(.+)/m)
    ?? featureProposal.match(/^1[.．]\s*(.+)/m);
  const featureName = nameMatch ? nameMatch[1].replace(/[*`]/g, '').trim() : '新機能';
  logInfo(`機能名: ${featureName}`);

  // ────────────────────────────────────────────────────
  // Step 3 & 4: 実装 + レビューループ（最大3回）
  // ────────────────────────────────────────────────────
  const implMeta   = getAIMeta(roles.implement);
  const reviewMeta = getAIMeta(roles.review);

  let currentImpl = null;
  let lastReview  = null;
  let approved    = false;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {

    // ──────────────────────────────────────
    // Step 3: 実装 or 修正
    // ──────────────────────────────────────
    const isRevision = loop > 1;
    logSys(`Step 3 / ${implMeta.emoji} ${roles.implement}（実装）が${isRevision ? '修正' : '実装'}中... (${loop}/${MAX_LOOPS})`);

    const implUser = isRevision
      ? `${CODEBASE_PREFIX}【設計提案】
${featureProposal}

【レビューでの指摘事項】
${lastReview}

【修正前の実装コード】
${currentImpl}

上記の指摘を全て修正してください。
出力は以下の形式で、PHPファイルとReactコンポーネントを必ず両方出力してください：

// FILE: [フォルダ名]/api.php
\`\`\`php
[PHPコード]
\`\`\`

// FILE: app/src/[ComponentName].jsx
\`\`\`jsx
[Reactコード]
\`\`\``
      : `${CODEBASE_PREFIX}【設計提案】
${featureProposal}

あなたは「実装担当」として、上記の設計に基づいてコードを実装してください。

実装要件：
- 既存PHPファイル（members/api.php、qna/api.php等）と同じスタイルで書くこと
- SQLiteはPDOを使用（既存のdb.phpパターンに合わせる）
- Reactは既存のApp.jsxと同じスタイル（useState・useEffect・fetch API）
- XSS対策・SQLインジェクション対策を徹底すること
- Azure AD認証チェックを忘れずに入れること

出力は以下の形式で、PHPファイルとReactコンポーネントを必ず両方出力してください：

// FILE: [フォルダ名]/api.php
\`\`\`php
[PHPコード]
\`\`\`

// FILE: app/src/[ComponentName].jsx
\`\`\`jsx
[Reactコード]
\`\`\``;

    const implResult = await getAICaller(roles.implement)(
      `あなたは${roles.implement}です。BULLET-SPORTSDAYの実装担当として、既存コードのスタイルに完全に合わせて実装します。`,
      implUser
    );
    currentImpl = implResult;

    logAI(
      implMeta.emoji,
      `${roles.implement}（実装）`,
      implMeta.color,
      isRevision
        ? `修正完了。(${implResult.length}文字)`
        : `実装完了。(${implResult.length}文字)\n\n${implResult.slice(0, 350)}...`
    );

    // ──────────────────────────────────────
    // Step 4: レビュー
    // ──────────────────────────────────────
    logSys(`Step 4 / ${reviewMeta.emoji} ${roles.review}（レビュー）がチェック中... (${loop}/${MAX_LOOPS})`);

    const reviewUser = `${CODEBASE_PREFIX}【設計提案】
${featureProposal}

【レビュー対象の実装コード】
${currentImpl}

あなたは「レビュー担当」として上記コードをチェックしてください（${loop}/${MAX_LOOPS}回目）。

チェック観点：
- 既存コードとのスタイル整合性（命名規則・ファイル構造・PHPのPDO使用方法）
- セキュリティ（SQLインジェクション・XSS・Azure AD認証チェック漏れ）
- SQLiteとの互換性（クエリ・型・トランザクション処理）
- Reactコンポーネントの品質（App.jsxの既存パターンとの整合性）
- バグ・エッジケース・入力バリデーション

1行目に「OK」（問題なし）または「NG」（問題あり）のみ記載。
NGの場合は問題点と改善案を箇条書きで記載してください。`;

    const review = await getAICaller(roles.review)(
      `あなたは${roles.review}です。BULLET-SPORTSDAYのレビュー担当として、セキュリティ・整合性・品質を厳格にチェックします。`,
      reviewUser
    );
    logAI(reviewMeta.emoji, `${roles.review}（レビュー）`, reviewMeta.color, review);

    if (isOK(review)) {
      console.log(`\n${C.green}${C.bold}✅ レビュー承認！ (${loop}/${MAX_LOOPS} ループ目)${C.reset}`);
      approved = true;
      break;
    }

    lastReview = review;
    if (loop < MAX_LOOPS) {
      console.log(`\n${C.yellow}🔄 NG判定。修正ループ ${loop + 1}/${MAX_LOOPS} を開始します...${C.reset}`);
    } else {
      console.log(`\n${C.yellow}⚠️  最大ループ数 (${MAX_LOOPS}) に到達。最終版を保存します。${C.reset}`);
    }
  }

  // ────────────────────────────────────────────────────
  // Step 5: ファイル保存 & git push
  // ────────────────────────────────────────────────────
  logSys('Step 5 / ファイルを保存して git push 中...');

  const extracted = extractFilesFromImpl(currentImpl);
  const allFiles  = [...extracted.php, ...extracted.jsx];

  saveAndCommit(allFiles, featureName);

  const savedPaths = allFiles.map(f => f.relPath).filter(Boolean);
  console.log(`
${C.bold}${C.green}🎉 新機能「${featureName}」の実装が完了しました！${C.reset}

  ✅ 承認状態: ${approved
    ? `${C.green}${C.bold}承認済み${C.reset}`
    : `${C.yellow}未承認（最終版）${C.reset}`}
  📂 保存ファイル: ${savedPaths.length > 0 ? savedPaths.join(', ') : '（パス特定できず）'}
  🔁 GitHub Actions の AI Review が自動起動します
  📋 役割: 設計=${roles.design} / 実装=${roles.implement} / レビュー=${roles.review}
`);
}

main().catch(err => {
  console.error(`\n${C.red}${C.bold}❌ エラーが発生しました:${C.reset}`);
  console.error(`${C.red}${err.message}${C.reset}`);
  process.exit(1);
});
