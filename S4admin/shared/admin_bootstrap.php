<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_guard.php';

lf_session_start();
lf_require_admin();

$MODE = 'admin';
$is_admin = true;

$APP_VER = lf_app_version(dirname(__DIR__));

$csrf_token = lf_csrf_token();
