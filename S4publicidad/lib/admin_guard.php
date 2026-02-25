<?php
declare(strict_types=1);

require_once __DIR__ . '/app_version.php';

/**
 * Config del módulo.
 * - Primero busca /S4publicidad/config.php
 * - Si no existe, usa /S4publicidad/config.sample.php
 * - Fallback: busca en raíz (opcional, para no romper instalaciones antiguas)
 */
function lf_config(): array {
    $moduleDir = dirname(__DIR__);

    $configFile = $moduleDir . '/config.php';
    $sampleFile = $moduleDir . '/config.sample.php';

    $rootConfig = dirname($moduleDir) . '/config.php';
    $rootSample = dirname($moduleDir) . '/config.sample.php';

    if (is_file($configFile)) {
        $cfg = require $configFile;
    } elseif (is_file($sampleFile)) {
        $cfg = require $sampleFile;
    } elseif (is_file($rootConfig)) {
        // Fallback para proyectos que aún no creen config dentro del módulo
        $cfg = require $rootConfig;
    } elseif (is_file($rootSample)) {
        $cfg = require $rootSample;
    } else {
        $cfg = [];
    }

    if (!is_array($cfg)) $cfg = [];

    // Defaults seguros del módulo
    $defaultBase = defined('LF_ADMIN_BASE_PATH') ? (string)LF_ADMIN_BASE_PATH : '/' . basename($moduleDir);

    $cfg['admin_base_path'] = (string)($cfg['admin_base_path'] ?? $defaultBase);
    $cfg['session_name'] = (string)($cfg['session_name'] ?? 's4publicidad_admin');
    $cfg['admin_password_hash'] = (string)($cfg['admin_password_hash'] ?? '');

    // Defaults Supabase
    $cfg['supabase_url'] = (string)($cfg['supabase_url'] ?? '');
    $cfg['supabase_service_role_key'] = (string)($cfg['supabase_service_role_key'] ?? '');
    $cfg['supabase_publicidad_bucket'] = (string)($cfg['supabase_publicidad_bucket'] ?? 'media');
    $cfg['supabase_publicidad_table'] = (string)($cfg['supabase_publicidad_table'] ?? 'publicidad');

    return $cfg;
}

function lf_session_start(): void {
    $cfg = lf_config();

    if (session_status() === PHP_SESSION_ACTIVE) return;

    if (!headers_sent()) {
        session_name($cfg['session_name']);

        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        $path = rtrim((string)$cfg['admin_base_path'], '/');
        $path = $path === '' ? '/' : ($path . '/');

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => $path,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    session_start();

    if (empty($_SESSION['__inited'])) {
        session_regenerate_id(true);
        $_SESSION['__inited'] = 1;
    }
}

function lf_csrf_token(): string {
    lf_session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return (string)$_SESSION['csrf'];
}

function lf_require_csrf(): void {
    lf_session_start();
    $token = (string)($_POST['csrf'] ?? '');
    $sess  = (string)($_SESSION['csrf'] ?? '');
    if (!$token || !$sess || !hash_equals($sess, $token)) {
        http_response_code(400);
        echo 'CSRF inválido.';
        exit;
    }
}

function lf_is_admin(): bool {
    lf_session_start();
    return !empty($_SESSION['is_admin']);
}

function lf_login(string $password): bool {
    lf_session_start();
    $cfg = lf_config();
    $hash = (string)$cfg['admin_password_hash'];

    if ($hash === '') return false;

    if (password_verify($password, $hash)) {
        $_SESSION['is_admin'] = true;
        session_regenerate_id(true);
        return true;
    }

    $_SESSION['is_admin'] = false;
    return false;
}

function lf_logout(): void {
    lf_session_start();
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
    }

    session_destroy();
}

function lf_admin_base(): string {
    $cfg = lf_config();
    return rtrim((string)$cfg['admin_base_path'], '/');
}

function lf_redirect(string $to): void {
    if (!headers_sent()) {
        header('Location: ' . $to);
        exit;
    }
    echo '<meta http-equiv="refresh" content="0;url=' . htmlspecialchars($to, ENT_QUOTES, 'UTF-8') . '">';
    exit;
}

function lf_require_admin(): void {
    if (lf_is_admin()) return;
    lf_redirect(lf_admin_base() . '/login.php');
}
