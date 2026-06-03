# ═══════════════════════════════════════════════════════════════
# Stage 1  node:20-alpine — React アプリを全てビルド
# ═══════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder

# ── メインアプリ (base: /2026/) ──────────────────────────────
WORKDIR /build/app
COPY app/package*.json ./
RUN npm ci --silent
COPY app/ .
RUN npm run build

# ── members (base: /2026/members/) ──────────────────────────
WORKDIR /build/members
COPY members/package*.json ./
RUN npm ci --silent
COPY members/ .
RUN npm run build

# ── checklist (base: /2026/checklist/) ──────────────────────
WORKDIR /build/checklist
COPY checklist/package*.json ./
RUN npm ci --silent
COPY checklist/ .
RUN npm run build

# ── chat (base: /2026/chat/) ─────────────────────────────────
WORKDIR /build/chat
COPY chat/package*.json ./
RUN npm ci --silent
COPY chat/ .
RUN npm run build

# ── game (base: /2026/game/) ─────────────────────────────────
WORKDIR /build/game
COPY game/package*.json ./
RUN npm ci --silent
COPY game/ .
RUN npm run build

# ── map (base: /2026/map/) ───────────────────────────────────
WORKDIR /build/map
COPY map/package*.json ./
RUN npm ci --silent
COPY map/ .
RUN npm run build

# ── vote (base: /2026/vote/) ─────────────────────────────────
WORKDIR /build/vote
COPY vote/package*.json ./
RUN npm ci --silent
COPY vote/ .
RUN npm run build

# ── qna (base: /2026/qna/) ───────────────────────────────────
WORKDIR /build/qna
COPY qna/package*.json ./
RUN npm ci --silent
COPY qna/ .
RUN npm run build

# ── schedule (base: /2026/schedule/) ────────────────────────
WORKDIR /build/schedule
COPY schedule/package*.json ./
RUN npm ci --silent
COPY schedule/ .
RUN npm run build


# ═══════════════════════════════════════════════════════════════
# Stage 2  php:8.2-apache — 本番 Web サーバー
# ═══════════════════════════════════════════════════════════════
FROM php:8.2-apache

# ── PHP 拡張インストール ─────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Apache 設定 ──────────────────────────────────────────────
# mod_rewrite を有効化
RUN a2enmod rewrite

# Render のデフォルトポート 10000 に変更
ENV PORT=10000
EXPOSE 10000

RUN sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:10000>/' \
        /etc/apache2/sites-enabled/000-default.conf

# .htaccess を有効にする（AllowOverride All）
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# ── ファイル配置: /var/www/html/2026/ ───────────────────────
# 既存の Vite base が全て /2026/ 始まりのため、
# サブディレクトリ 2026/ を起点として配置する
WORKDIR /var/www/html/2026

# PHP のみのディレクトリ
COPY album/      ./album/
COPY attendance/ ./attendance/
COPY common/     ./common/
COPY login/      ./login/
COPY mypage/     ./mypage/
COPY notices/    ./notices/
COPY score/      ./score/

# PHP + React 混在ディレクトリ（dist/ は .dockerignore で除外済み）
COPY chat/       ./chat/
COPY checklist/  ./checklist/
COPY members/    ./members/
COPY qna/        ./qna/
COPY vote/       ./vote/

# 静的ファイル
COPY logo-home.png ./

# ── React ビルド済みファイルをコピー ─────────────────────────
# メインアプリ: dist/* → 2026/ のルートに直接展開
# (index.html / assets/ / favicon.svg / icons.svg が /2026/ に並ぶ)
COPY --from=builder /build/app/dist/        ./

# サブアプリ: dist/* → 各サブフォルダのルートに展開
# base が /2026/<name>/ のため assets/ が正しいパスで配信される
COPY --from=builder /build/members/dist/    ./members/
COPY --from=builder /build/checklist/dist/  ./checklist/
COPY --from=builder /build/chat/dist/       ./chat/
COPY --from=builder /build/game/dist/       ./game/
COPY --from=builder /build/map/dist/        ./map/
COPY --from=builder /build/vote/dist/       ./vote/
COPY --from=builder /build/qna/dist/        ./qna/
COPY --from=builder /build/schedule/dist/   ./schedule/

# ── SQLite・セッション・アップロード用ディレクトリ ────────────
# SQLITE_PATH は common/config.php で common/database/ を参照
RUN mkdir -p \
      ./common/database \
      ./common/sessions \
      ./album/uploads

# ── ルーティング設定 ─────────────────────────────────────────
COPY .htaccess ./

# ── パーミッション ───────────────────────────────────────────
RUN chown -R www-data:www-data /var/www/html/2026 \
    && find /var/www/html/2026 -type d -exec chmod 755 {} \; \
    && find /var/www/html/2026 -type f -exec chmod 644 {} \; \
    # SQLite DB・セッション・アップロードは書き込み許可
    && chmod 775 \
        ./common/database \
        ./common/sessions \
        ./album/uploads

CMD ["apache2-foreground"]
