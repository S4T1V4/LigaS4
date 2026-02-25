<?php
declare(strict_types=1);

require_once __DIR__ . '/app_version.php';

// Detecta base path automático (ej: /LigaPublic)
$BASE_PATH = '';
$script = (string)($_SERVER['SCRIPT_NAME'] ?? '');
$dir = dirname($script);
if ($dir !== '/' && $dir !== '.') {
    $BASE_PATH = rtrim($dir, '/');
}

// Modo espectador (siempre)
$MODE = 'public';
$is_admin = false;

$APP_VER = lf_app_version(dirname(__DIR__));

$csrf_token = '';
