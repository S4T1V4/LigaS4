<?php
declare(strict_types=1);

require __DIR__ . '/shared/admin_guard.php';

lf_session_start();

if (lf_is_admin()) {
    lf_redirect(lf_admin_base() . '/');
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    lf_require_csrf();

    $pass = (string)($_POST['password'] ?? '');
    if (lf_login($pass)) {
        lf_redirect(lf_admin_base() . '/');
    } else {
        $error = 'Contraseña incorrecta.';
    }
}

$csrf = lf_csrf_token();
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f6f7f9">
  <title>Admin · Liga Guty</title>

  <!--
    Nota: rutas RELATIVAS para que funcione igual si este proyecto vive en:
      - /admin (carpeta)
      - un subdominio (document root)
  -->
  <link rel="stylesheet" href="assets/css/app.css?v=<?php echo (int)lf_app_version(__DIR__); ?>">
  <style>
    .login-wrap{max-width:420px;margin:48px auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.08)}
    .login-wrap h1{margin:0 0 6px}
    .login-wrap p{margin:0 0 18px;opacity:.75}
    .login-wrap .row{display:flex;gap:10px;align-items:center}
    .login-wrap input{flex:1}
    .error-chip{margin-top:12px}
    .mini{font-size:.9em;opacity:.7;margin-top:14px}
    code{background:#f1f2f4;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body class="is-public">
  <div class="container">
    <div class="login-wrap">
      <h1>🔐 Panel Admin</h1>
      <p>Solo gente con poderes… y con contraseña.</p>

      <form method="post" autocomplete="off">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="row">
            <input id="password" name="password" type="password" placeholder="Tu contraseña" required>
            <button class="btn-primary" type="submit">Entrar</button>
          </div>
        </div>

        <?php if ($error): ?>
          <div class="error-chip">⚠️ <?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
        <?php endif; ?>
      </form>

      <div class="mini">
        Tip: cambia la contraseña en <code>config.php</code> (campo <code>admin_password_hash</code>).
      </div>
    </div>
  </div>
</body>
</html>
