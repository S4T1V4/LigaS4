<?php
declare(strict_types=1);

require_once __DIR__ . '/app_version.php';

function lf_config(): array {
    $configFile = dirname(__DIR__) . '/config.php';
    $sampleFile = dirname(__DIR__) . '/config.sample.php';
    $cfg = is_file($configFile) ? require $configFile : require $sampleFile;

    if (!is_array($cfg)) $cfg = [];
    $cfg['session_name'] = (string)($cfg['session_name'] ?? 'liga_guty_admin');

    // Si el módulo define LF_ADMIN_BASE_PATH, esa ruta gana sobre config.php
    if (defined('LF_ADMIN_BASE_PATH')) {
        $cfg['admin_base_path'] = (string)LF_ADMIN_BASE_PATH;
    } else {
        $cfg['admin_base_path'] = (string)($cfg['admin_base_path'] ?? '/admin');
    }

    $cfg['admin_password_hash'] = (string)($cfg['admin_password_hash'] ?? '');
    return $cfg;
}

function lf_session_start(): void {
    $cfg = lf_config();

    // Evita "session already started"
    if (session_status() === PHP_SESSION_ACTIVE) return;

    if (!headers_sent()) {
        session_name($cfg['session_name']);
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    session_start();

    // Endurecimiento básico
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
    $hash = $cfg['admin_password_hash'];

    if (!$hash) return false;

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
    return rtrim($cfg['admin_base_path'], '/');
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
