<?php
declare(strict_types=1);

require_once __DIR__ . '/../_admin_bootstrap.php';
require_once __DIR__ . '/../lib/supabase_server.php';

header('Content-Type: application/json; charset=utf-8');

lf_require_csrf();

$id = trim((string)($_POST['id'] ?? ''));
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta id']);
    exit;
}

$payload = [];

foreach (['titulo','descripcion','cta_text','cta_url','image_path','colocacion'] as $f) {
    if (array_key_exists($f, $_POST)) {
        $v = trim((string)$_POST[$f]);
        $payload[$f] = $v === '' ? null : $v;
    }
}

if (array_key_exists('activo', $_POST)) {
    $payload['activo'] = filter_var($_POST['activo'], FILTER_VALIDATE_BOOLEAN);
}
if (array_key_exists('starts_at', $_POST)) {
    $payload['starts_at'] = ($_POST['starts_at'] ?? '') ?: null;
}
if (array_key_exists('ends_at', $_POST)) {
    $payload['ends_at'] = ($_POST['ends_at'] ?? '') ?: null;
}

// Validación mínima
if (isset($payload['titulo']) && $payload['titulo'] === null) {
    http_response_code(400);
    echo json_encode(['error' => 'titulo no puede ser vacío']);
    exit;
}
if (isset($payload['image_path']) && $payload['image_path'] === null) {
    http_response_code(400);
    echo json_encode(['error' => 'image_path no puede ser vacío']);
    exit;
}

$res = sb_publicidad_update($id, $payload);

if (!$res['ok']) {
    http_response_code($res['http'] ?: 500);
    echo json_encode(['error' => 'Error actualizando publicidad', 'details' => $res['body']]);
    exit;
}

echo (string)$res['body'];
