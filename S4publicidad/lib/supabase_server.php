<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_guard.php';

/**
 * Helpers server-side para Supabase (sin composer).
 * - Usa service_role key SOLO en servidor.
 */

function sb_cfg(): array {
    $cfg = lf_config();
    return [
        'url' => rtrim((string)($cfg['supabase_url'] ?? ''), '/'),
        'service' => trim((string)($cfg['supabase_service_role_key'] ?? '')),
        'bucket' => (string)($cfg['supabase_publicidad_bucket'] ?? 'media'),
        'table' => (string)($cfg['supabase_publicidad_table'] ?? 'publicidad'),
    ];
}

function sb_require_ready(): void {
    $c = sb_cfg();
    if (!$c['url'] || !$c['service']) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => 'Falta configurar supabase_url y/o supabase_service_role_key en config.php',
        ]);
        exit;
    }

    if (!function_exists('curl_init')) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => 'La extensión cURL no está disponible en PHP (curl_init).',
        ]);
        exit;
    }
}

/**
 * Request genérico.
 */
function sb_request(string $method, string $path, ?string $body = null, array $headers = []): array {
    $c = sb_cfg();
    $url = $c['url'] . $path;

    $ch = curl_init($url);
    $baseHeaders = [
        'apikey: ' . $c['service'],
        'Authorization: Bearer ' . $c['service'],
    ];

    $allHeaders = array_merge($baseHeaders, $headers);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $allHeaders,
        CURLOPT_TIMEOUT => 30,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'ok' => ($err === '' && $http >= 200 && $http < 300),
        'http' => $http,
        'error' => $err ?: null,
        'body' => $resp,
        'url' => $url,
    ];
}

/**
 * CRUD de publicidad vía PostgREST.
 */
function sb_publicidad_list(): array {
    sb_require_ready();
    $c = sb_cfg();
    $table = rawurlencode($c['table']);
    $path = '/rest/v1/' . $table . '?select=*'
        . '&order=created_at.desc';
    return sb_request('GET', $path, null, [
        'Accept: application/json',
    ]);
}

function sb_publicidad_create(array $data): array {
    sb_require_ready();
    $c = sb_cfg();
    $table = rawurlencode($c['table']);
    return sb_request('POST', '/rest/v1/' . $table, json_encode($data), [
        'Content-Type: application/json',
        'Accept: application/json',
        'Prefer: return=representation',
    ]);
}

function sb_publicidad_update(string $id, array $data): array {
    sb_require_ready();
    $c = sb_cfg();
    $table = rawurlencode($c['table']);
    $path = '/rest/v1/' . $table . '?id=eq.' . rawurlencode($id);
    return sb_request('PATCH', $path, json_encode($data), [
        'Content-Type: application/json',
        'Accept: application/json',
        'Prefer: return=representation',
    ]);
}

function sb_publicidad_delete(string $id): array {
    sb_require_ready();
    $c = sb_cfg();
    $table = rawurlencode($c['table']);
    $path = '/rest/v1/' . $table . '?id=eq.' . rawurlencode($id);
    return sb_request('DELETE', $path, null, [
        'Accept: application/json',
    ]);
}

/**
 * Sube un archivo a Supabase Storage y regresa la ruta (path) para image_path.
 */
function sb_storage_upload(string $bucket, string $path, string $fileTmp, string $contentType): array {
    sb_require_ready();

    $body = file_get_contents($fileTmp);
    if ($body === false) {
        return [
            'ok' => false,
            'http' => 500,
            'error' => 'No se pudo leer el archivo temporal.',
            'body' => null,
        ];
    }

    $endpoint = '/storage/v1/object/' . rawurlencode($bucket) . '/' . str_replace('%2F', '/', rawurlencode($path));

    return sb_request('POST', $endpoint, $body, [
        'Content-Type: ' . ($contentType ?: 'application/octet-stream'),
        'x-upsert: true',
    ]);
}
