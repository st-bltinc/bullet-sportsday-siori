<?php
/**
 * common/functions.php
 * ─────────────────────────────────────────────────────────────
 * アプリ全体で使うユーティリティ関数をまとめています。
 * ─────────────────────────────────────────────────────────────
 */

/**
 * JSON形式でレスポンスを返して処理を終了する
 *
 * @param mixed $data        返すデータ (配列やオブジェクト)
 * @param int   $status_code HTTPステータスコード (200, 400, 401 など)
 */
function json_response(mixed $data, int $status_code = 200): void
{
    http_response_code($status_code);
    header('Content-Type: application/json; charset=UTF-8');

    // CORS: Vite開発サーバー(localhost:5173)からのリクエストを許可
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ['http://localhost:5173', 'http://localhost:3000'], true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    }

    // OPTIONSメソッド (プリフライトリクエスト) はここで終了
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * MicrosoftのOAuth認可エンドポイントへのURLを生成する
 *
 * @param string $state CSRF対策のランダム文字列
 */
function build_auth_url(string $state): string
{
    $params = http_build_query([
        'client_id'     => AZURE_CLIENT_ID,
        'response_type' => 'code',
        'redirect_uri'  => AZURE_REDIRECT_URI,
        'scope'         => AZURE_SCOPES,
        'response_mode' => 'query',
        'state'         => $state,
    ]);

    return sprintf(
        'https://login.microsoftonline.com/%s/oauth2/v2.0/authorize?%s',
        AZURE_TENANT_ID,
        $params
    );
}

/**
 * MicrosoftのトークンエンドポイントへPOSTリクエストを送り、
 * アクセストークン・IDトークンなどを取得する
 *
 * Composerなしで外部HTTPリクエストを送るため file_get_contents を使用
 *
 * @param string $code 認証コード (callbackで受け取ったGETパラメータ)
 * @return array トークンレスポンスの連想配列
 */
function fetch_tokens(string $code): array
{
    $token_url = sprintf(
        'https://login.microsoftonline.com/%s/oauth2/v2.0/token',
        AZURE_TENANT_ID
    );

    $post_body = http_build_query([
        'client_id'     => AZURE_CLIENT_ID,
        'client_secret' => AZURE_CLIENT_SECRET,
        'code'          => $code,
        'redirect_uri'  => AZURE_REDIRECT_URI,
        'grant_type'    => 'authorization_code',
    ]);

    // stream_context_create でHTTPSのPOSTリクエストを構築
    $context = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => $post_body,
            'ignore_errors' => true, // エラー時もレスポンスボディを読む
        ],
        'ssl' => [
            'verify_peer'      => true,
            'verify_peer_name' => true,
        ],
    ]);

    $response = file_get_contents($token_url, false, $context);

    if ($response === false) {
        throw new RuntimeException('Microsoftトークンエンドポイントへの接続に失敗しました');
    }

    $data = json_decode($response, true);

    if (isset($data['error'])) {
        throw new RuntimeException('トークン取得エラー: ' . ($data['error_description'] ?? $data['error']));
    }

    return $data;
}

/**
 * JWTのペイロード部分をデコードしてユーザー情報を取得する
 *
 * ⚠️ 注意: 署名検証は行っていません。
 *   Microsoft の HTTPS エンドポイントから直接取得したトークンのため
 *   通信経路は保護されていますが、本格的な本番環境では
 *   Microsoft の公開鍵 (JWKS) を使った署名検証を推奨します。
 *
 * @param string $id_token MicrosoftのIDトークン (JWT形式)
 * @return array ユーザークレーム (oid, name, email 等)
 */
function decode_id_token(string $id_token): array
{
    $parts = explode('.', $id_token);

    if (count($parts) !== 3) {
        throw new RuntimeException('IDトークンの形式が不正です');
    }

    // JWTのペイロード部分はBase64URL形式でエンコードされている
    // Base64URL → Base64 に変換してデコード
    $payload_b64 = strtr($parts[1], '-_', '+/');
    // パディング補完
    $payload_b64 = str_pad($payload_b64, strlen($payload_b64) + (4 - strlen($payload_b64) % 4) % 4, '=');

    $payload = base64_decode($payload_b64);

    if ($payload === false) {
        throw new RuntimeException('IDトークンのデコードに失敗しました');
    }

    $claims = json_decode($payload, true);

    if (!$claims) {
        throw new RuntimeException('IDトークンのJSONパースに失敗しました');
    }

    return $claims;
}

/**
 * CSRF対策用のランダムなstate文字列を生成する
 */
function generate_state(): string
{
    return bin2hex(random_bytes(16));
}
