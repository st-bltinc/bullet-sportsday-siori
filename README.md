# BULLET-SPORTSDAY

運動会管理アプリ

## 構成

| フォルダ | 役割 |
|---|---|
| `app/` | React フロントエンド（Vite） |
| `album/` | アルバム機能（PHP） |
| `attendance/` | 出欠管理（PHP） |
| `chat/` | チャット機能（PHP） |
| `checklist/` | チェックリスト（PHP） |
| `login/` | 認証（PHP） |
| `map/` | マップ（PHP） |
| `members/` | メンバー管理（PHP） |
| `qna/` | Q&A（PHP） |
| `vote/` | 投票（PHP） |

---

## AI Ops CI/CD — 自動コードレビュー

PRを作成・更新すると **Claude / GPT-4o / Gemini** の3つのAIが並列でコードレビューを行い、結果をPRコメントに自動投稿します。

### レビュー観点

| AI | 観点 |
|---|---|
| 🔵 Claude | 設計・コード品質・保守性 |
| 🟢 GPT-4o | バグ・実装ミス・ロジック |
| 🔴 Gemini | セキュリティ・脆弱性・SQLインジェクション |

### GitHub Secrets の設定

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** から以下を登録してください。

| Secret名 | 値 | 取得先 |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [Anthropic Console](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | `sk-...` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `GEMINI_API_KEY` | `AIza...` | [Google AI Studio](https://aistudio.google.com/apikey) |

> `GITHUB_TOKEN` はGitHub Actionsが自動で提供するため、登録不要です。

### 仕様

- 差分が 5,000 文字を超える場合は先頭を切り詰めて送信
- エラーが発生したAPIはスキップし、残りの結果のみ投稿
- 同一PRへの2回目以降の実行はコメントを上書き更新
# テスト
