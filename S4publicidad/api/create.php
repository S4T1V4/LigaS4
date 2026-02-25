<?php
declare(strict_types=1);

require_once __DIR__ . '/../_admin_bootstrap.php';
require_once __DIR__ . '/../lib/supabase_server.php';

header('Content-Type: application/json; charset=utf-8');

// CSRF
lf_require_csrf();

$titulo = trim((string)($_POST['titulo'] ?? ''));
$image_path = trim((string)($_POST['image_path'] ?? ''));
$colocacion = trim((string)($_POST['colocacion'] ?? 'patrocinadores'));

if ($titulo === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Falta titulo']);
    exit;
}

if ($image_path === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Falta imagen (image_path)']);
    exit;
}

$payload = [
    'titulo' => $titulo,
    'descripcion' => (string)($_POST['descripcion'] ?? ''),
    'cta_text' => (string)($_POST['cta_text'] ?? ''),
    'cta_url' => (string)($_POST['cta_url'] ?? ''),
    'image_path' => $image_path,
    'activo' => filter_var($_POST['activo'] ?? 'true', FILTER_VALIDATE_BOOLEAN),
    'starts_at' => ($_POST['starts_at'] ?? '') ?: null,
    'ends_at' => ($_POST['ends_at'] ?? '') ?: null,
    'colocacion' => $colocacion,
];

// Limpieza de nulls vacíos
foreach (['descripcion','cta_text','cta_url'] as $k) {
    if ($payload[$k] === '') $payload[$k] = null;
}

$res = sb_publicidad_create($payload);

if (!$res['ok']) {
    http_response_code($res['http'] ?: 500);
    echo json_encode(['error' => 'Error creando publicidad', 'details' => $res['body']]);
    exit;
}

echo (string)$res['body'];
