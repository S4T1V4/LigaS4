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

$res = sb_publicidad_delete($id);

if (!$res['ok']) {
    http_response_code($res['http'] ?: 500);
    echo json_encode(['error' => 'Error eliminando publicidad', 'details' => $res['body']]);
    exit;
}

echo json_encode(['ok' => true]);
