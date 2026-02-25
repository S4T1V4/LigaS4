(() => {
  const CFG = window.__S4PUB__ || {};
  const base = (CFG.base || '/S4publicidad').replace(/\/$/, '');
  const csrf = CFG.csrf || '';
  const supabaseUrl = (CFG.supabaseUrl || '').replace(/\/$/, '');
  const bucket = CFG.bucket || 'media';

  const el = (id) => document.getElementById(id);

  const listEl = el('adsList');
  const listHint = el('listHint');
  const form = el('frm');
  const formTitle = el('formTitle');
  const btnNew = el('btnNew');
  const btnReload = el('btnReload');
  const btnFabNew = el('btnFabNew');
  const btnSave = el('btnSave');
  const btnCancel = el('btnCancel');
  const btnDelete = el('btnDelete');
  const btnCloseEditor = el('btnCloseEditor');
  const formError = el('formError');
  const imgPreview = el('imgPreview');
  const fileInfo = el('fileInfo');

  // Image viewer (lightbox)
  const imgViewer = el('imgViewer');
  const imgViewerImg = el('imgViewerImg');

  // Editor shell (desktop: panel derecho · mobile: modal overlay)
  const editorOverlay = el('editorOverlay');
  const editorBackdrop = editorOverlay?.querySelector?.('[data-close]') || null;
  const mqModal = window.matchMedia ? window.matchMedia('(max-width: 860px)') : null;

  // Form fields
  const f_id = el('f_id');
  const f_colocacion = el('f_colocacion');
  const f_activo = el('f_activo');
  const f_titulo = el('f_titulo');
  const f_descripcion = el('f_descripcion');
  const f_cta_text = el('f_cta_text');
  const f_cta_url = el('f_cta_url');
  const f_start = el('f_start');
  const f_end = el('f_end');
  const f_start_text = el('f_start_text');
  const f_end_text = el('f_end_text');
  const btnPickStart = el('btnPickStart');
  const btnPickEnd = el('btnPickEnd');
  const f_file = el('f_file');

  // Filters
  const filterPlacement = el('filterPlacement');
  const filterActive = el('filterActive');

  let allAds = [];
  let editing = null;

  function useModal() {
    return !!mqModal?.matches;
  }

  function openEditor() {
    if (!editorOverlay) return;
    if (!useModal()) {
      editorOverlay.classList.remove('is-open');
      editorOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.remove('s4-noScroll');
      return;
    }
    editorOverlay.classList.add('is-open');
    editorOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('s4-noScroll');
  }

  function closeEditor() {
    if (!editorOverlay) return;
    if (!useModal()) return; // en desktop el panel vive siempre visible
    editorOverlay.classList.remove('is-open');
    editorOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('s4-noScroll');
  }

  function syncEditorShell() {
    if (!editorOverlay) return;
    if (useModal()) {
      // por defecto, cerrado en móvil
      editorOverlay.classList.remove('is-open');
      editorOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('s4-noScroll');
    } else {
      // visible en desktop
      editorOverlay.classList.remove('is-open');
      editorOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.remove('s4-noScroll');
    }
  }

  // Upload pipeline
  let sourceFile = null;   // original selected file
  let webpFile = null;     // converted file (webp)
  let webpMeta = null;     // {w,h,origSize,webpSize}
  let converting = false;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showError(msg) {
    if (!formError) return;
    formError.style.display = 'block';
    formError.textContent = msg;
  }
  function clearError() {
    if (!formError) return;
    formError.style.display = 'none';
    formError.textContent = '';
  }

  function publicImageUrl(imagePath) {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    if (!supabaseUrl) return imagePath;
    const p = imagePath.split('/').map(encodeURIComponent).join('/');
    return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${p}`;
  }

  function toDateInputValue(iso) {
    if (!iso) return '';
    const s = String(iso);
    // Postgres / ISO strings: keep the first 10 chars (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function dateValueToSlash(v) {
    if (!v) return '';
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${m[1]}/${m[2]}/${m[3]}`;
  }

  function isoToYYYYMMDD(iso) {
    if (!iso) return '';
    const v = toDateInputValue(iso);
    return dateValueToSlash(v);
  }

  function parseSlashToDateValue(txt) {
    const s = String(txt || '').trim();
    if (!s) return '';
    // Accept YYYY/MM/DD or YYYY-MM-DD
    let m = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (!m) return '';
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12) return '';
    const maxD = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    if (d < 1 || d > maxD) return '';
    const mm = String(mo).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  function addMonthsToDateValue(v, delta) {
    if (!v) return '';
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    let y = Number(m[1]);
    let mo = Number(m[2]); // 1-12
    let d = Number(m[3]);

    let targetIndex = (mo - 1) + Number(delta || 0); // 0-based
    let ty = y + Math.floor(targetIndex / 12);
    let tm = ((targetIndex % 12) + 12) % 12; // 0-11
    if (targetIndex < 0 && targetIndex % 12 !== 0) ty -= 1;

    const maxD = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    const td = Math.min(d, maxD);

    const mm = String(tm + 1).padStart(2, '0');
    const dd = String(td).padStart(2, '0');
    return `${ty}-${mm}-${dd}`;
  }

  function toIsoFromDateInputValue(v) {
    if (!v) return '';
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    // Guardar en UTC para evitar corrimientos por zona horaria
    return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0)).toISOString();
  }

  function fmtDateRange(a) {
    const s = isoToYYYYMMDD(a.starts_at);
    const e = isoToYYYYMMDD(a.ends_at);
    if (!s && !e) return '—';
    if (s && e) return `${s} → ${e}`;
    if (s) return `Desde ${s}`;
    return `Hasta ${e}`;
  }

  async function api(path, formData) {
    const res = await fetch(`${base}/api/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
    if (!res.ok) {
      const msg = data?.error || `Error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async function load() {
    if (listEl) listEl.innerHTML = `<div class="muted">Cargando…</div>`;
    const res = await fetch(`${base}/api/list.php`, { credentials: 'same-origin' });
    const txt = await res.text();
    let data = [];
    try { data = txt ? JSON.parse(txt) : []; } catch { data = []; }
    if (!res.ok) {
      if (listEl) listEl.innerHTML = `<div class="muted">Error al cargar. Revisa la consola / API.</div>`;
      return;
    }
    allAds = Array.isArray(data) ? data : [];
    render();
  }

  function render() {
    if (!listEl) return;
    const fp = filterPlacement?.value || '';
    const onlyActive = !!filterActive?.checked;

    let rows = allAds.slice();
    if (fp) rows = rows.filter(a => (a.colocacion || '') === fp);
    if (onlyActive) rows = rows.filter(a => a.activo === true);

    if (listHint) {
      listHint.textContent = `${rows.length} anuncio(s)`;
    }

    if (!rows.length) {
      listEl.innerHTML = `<div class="muted">Sin anuncios.</div>`;
      return;
    }

    listEl.innerHTML = rows.map(a => {
      const img = publicImageUrl(a.image_path);
      const activeCls = a.activo ? 'pill pill--ok' : 'pill pill--no';
      const activeTxt = a.activo ? 'Activo' : 'Inactivo';
      const checked = a.activo ? 'checked' : '';
      const selected = (editing?.id && a.id === editing.id) ? ' is-selected' : '';
      const hasImg = !!img;
      return `
        <article class="ad-card${selected}" data-card="${esc(a.id)}">
          <div class="ad-card__img" ${hasImg ? `data-view="${esc(img)}"` : ''} title="${hasImg ? 'Ver imagen' : ''}">
            ${img ? `<img src="${esc(img)}" alt="">` : `<div class="muted">Sin imagen</div>`}
          </div>
          <div class="ad-card__body">
            <div class="ad-card__top">
              <div class="ad-card__title">${esc(a.titulo)}</div>
              <div class="ad-card__controls">
                <label class="switch" title="Activo">
                  <input type="checkbox" ${checked} data-toggle="${esc(a.id)}" aria-label="Cambiar activo">
                  <span></span>
                </label>
                ${img ? `<button class="icon-btn" data-view="${esc(img)}" type="button" title="Ver imagen" aria-label="Ver imagen">👁</button>` : ''}
                <button class="icon-btn icon-btn--danger" data-del="${esc(a.id)}" type="button" title="Eliminar" aria-label="Eliminar">✕</button>
                <button class="icon-btn" data-edit="${esc(a.id)}" type="button" title="Editar" aria-label="Editar">✎</button>
              </div>
            </div>
            <div class="ad-card__desc">${esc(a.descripcion || '')}</div>
            <div class="ad-card__meta">
              <span class="pill">${esc(a.colocacion)}</span>
              <span class="${activeCls}">${activeTxt}</span>
            </div>
            <div class="ad-card__range">Vigencia: ${esc(fmtDateRange(a))}</div>
          </div>
        </article>
      `;
    }).join('');

    listEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit');
        const ad = allAds.find(x => x.id === id);
        if (ad) startEdit(ad);
      });
    });

    // Toggle activo (sin abrir editar)
    listEl.querySelectorAll('[data-toggle]').forEach(inp => {
      inp.addEventListener('change', async () => {
        const id = inp.getAttribute('data-toggle');
        const next = !!inp.checked;
        inp.disabled = true;
        clearError();
        try {
          const fd = new FormData();
          fd.append('csrf', csrf);
          fd.append('id', id);
          fd.append('activo', String(next));
          await api('update.php', fd);
          // update local cache
          const a = allAds.find(x => x.id === id);
          if (a) a.activo = next;
          if (editing?.id === id) {
            editing.activo = next;
            f_activo.value = next ? 'true' : 'false';
          }
          render();
        } catch (e) {
          // revert UI
          const a = allAds.find(x => x.id === id);
          inp.checked = a?.activo === true;
          showError(`No se pudo actualizar Activo: ${e?.message || 'Error'}`);
        } finally {
          inp.disabled = false;
        }
      });
    });

    // Eliminar directo (desde la tarjeta)
    listEl.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del');
        const ad = allAds.find(x => x.id === id);
        const label = ad?.titulo ? `\n\n${ad.titulo}` : '';
        if (!confirm(`¿Eliminar este anuncio?${label}`)) return;
        btn.disabled = true;
        clearError();
        try {
          const fd = new FormData();
          fd.append('csrf', csrf);
          fd.append('id', id);
          await api('delete.php', fd);
          allAds = allAds.filter(x => x.id !== id);
          if (editing?.id === id) resetForm();
          render();
        } catch (e) {
          showError(`No se pudo eliminar: ${e?.message || 'Error'}`);
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function resetUploadState() {
    sourceFile = null;
    webpFile = null;
    webpMeta = null;
    if (f_file) f_file.value = '';
    if (imgPreview) imgPreview.innerHTML = '';
    if (fileInfo) fileInfo.innerHTML = `<div class="muted">Tip: para banner/hero recomendado ~1200×450.</div>`;
  }

  function resetForm() {
    editing = null;
    clearError();
    formTitle.textContent = 'Nuevo anuncio';
    f_id.value = '';
    f_colocacion.value = 'patrocinadores';
    f_activo.value = 'true';
    f_titulo.value = '';
    f_descripcion.value = '';
    f_cta_text.value = '';
    f_cta_url.value = '';
    f_start.value = '';
    f_end.value = '';
    if (f_start_text) f_start_text.value = '';
    if (f_end_text) f_end_text.value = '';
    resetUploadState();
    btnDelete.style.display = 'none';
    btnCancel.style.display = 'none';
    render();
  }

  function startEdit(ad) {
    editing = ad;
    clearError();
    formTitle.textContent = 'Editar anuncio';
    f_id.value = ad.id || '';
    f_colocacion.value = ad.colocacion || 'patrocinadores';
    f_activo.value = (ad.activo === false) ? 'false' : 'true';
    f_titulo.value = ad.titulo || '';
    f_descripcion.value = ad.descripcion || '';
    f_cta_text.value = ad.cta_text || '';
    f_cta_url.value = ad.cta_url || '';
    f_start.value = toDateInputValue(ad.starts_at);
    f_end.value = toDateInputValue(ad.ends_at);

    // Sincroniza campos visibles
    if (f_start_text) f_start_text.value = dateValueToSlash(f_start.value);
    if (f_end_text) f_end_text.value = dateValueToSlash(f_end.value);

    if (!f_end.value && f_start.value) {
      f_end.value = addMonthsToDateValue(f_start.value, 1);
      if (f_end_text) f_end_text.value = dateValueToSlash(f_end.value);
    }

    // existing preview
    resetUploadState();
    const img = publicImageUrl(ad.image_path);
    if (imgPreview && img) imgPreview.innerHTML = `<img src="${esc(img)}" alt="">`;

    btnDelete.style.display = 'inline-flex';
    btnCancel.style.display = 'inline-flex';
    render();
    openEditor();
  }

  function constraintsForPlacement(p) {
    if (p === 'patrocinador' || p === 'banner') {
      return { maxW: 1600, maxH: 800, quality: 0.78 };
    }
    return { maxW: 1200, maxH: 1200, quality: 0.78 };
  }

  async function convertToWebp(file, placement) {
    const { maxW, maxH, quality } = constraintsForPlacement(placement);

    // Use createImageBitmap when possible (faster + respects EXIF in most browsers)
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = null;
    }

    let w = 0, h = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    if (bitmap) {
      w = bitmap.width;
      h = bitmap.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      canvas.width = tw;
      canvas.height = th;
      ctx.drawImage(bitmap, 0, 0, tw, th);
      if (bitmap.close) bitmap.close();
      w = tw; h = th;
    } else {
      // Fallback via Image
      const img = new Image();
      const src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        img.src = src;
      });
      URL.revokeObjectURL(src);
      w = img.naturalWidth;
      h = img.naturalHeight;
      const scale = Math.min(maxW / w, maxH / h, 1);
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      canvas.width = tw;
      canvas.height = th;
      ctx.drawImage(img, 0, 0, tw, th);
      w = tw; h = th;
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) throw new Error('No se pudo convertir a WEBP en este navegador.');

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(16).slice(2, 10);
    const outName = `${stamp}_${rand}.webp`;
    const outFile = new File([blob], outName, { type: 'image/webp' });

    return { file: outFile, meta: { w, h, origSize: file.size, webpSize: blob.size } };
  }

  function humanBytes(n) {
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = Number(n || 0);
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
  }

  async function convertAndPreview() {
    if (!sourceFile) return;
    converting = true;
    clearError();
    btnSave.disabled = true;
    btnSave.textContent = 'Convirtiendo…';
    if (fileInfo) fileInfo.innerHTML = `<div class="muted">Convirtiendo a WEBP…</div>`;

    try {
      const placement = f_colocacion.value;
      const res = await convertToWebp(sourceFile, placement);
      webpFile = res.file;
      webpMeta = res.meta;

      const url = URL.createObjectURL(webpFile);
      if (imgPreview) imgPreview.innerHTML = `<img src="${esc(url)}" alt="">`;

      const saved = webpMeta.origSize > 0
        ? Math.max(0, Math.round((1 - (webpMeta.webpSize / webpMeta.origSize)) * 100))
        : 0;

      if (fileInfo) {
        fileInfo.innerHTML = `
          <div class="s4-kv"><span>Original:</span><b>${humanBytes(webpMeta.origSize)}</b></div>
          <div class="s4-kv"><span>WEBP:</span><b>${humanBytes(webpMeta.webpSize)}</b></div>
          <div class="s4-kv"><span>Tamaño:</span><b>${webpMeta.w}×${webpMeta.h}</b></div>
          <div class="muted">Ahorro aprox: ${saved}%</div>
        `;
      }
    } catch (e) {
      webpFile = null;
      webpMeta = null;
      showError(e?.message || 'No se pudo convertir la imagen.');
    } finally {
      converting = false;
      btnSave.disabled = false;
      btnSave.textContent = 'Guardar';
    }
  }

  async function uploadIfNeeded() {
    if (!webpFile) return null;
    const fd = new FormData();
    fd.append('csrf', csrf);
    fd.append('colocacion', f_colocacion.value);
    fd.append('file', webpFile);
    const res = await api('upload.php', fd);
    return res?.path || null;
  }

  async function onSave(ev) {
    ev.preventDefault();
    clearError();
    if (converting) {
      showError('Espera a que termine la conversión.');
      return;
    }

    const colocacion = f_colocacion.value;
    const titulo = f_titulo.value.trim();
    const descripcion = f_descripcion.value.trim();
    const ctaText = f_cta_text.value.trim();
    const ctaUrl = f_cta_url.value.trim();
    const activo = f_activo.value;

    const starts_at = toIsoFromDateInputValue(f_start.value);
    const ends_at = toIsoFromDateInputValue(f_end.value);

    if (!titulo) {
      showError('Falta el título.');
      return;
    }
    if ((ctaText && !ctaUrl) || (!ctaText && ctaUrl)) {
      showError('Si usas CTA, llena texto y URL (ambos).');
      return;
    }

    btnSave.disabled = true;
    btnSave.textContent = 'Guardando…';

    try {
      let imagePath = editing?.image_path || '';
      const uploaded = await uploadIfNeeded();
      if (uploaded) imagePath = uploaded;

      if (!imagePath) {
        showError('Sube una imagen.');
        return;
      }

      const fd = new FormData();
      fd.append('csrf', csrf);
      fd.append('colocacion', colocacion);
      fd.append('titulo', titulo);
      fd.append('descripcion', descripcion);
      fd.append('cta_text', ctaText);
      fd.append('cta_url', ctaUrl);
      fd.append('activo', activo);
      fd.append('starts_at', starts_at);
      fd.append('ends_at', ends_at);
      fd.append('image_path', imagePath);

      if (editing?.id) {
        fd.append('id', editing.id);
        await api('update.php', fd);
      } else {
        await api('create.php', fd);
      }

      await load();
      resetForm();
      closeEditor();
    } catch (e) {
      showError(e?.message || 'Error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Guardar';
    }
  }

  async function onDelete() {
    if (!editing?.id) return;
    if (!confirm('¿Eliminar este anuncio?')) return;
    const fd = new FormData();
    fd.append('csrf', csrf);
    fd.append('id', editing.id);
    btnDelete.disabled = true;
    try {
      await api('delete.php', fd);
      await load();
      resetForm();
      closeEditor();
    } catch (e) {
      showError(e?.message || 'Error');
    } finally {
      btnDelete.disabled = false;
    }
  }

  function onNew() {
    resetForm();
    openEditor();
    try { f_titulo?.focus?.(); } catch {}
  }

  function onCancel() {
    resetForm();
    closeEditor();
  }

  function onFileChange() {
    const f = f_file?.files?.[0];
    if (!f) return;
    if (!/^image\//i.test(f.type || '')) {
      showError('Selecciona una imagen.');
      return;
    }
    sourceFile = f;
    convertAndPreview();
  }

  // Reconvert if placement changed and we already chose a source file
  function onPlacementChange() {
    if (sourceFile) convertAndPreview();
  }

  function onStartChange() {
    if (!f_start || !f_end) return;
    const v = f_start.value;
    if (f_start_text) f_start_text.value = dateValueToSlash(v);
    if (!v) {
      f_end.value = '';
      if (f_end_text) f_end_text.value = '';
      return;
    }
    // Auto: fin = +1 mes (clamp)
    const next = addMonthsToDateValue(v, 1);
    f_end.value = next;
    if (f_end_text) f_end_text.value = dateValueToSlash(next);
  }

  function openDatePicker(input) {
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    } catch {
      try { input.focus(); } catch {}
    }
  }

  function setDateFromText(txtEl, hiddenEl, autoEnd = false) {
    if (!txtEl || !hiddenEl) return;
    const v = parseSlashToDateValue(txtEl.value);
    if (!v) return; // no molestar si está incompleto
    hiddenEl.value = v;
    txtEl.value = dateValueToSlash(v);
    if (autoEnd) onStartChange();
  }

  function openImageViewer(url) {
    if (!imgViewer || !imgViewerImg || !url) return;
    imgViewerImg.src = url;
    imgViewer.classList.add('is-open');
    imgViewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('s4-noScroll');
  }

  function closeImageViewer() {
    if (!imgViewer) return;
    imgViewer.classList.remove('is-open');
    imgViewer.setAttribute('aria-hidden', 'true');
    if (imgViewerImg) imgViewerImg.removeAttribute('src');
    document.body.classList.remove('s4-noScroll');
  }

  // Wire events
  btnReload?.addEventListener('click', load);
  btnNew?.addEventListener('click', onNew);
  btnFabNew?.addEventListener('click', onNew);
  btnCancel?.addEventListener('click', onCancel);
  btnCloseEditor?.addEventListener('click', onCancel);
  btnDelete?.addEventListener('click', onDelete);
  filterPlacement?.addEventListener('change', render);
  filterActive?.addEventListener('change', render);
  f_file?.addEventListener('change', onFileChange);
  f_colocacion?.addEventListener('change', onPlacementChange);
  // Fechas: picker oculto + campo visible
  btnPickStart?.addEventListener('click', () => openDatePicker(f_start));
  btnPickEnd?.addEventListener('click', () => openDatePicker(f_end));

  f_start_text?.addEventListener('blur', () => setDateFromText(f_start_text, f_start, true));
  f_end_text?.addEventListener('blur', () => setDateFromText(f_end_text, f_end, false));

  f_start?.addEventListener('change', onStartChange);
  f_start?.addEventListener('input', onStartChange);
  f_end?.addEventListener('change', () => { if (f_end_text) f_end_text.value = dateValueToSlash(f_end.value); });
  form?.addEventListener('submit', onSave);

  // Ver imagen (delegación para que funcione tras cada render)
  listEl?.addEventListener('click', (ev) => {
    const t = ev.target;
    const node = t && t.closest ? t.closest('[data-view]') : null;
    if (!node || !listEl.contains(node)) return;
    const url = node.getAttribute('data-view');
    if (!url) return;
    ev.preventDefault();
    ev.stopPropagation();
    openImageViewer(url);
  });

  // Close overlay on backdrop click (mobile)
  editorBackdrop?.addEventListener('click', onCancel);
  mqModal?.addEventListener?.('change', syncEditorShell);

  // Cerrar visor de imagen
  imgViewer?.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t && t.closest('[data-close-viewer]')) closeImageViewer();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeImageViewer();
  });

  syncEditorShell();

  resetForm();
  load();
})();
