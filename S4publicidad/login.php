<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

if (lf_is_admin()) {
    lf_redirect(lf_admin_base() . '/');
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // CSRF simple
    $token = (string)($_POST['csrf'] ?? '');
    $sess  = (string)($_SESSION['csrf'] ?? '');
    if (!$token || !$sess || !hash_equals($sess, $token)) {
        $error = 'CSRF inválido.';
    } else {
        $pass = (string)($_POST['password'] ?? '');
        if ($pass === '') {
            $error = 'Escribe la contraseña.';
        } else if (lf_login($pass)) {
            lf_redirect(lf_admin_base() . '/');
        } else {
            $error = 'Contraseña incorrecta.';
        }
    }
}

?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>S4Publicidad · Acceso</title>
  <link rel="stylesheet" href="<?= htmlspecialchars(lf_admin_base(), ENT_QUOTES, 'UTF-8') ?>/assets/css/s4publicidad.css?v=<?= (int)$APP_VER ?>">
</head>
<body>
  <div class="adm-shell">
    <div class="adm-card">
      <div class="adm-brand">
        <div class="adm-logo">S4</div>
        <div>
          <h1>S4Publicidad</h1>
          <p>Administra banners, promos y patrocinadores.</p>
        </div>
      </div>

      <?php if ($error): ?>
        <div class="adm-alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <form method="post" class="adm-form">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8') ?>">
        <label>Contraseña</label>
        <input type="password" name="password" autocomplete="current-password" required>
        <button type="submit">Entrar</button>
      </form>

      <div class="adm-foot">Tip: cambia el hash en <code>config.php</code>.</div>
    </div>
  </div>
</body>
</html>
