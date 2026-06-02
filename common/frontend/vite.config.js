import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite設定ファイル
 *
 * 開発時: React(5173番ポート) → PHP(8000番ポート) へのAPIリクエストをプロキシ
 * これによりCORSを気にせずフロントからPHPのAPIを呼べる
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // /login, /attendance, /api から始まるURLはPHPサーバーへ転送
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/attendance': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // ビルド時の出力先 (PHPサーバーから配信する場合はここをPHPルートに合わせる)
    outDir: 'dist',
  },
})
