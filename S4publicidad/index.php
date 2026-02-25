<?php
declare(strict_types=1);

require_once __DIR__ . '/_admin_bootstrap.php';

$cfg = lf_config();
$supabase_url = (string)($cfg['supabase_url'] ?? '');
$bucket = (string)($cfg['supabase_publicidad_bucket'] ?? 'media');

?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>S4Publicidad</title>
  <link rel="stylesheet" href="<?= htmlspecialchars(lf_admin_base(), ENT_QUOTES, 'UTF-8') ?>/assets/css/s4publicidad.css?v=<?= (int)$APP_VER ?>">
</head>
<body>
  <header class="s4-top">
    <div class="s4-top__brand">
      <div class="s4-badge">S4</div>
      <div>
        <div class="s4-title">S4Publicidad</div>
        <div class="s4-sub">Administra anuncios por colocación: patrocinador, banner, patrocinadores, promos.</div>
      </div>
    </div>
    <div class="s4-top__actions">
      <button class="btn btn-ghost" id="btnReload" type="button">Recargar</button>
      <a class="btn btn-ghost" href="<?= htmlspecialchars(lf_admin_base() . '/logout.php', ENT_QUOTES, 'UTF-8') ?>">Salir</a>
    </div>
  </header>

  <main class="s4-wrap">
    <div class="s4-layout">
      <!-- Editor (desktop: panel izquierdo · mobile: modal) -->
      <aside id="editorOverlay" aria-hidden="false">
        <div class="s4-editor__backdrop" data-close="1" aria-hidden="true"></div>

        <section class="card s4-editorCard" role="dialog" aria-modal="true">
          <div class="card__head">
            <div>
              <h2 id="formTitle">Nuevo anuncio</h2>
              <p class="muted" id="formHint">Sube una imagen (JPG/PNG/WebP). El panel la comprime y la convierte a <b>WEBP</b> automáticamente.</p>
            </div>
            <div class="card__headActions">
              <button class="btn btn-ghost" id="btnNew" type="button">Nuevo</button>
              <button class="icon-btn s4-close" id="btnCloseEditor" type="button" aria-label="Cerrar">✕</button>
            </div>
          </div>

          <form id="frm" class="form">
        <input type="hidden" name="id" id="f_id" value="">
        <input type="hidden" name="csrf" id="f_csrf" value="<?= htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8') ?>">

        <div class="grid">
          <label>
            Colocación
            <select name="colocacion" id="f_colocacion" required>
              <option value="patrocinador">Patrocinador (Hero)</option>
              <option value="banner">Banner</option>
              <option value="patrocinadores" selected>Patrocinadores (lista)</option>
              <option value="promos">Promos (spotlight)</option>
            </select>
          </label>

          <label>
            Activo
            <select name="activo" id="f_activo">
              <option value="true" selected>Sí</option>
              <option value="false">No</option>
            </select>
          </label>

          <label class="span-2">
            Título
            <input type="text" name="titulo" id="f_titulo" maxlength="180" required>
          </label>

          <label class="span-2">
            Descripción
            <textarea name="descripcion" id="f_descripcion" rows="3" maxlength="500"></textarea>
          </label>

          <label>
            CTA (texto)
            <input type="text" name="cta_text" id="f_cta_text" maxlength="60" placeholder="Ver promo">
          </label>

          <label>
            CTA (URL)
            <input type="url" name="cta_url" id="f_cta_url" maxlength="500" placeholder="https://...">
          </label>

          <label>
            Inicio (YYYY/MM/DD)
            <div class="s4-dateRow">
              <input type="text" id="f_start_text" placeholder="YYYY/MM/DD" autocomplete="off" inputmode="numeric">
              <button class="icon-btn" id="btnPickStart" type="button" aria-label="Elegir fecha de inicio">📅</button>
            </div>
            <input type="date" id="f_start" class="s4-srOnly" tabindex="-1" aria-hidden="true">
          </label>

          <label>
            Fin (YYYY/MM/DD)
            <div class="s4-dateRow">
              <input type="text" id="f_end_text" placeholder="YYYY/MM/DD" autocomplete="off" inputmode="numeric">
              <button class="icon-btn" id="btnPickEnd" type="button" aria-label="Elegir fecha de fin">📅</button>
            </div>
            <input type="date" id="f_end" class="s4-srOnly" tabindex="-1" aria-hidden="true">
          </label>

          <label class="span-2">
            Imagen
            <input type="file" id="f_file" accept="image/*">
            <div class="s4-uploadRow">
              <div class="s4-preview" id="imgPreview"></div>
              <div class="s4-fileInfo" id="fileInfo">
                <div class="muted">Tip: para banner/hero recomendado ~1200×450.</div>
              </div>
            </div>
          </label>
        </div>

        <div class="s4-actions">
          <button type="button" class="btn btn-danger" id="btnDelete" style="display:none;">Eliminar</button>
          <div class="s4-actions__right">
            <button type="button" class="btn btn-ghost" id="btnCancel" style="display:none;">Cancelar</button>
            <button type="submit" class="btn" id="btnSave">Guardar</button>
          </div>
        </div>

        <div class="alert" id="formError" style="display:none;"></div>
      </form>

        </section>
      </aside>

      <!-- Listado (derecha) -->
      <section class="s4-left">
        <section class="s4-toolbar">
          <div class="s4-filters">
            <label>
              Colocación
              <select id="filterPlacement">
                <option value="">Todas</option>
                <option value="patrocinador">Patrocinador (Hero)</option>
                <option value="banner">Banner</option>
                <option value="patrocinadores">Patrocinadores (lista)</option>
                <option value="promos">Promos (spotlight)</option>
              </select>
            </label>
            <label class="chk">
              <input type="checkbox" id="filterActive" checked>
              Solo activos
            </label>
          </div>
          <div class="muted" id="listHint"></div>
        </section>

        <section class="s4-grid" id="adsList"></section>
      </section>
    </div>

    <!-- FAB (solo móvil) -->
    <button class="s4-fab" id="btnFabNew" type="button" aria-label="Nuevo anuncio">＋</button>
  </main>

    <!-- Visor de imagen (lightbox) -->
    <div class="s4-viewer" id="imgViewer" aria-hidden="true">
      <div class="s4-viewer__backdrop" data-close-viewer="1" aria-hidden="true"></div>
      <div class="s4-viewer__panel" role="dialog" aria-modal="true">
        <button class="icon-btn s4-viewer__close" type="button" data-close-viewer="1" aria-label="Cerrar">✕</button>
        <img id="imgViewerImg" alt="Vista de imagen">
      </div>
    </div>

  <script>
    window.__S4PUB__ = {
      base: "<?= htmlspecialchars(lf_admin_base(), ENT_QUOTES, 'UTF-8') ?>",
      csrf: "<?= htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8') ?>",
      supabaseUrl: "<?= htmlspecialchars($supabase_url, ENT_QUOTES, 'UTF-8') ?>",
      bucket: "<?= htmlspecialchars($bucket, ENT_QUOTES, 'UTF-8') ?>"
    };
  </script>
  <script src="<?= htmlspecialchars(lf_admin_base(), ENT_QUOTES, 'UTF-8') ?>/assets/js/s4publicidad_admin.js?v=<?= (int)$APP_VER ?>"></script>
</body>
</html>
