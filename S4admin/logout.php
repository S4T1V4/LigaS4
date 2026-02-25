<?php
declare(strict_types=1);

require __DIR__ . '/shared/admin_guard.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    lf_require_csrf();
    lf_logout();
    lf_redirect(lf_admin_base() . '/login.php');
}

$csrf = lf_csrf_token();
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cerrar sesión</title>
  <link rel="stylesheet" href="assets/css/app.css?v=<?php echo (int)lf_app_version(__DIR__); ?>">
</head>
<body class="is-public">
  <div class="container" style="max-width:520px;margin:40px auto;">
    <h2>¿Cerrar sesión?</h2>
    <form method="post">
      <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
      <button class="btn-secondary" type="submit">Sí, salir</button>
      <a class="btn-primary" href="<?php echo htmlspecialchars(lf_admin_base() . '/', ENT_QUOTES, 'UTF-8'); ?>" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 16px;border-radius:12px;margin-left:8px;">Cancelar</a>
    </form>
  </div>
</body>
</html>
