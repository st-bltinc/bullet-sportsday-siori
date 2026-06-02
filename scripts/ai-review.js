#!/usr/bin/env node

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY;

const MAX_DIFF_LENGTH = 5000;
const COMMENT_MARKER = '<!-- ai-review-bot -->';

const GITHUB_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

async function getPRDiff() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.diff',
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub diff取得エラー: ${res.status}`);
  return res.text();
}

function truncateDiff(diff) {
  if (diff.length <= MAX_DIFF_LENGTH) return diff;
  return diff.slice(0, MAX_DIFF_LENGTH) + '\n\n[... 差分が大きいため省略されました ...]';
}

async function reviewWithClaude(diff) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `以下のコード差分を**設計・コード品質・保守性**の観点でレビューしてください。\n問題点と改善案を日本語で箇条書きで簡潔に回答してください。問題がなければ「問題なし」と答えてください。\n\n\`\`\`diff\n${diff}\n\`\`\``,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude APIエラー ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function reviewWithGPT4o(diff) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `以下のコード差分を**バグ・実装ミス・ロジック**の観点でレビューしてください。\n問題点と改善案を日本語で箇条書きで簡潔に回答してください。問題がなければ「問題なし」と答えてください。\n\n\`\`\`diff\n${diff}\n\`\`\``,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GPT-4o APIエラー ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function reviewWithGemini(diff) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `以下のコード差分を**セキュリティ・脆弱性・SQLインジェクション**の観点でレビューしてください。\n問題点と改善案を日本語で箇条書きで簡潔に回答してください。問題がなければ「問題なし」と答えてください。\n\n\`\`\`diff\n${diff}\n\`\`\``,
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini APIエラー ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function getExistingComment() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`,
    { headers: GITHUB_HEADERS }
  );
  if (!res.ok) return null;
  const comments = await res.json();
  return comments.find((c) => c.body.includes(COMMENT_MARKER)) ?? null;
}

async function postOrUpdateComment(body) {
  const existing = await getExistingComment();
  const url = existing
    ? `https://api.github.com/repos/${REPO}/issues/comments/${existing.id}`
    : `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;

  const res = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: GITHUB_HEADERS,
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`コメント投稿エラー ${res.status}: ${text}`);
  }
}

async function main() {
  console.log(`PR #${PR_NUMBER} の差分を取得中...`);
  const rawDiff = await getPRDiff();
  const diff = truncateDiff(rawDiff);

  if (!diff.trim()) {
    console.log('差分がありません。スキップします。');
    return;
  }

  console.log(`差分サイズ: ${rawDiff.length} 文字 (切り詰め後: ${diff.length} 文字)`);
  console.log('Claude / GPT-4o / Gemini に並列レビュー依頼中...');

  const [claudeResult, gptResult, geminiResult] = await Promise.allSettled([
    reviewWithClaude(diff),
    reviewWithGPT4o(diff),
    reviewWithGemini(diff),
  ]);

  const succeeded = [claudeResult, gptResult, geminiResult].some(
    (r) => r.status === 'fulfilled'
  );
  if (!succeeded) {
    console.error('全APIがエラーのためコメントをスキップします。');
    [claudeResult, gptResult, geminiResult].forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(['Claude', 'GPT-4o', 'Gemini'][i], r.reason);
      }
    });
    process.exit(1);
  }

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  let comment = `${COMMENT_MARKER}\n# 🤖 AI トリプルレビュー\n\n`;

  if (claudeResult.status === 'fulfilled') {
    comment += `## 🔵 Claude — 設計・コード品質・保守性\n\n${claudeResult.value}\n\n`;
  } else {
    console.error('Claude エラー:', claudeResult.reason.message);
    comment += `## 🔵 Claude — 設計・コード品質・保守性\n\n> ⚠️ レビュー取得に失敗しました。\n\n`;
  }

  if (gptResult.status === 'fulfilled') {
    comment += `## 🟢 GPT-4o — バグ・実装ミス・ロジック\n\n${gptResult.value}\n\n`;
  } else {
    console.error('GPT-4o エラー:', gptResult.reason.message);
    comment += `## 🟢 GPT-4o — バグ・実装ミス・ロジック\n\n> ⚠️ レビュー取得に失敗しました。\n\n`;
  }

  if (geminiResult.status === 'fulfilled') {
    comment += `## 🔴 Gemini — セキュリティ・脆弱性\n\n${geminiResult.value}\n\n`;
  } else {
    console.error('Gemini エラー:', geminiResult.reason.message);
    comment += `## 🔴 Gemini — セキュリティ・脆弱性\n\n> ⚠️ レビュー取得に失敗しました。\n\n`;
  }

  comment += `---\n*🕐 レビュー実行日時: ${now} JST*`;

  await postOrUpdateComment(comment);
  console.log('✅ PRコメントを投稿しました。');
}

main().catch((err) => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
