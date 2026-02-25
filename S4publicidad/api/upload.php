<?php
declare(strict_types=1);

require_once __DIR__ . '/../_admin_bootstrap.php';
require_once __DIR__ . '/../lib/supabase_server.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * Detecta MIME de forma robusta.
 * - Preferimos finfo (ext-fileinfo)
 * - Fallback a mime_content_type
 * - Fallback firma WebP (RIFF....WEBP)
 */
function lf_detect_mime(string $tmp, string $originalName = ''): string {
    $mime = '';

    // 1) finfo (si existe)
    if (function_exists('finfo_open')) {
        $finfo = @finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $m = @finfo_file($finfo, $tmp);
            if (is_string($m)) $mime = $m;
            @finfo_close($finfo);
        }
    }

    // 2) mime_content_type (si existe)
    if (!$mime && function_exists('mime_content_type')) {
        $m = @mime_content_type($tmp);
        if (is_string($m)) $mime = $m;
    }

    // 3) Firma WebP
    if (!$mime) {
        $fh = @fopen($tmp, 'rb');
        if ($fh) {
            $hdr = @fread($fh, 12);
            @fclose($fh);
            if (is_string($hdr) && strlen($hdr) === 12) {
                if (substr($hdr, 0, 4) === 'RIFF' && substr($hdr, 8, 4) === 'WEBP') {
                    $mime = 'image/webp';
                }
            }
        }
    }

    // 4) Último recurso: extensión (solo para webp)
    if (!$mime && $originalName) {
        $lower = strtolower($originalName);
        $needle = '.webp';
        $endsWith = (strlen($lower) >= strlen($needle)) && (substr($lower, -strlen($needle)) === $needle);
        if ($endsWith) $mime = 'image/webp';
    }

    return $mime;
}

// CSRF viene en multipart
lf_require_csrf();

if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta archivo']);
    exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_UNKNOWN) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Error subiendo archivo', 'code' => (int)($file['error'] ?? -1)]);
    exit;
}

$tmp = (string)($file['tmp_name'] ?? '');
$name = (string)($file['name'] ?? '');

if (!$tmp || !file_exists($tmp) || (!is_uploaded_file($tmp) && PHP_SAPI !== 'cli')) {
    http_response_code(400);
    echo json_encode(['error' => 'Archivo temporal inválido o no disponible', 'tmp' => $tmp]);
    exit;
}

// Validar tipo
$mime = lf_detect_mime($tmp, $name);

$allowed = [
    // Alineado al bucket (configurado para permitir solo image/webp)
    'image/webp' => 'webp',
];

if (!isset($allowed[$mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de imagen no permitido', 'mime' => $mime]);
    exit;
}

$ext = $allowed[$mime];
$colocacion = preg_replace('/[^a-z_]/', '', (string)($_POST['colocacion'] ?? 'patrocinadores')) ?: 'patrocinadores';

// Nombre único (guardamos en una carpeta neutra para evitar falsos positivos de ad-blockers)
$rand = bin2hex(random_bytes(8));
$path = 'img/' . date('Ymd') . '_' . $rand . '.' . $ext;

$cfg = sb_cfg();
$bucket = $cfg['bucket'];

$res = sb_storage_upload($bucket, $path, $tmp, $mime);

if (!$res['ok']) {
    http_response_code($res['http'] ?: 500);
    echo json_encode([
        'error' => 'Error subiendo a Supabase Storage',
        'http' => $res['http'] ?? null,
        'details' => $res['body'] ?? null,
        'curl_error' => $res['error'] ?? null,
        'url' => $res['url'] ?? null,
    ]);
    exit;
}

$publicUrl = rtrim($cfg['url'], '/') . '/storage/v1/object/public/' . rawurlencode($bucket) . '/' . str_replace('%2F','/', rawurlencode($path));

echo json_encode([
    'ok' => true,
    'bucket' => $bucket,
    'path' => $path,
    'public_url' => $publicUrl,
    'original_name' => $name,
    'mime' => $mime,
]);
