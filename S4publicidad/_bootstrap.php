<?php
declare(strict_types=1);

// Base path dinámico (por defecto /S4publicidad). Si renombras la carpeta, se ajusta.
if (!defined('LF_ADMIN_BASE_PATH')) {
    define('LF_ADMIN_BASE_PATH', '/' . basename(__DIR__));
}

require_once __DIR__ . '/lib/admin_guard.php';

lf_session_start();

// Versión basada en assets del módulo
$APP_VER = lf_app_version(__DIR__);
$csrf_token = lf_csrf_token();
