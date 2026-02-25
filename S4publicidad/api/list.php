<?php
declare(strict_types=1);

require_once __DIR__ . '/../_admin_bootstrap.php';
require_once __DIR__ . '/../lib/supabase_server.php';

header('Content-Type: application/json; charset=utf-8');

$res = sb_publicidad_list();

if (!$res['ok']) {
    http_response_code($res['http'] ?: 500);
    echo json_encode([
        'error' => 'Error leyendo publicidad',
        'details' => $res['body'],
    ]);
    exit;
}

// PostgREST ya devuelve JSON array.
echo (string)$res['body'];
