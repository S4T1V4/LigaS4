// Carga de configuración con versionado (?v=...) para evitar cache viejo en móvil/tablet.
const __APP_QS = new URL(import.meta.url).search;
const __configPromise = import(`./config.js${__APP_QS}`);

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let PROMOS = [];

let ADS_USE_DB = false;
let ADS_TABLE = 'publicidad';
let ADS_BUCKET = 'publicidad';

// Placements soportados para comerciales (un solo arreglo en config.js)
const __AD_PLACEMENTS = new Set(['patrocinador', 'promos', 'patrocinadores', 'banner']);

function __normPlacement(v) {
  const p = String(v ?? '').trim().toLowerCase();
  return __AD_PLACEMENTS.has(p) ? p : 'patrocinadores';
}

function __adsByPlacement(placement) {
  const p = __normPlacement(placement);
  const list = Array.isArray(PROMOS) ? PROMOS : [];
  return list.filter(x => __normPlacement(x?.placement) === p);
}

// Inicializar cliente de Supabase (usando window.supabase del CDN)
let supabaseClient = null;
let supabaseConfigured = false;



// ==========================================
// PUBLICIDAD (BD)
// - Lee tabla `publicidad` y la mapea al formato de PROMOS (placement/title/desc/img/cta/href/badge)
// - No usa service_role en el navegador, solo la key pública (anon/publishable)
// ==========================================

function __isHttpUrl(v) {
  const s = String(v || '').trim();
  return s.startsWith('http://') || s.startsWith('https://');
}

function __resolveAdImage(imagePath) {
  const p = String(imagePath || '').trim();
  if (!p) return '';
  if (__isHttpUrl(p)) return p;
  // Si es ruta de Storage, construir URL pública
  const clean = p.replace(/^\/+/, '');
  // encodeURI mantiene los "/" pero escapa espacios, etc.
  return `${String(SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(String(ADS_BUCKET || 'publicidad'))}/${encodeURI(clean)}`;
}

function __withinWindow(row) {
  try {
    const now = Date.now();
    const s = row?.starts_at ? Date.parse(row.starts_at) : NaN;
    const e = row?.ends_at ? Date.parse(row.ends_at) : NaN;
    if (!Number.isNaN(s) && now < s) return false;
    if (!Number.isNaN(e) && now > e) return false;
    return true;
  } catch {
    return true;
  }
}

function __badgeForPlacement(p) {
  const pl = __normPlacement(p);
  if (pl === 'patrocinador') return 'Principal';
  if (pl === 'banner') return 'Banner';
  if (pl === 'promos') return 'Promo';
  return 'Sponsor';
}

async function loadAdsFromDb() {
  if (!ADS_USE_DB) return false;
  if (!supabaseConfigured || !supabaseClient) return false;
  // Solo nos interesa en modo público
  if (UI_IS_ADMIN) return false;

  // Cache simple (5 min) para no pegarle a Supabase en cada refresh
  const cacheKey = '__LF_ADS_DB_CACHE__';
  const ttlMs = 30 * 1000; // 30s en front para reflejar cambios rápido
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    if (cached && cached.ts && (Date.now() - cached.ts) < ttlMs && Array.isArray(cached.data)) {
      PROMOS = cached.data;
      if (typeof window !== 'undefined') window.__ADS__ = PROMOS;
      return PROMOS.length > 0;
    }
  } catch {}

  try {
    const { data, error } = await supabaseClient
      .from(ADS_TABLE)
      .select('id,titulo,descripcion,cta_text,cta_url,image_path,activo,sort_order,starts_at,ends_at,created_at,colocacion')
      .eq('activo', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ADS] No se pudo leer publicidad desde BD:', error);
      return false;
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped = rows
      .filter(r => r && (r.activo === true || r.activo === 1))
      .filter(__withinWindow)
      .map(r => {
        const placement = __normPlacement(r.colocacion);
        return {
          placement,
          title: r.titulo || 'Patrocinador',
          desc: r.descripcion || '',
          img: __resolveAdImage(r.image_path),
          cta: r.cta_text || 'Ver',
          href: r.cta_url || '#',
          badge: __badgeForPlacement(placement),
          _id: r.id,
        };
      })
      // Evitar slides rotos sin imagen/título
      .filter(p => p && p.title && p.img);

    if (mapped.length) {
      PROMOS = mapped;
      if (typeof window !== 'undefined') window.__ADS__ = PROMOS;
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: PROMOS })); } catch {}
      return true;
    }

    return false;
  } catch (e) {
    console.warn('[ADS] Error inesperado cargando publicidad:', e);
    return false;
  }
}
async function initConfigAndSupabase() {
  const cfg = await __configPromise;
  SUPABASE_URL = cfg?.SUPABASE_URL ?? '';
  SUPABASE_KEY = cfg?.SUPABASE_KEY ?? '';
  PROMOS = Array.isArray(cfg?.PROMOS) ? cfg.PROMOS : [];

  ADS_USE_DB = !!(cfg?.ADS_USE_DB ?? false);
  ADS_TABLE = String(cfg?.ADS_TABLE ?? 'publicidad');
  ADS_BUCKET = String(cfg?.ADS_BUCKET ?? 'publicidad');

  // Normalizar placements (y dejar un snapshot global para debugging)
  try {
    PROMOS = PROMOS
      .filter(Boolean)
      .map(p => ({ ...p, placement: __normPlacement(p?.placement) }));
    if (typeof window !== 'undefined') window.__ADS__ = PROMOS;
  } catch {
    // Si algo raro pasa, seguimos con el arreglo tal cual.
  }

  if (window?.supabase?.createClient && SUPABASE_URL && SUPABASE_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseConfigured = true;
  } else {
    supabaseClient = null;
    supabaseConfigured = false;
  }
}


        // ==========================================
        // VARIABLES GLOBALES
        const UI_IS_ADMIN = (typeof document !== 'undefined') && !!document.body?.classList.contains('is-admin');
        let torneos = [];
        let torneoActualId = null;
        // ==========================================
        let equipos = [];
		let equiposById = new Map();
		// Posiciones (fuente de verdad de la tabla)
		let posiciones = [];
		let posicionesByEquipoId = new Map();
        let jugadores = [];
        let equipoJugadoresId = null;
        // Modal jugador
        let jugadorModalId = null;
        let jugadorModalNombreOriginal = null;
 
        let enfrentamientosProgramados = [];
        let proximoEnfrentamiento = null;
        let avisoActual = '';
        let avisoActualObj = null;
        let avisosHistorial = [];
        const AVISO_MAX_CHARS = 500;
        let _lastAvisoLoadedText = null;
        let indiceEditando = -1;
        let filtroActual = 'pendientes';
        let equipoFiltroSeleccionado = '__all__';

        // ==========================================
        // EVENTOS POR PARTIDO (goles, tarjetas, etc.)
        // ==========================================
        let partidoEditandoId = null;
        let eventosPartido = [];
        let eventoEquipoSeleccionadoId = null;
        const EVENT_TYPES = [
            { value: 'GOL', label: 'Gol' },
            { value: 'AUTOGOL', label: 'Autogol' },
            { value: 'AMARILLA', label: 'Amarilla' },
            { value: 'ROJA', label: 'Roja' },
        ];
        // Cache simple: jugadores por equipo para el modal de eventos
        const jugadoresPorEquipoCache = new Map();
        const jugadoresEventosById = new Map();

        // ==========================================
        // CACHE (mejora 19) + utilidades UI (mejoras 20/21)
        // ==========================================
        const __LF_CACHE = window.__LF_CACHE || (window.__LF_CACHE = {
            liguillaByTorneo: new Map(),
            statsByTorneo: new Map(),
            historialTorneos: { ts: 0, data: null }
        });

        function cacheGet(map, key, ttlMs) {
            try {
                const item = map.get(key);
                if (!item) return null;
                if (Date.now() - (item.ts || 0) > ttlMs) return null;
                return item.data;
            } catch { return null; }
        }

        function cacheSet(map, key, data) {
            try { map.set(key, { ts: Date.now(), data }); } catch {}
        }

        function setWrapLoading(el, isLoading) {
            if (!el) return;
            if (isLoading) el.classList.add('is-loading');
            else el.classList.remove('is-loading');
        }

        // ===== Cache helpers: Jugadores para el modal de eventos =====
        function sortJugadoresEventos(list) {
            if (!Array.isArray(list)) return;
            list.sort((a, b) => {
                const an = String(a?.nombre ?? '').toLowerCase();
                const bn = String(b?.nombre ?? '').toLowerCase();
                if (an < bn) return -1;
                if (an > bn) return 1;
                const ad = (a?.dorsal ?? a?.numero ?? null);
                const bd = (b?.dorsal ?? b?.numero ?? null);
                if (ad != null && bd != null) return Number(ad) - Number(bd);
                if (ad != null) return -1;
                if (bd != null) return 1;
                return 0;
            });
        }

        function upsertJugadorEnEventosCache(jugador) {
            if (!jugador) return;
            const equipoId = jugador.equipo_id ?? null;
            if (!equipoId) return;
            const key = String(equipoId);

            const list = jugadoresPorEquipoCache.get(key) || [];
            const id = String(jugador.id);
            const idx = list.findIndex(j => String(j?.id) === id);
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...jugador };
            } else {
                list.push(jugador);
            }

            jugadoresPorEquipoCache.set(key, list);

            const cur = jugadoresEventosById.get(id) || {};
            jugadoresEventosById.set(id, { ...cur, ...jugador });

            sortJugadoresEventos(list);
        }

        function patchJugadorEnEventosCache(jugadorId, equipoId, patch) {
            if (!jugadorId || !patch) return;
            const id = String(jugadorId);
            const key = equipoId ? String(equipoId) : null;

            if (key && jugadoresPorEquipoCache.has(key)) {
                const list = jugadoresPorEquipoCache.get(key) || [];
                const idx = list.findIndex(j => String(j?.id) === id);
                if (idx >= 0) {
                    list[idx] = { ...list[idx], ...patch };
                    jugadoresPorEquipoCache.set(key, list);
                    sortJugadoresEventos(list);
                }
            }

            if (jugadoresEventosById.has(id)) {
                const cur = jugadoresEventosById.get(id) || {};
                jugadoresEventosById.set(id, { ...cur, ...patch });
            }
        }

        function removeJugadorEnEventosCache(jugadorId, equipoId) {
            if (!jugadorId) return;
            const id = String(jugadorId);
            jugadoresEventosById.delete(id);

            const key = equipoId ? String(equipoId) : null;
            if (key && jugadoresPorEquipoCache.has(key)) {
                const list = jugadoresPorEquipoCache.get(key) || [];
                jugadoresPorEquipoCache.set(key, (list || []).filter(j => String(j?.id) !== id));
                return;
            }

            // Si no sabemos el equipo, lo removemos de todos por seguridad
            for (const [k, list] of jugadoresPorEquipoCache.entries()) {
                jugadoresPorEquipoCache.set(k, (list || []).filter(j => String(j?.id) !== id));
            }
        }

            jugadores = [];
            equipoJugadoresId = null;
            jugadorModalId = null;
            jugadorModalNombreOriginal = null;
            const selJug = document.getElementById('jugadorEquipoSelect');
            if (selJug) selJug.value = '';

            // Eventos/Reportes
            partidoEditandoId = null;
            eventosPartido = [];
            eventoEquipoSeleccionadoId = null;
            jugadoresPorEquipoCache.clear();
            jugadoresEventosById.clear();
            limpiarReportesUI();

        const UBICACION_DEFAULT = { lat: 19.263907491345563, lng: -98.4449237589333 };


// ==========================================
// PROMOCIONES (UI)
// ==========================================
let promoIndex = 0;
let promoTimer = null;

function initPromoBanner(){
    const wrap = document.getElementById('promoBanner');
    const track = document.getElementById('promoTrack');
    const dots = document.getElementById('promoDots');
    if (!wrap || !track || !dots) return;

    // HERO = placement "patrocinador"
    const promos = __adsByPlacement('patrocinador').filter(p => p && p.title && p.img);
    if (!promos.length) { wrap.style.display = 'none'; return; }

    // Guardar para navegación del HERO (no se reutiliza para otros espacios)
    window.__PROMOS__ = promos;

    // Render slides
    track.innerHTML = promos.map((p, i) => `
        <div class="promo-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${promos.length}">
            <img class="promo-img" src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)}" loading="lazy">
            <div class="promo-copy">
                <h3>${escapeHtml(p.title)}</h3>
                <p>${escapeHtml(p.desc || '')}</p>
            </div>
            <a class="promo-cta" href="${escapeHtml(p.href || '#')}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(p.cta || 'Ver más')} →
            </a>
        </div>
    `).join('');

    
    // Fallback si la imagen no carga (sin inline onerror)
    track.querySelectorAll('img.promo-img').forEach(img => {
        img.addEventListener('error', () => {
            img.style.opacity = '.25';
            img.alt = 'Imagen no disponible';
        });
    });
// Render dots
    dots.innerHTML = promos.map((_, i) =>
        `<button type="button" class="promo-dot ${i === 0 ? 'active' : ''}"
                 aria-label="Ir a promoción ${i + 1}" data-action="promo-go" data-index="${i}"></button>`
    ).join('');

    promoIndex = 0;
    wrap.style.display = 'block';
    promoUpdate();
    promoStart();

    // Pausa al hover
    wrap.addEventListener('mouseenter', promoStop);
    wrap.addEventListener('mouseleave', promoStart);

    // Swipe móvil
    let startX = null;
    wrap.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        startX = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) promoNext(); else promoPrev();
    }, { passive: true });
}

function promoUpdate(){
    const promos = window.__PROMOS__ || [];
    const track = document.getElementById('promoTrack');
    const dots = document.getElementById('promoDots');
    if (!track || !dots || !promos.length) return;

    promoIndex = ((promoIndex % promos.length) + promos.length) % promos.length;
    track.style.transform = `translateX(-${promoIndex * 100}%)`;

    [...dots.querySelectorAll('.promo-dot')].forEach((d, i) => d.classList.toggle('active', i === promoIndex));

    // Solo actualiza el contador del HERO.
    // (Los demás espacios publicitarios se gestionan por su propio "placement".)
    const counter = document.getElementById('promoCounter');
    if (counter) counter.textContent = `${promoIndex + 1}/${promos.length}`;
}

function promoGo(i){ promoIndex = i; promoUpdate(); promoRestart(); }
function promoNext(){ promoIndex++; promoUpdate(); promoRestart(); }
function promoPrev(){ promoIndex--; promoUpdate(); promoRestart(); }

function promoStart(){
    promoStop();
    const promos = window.__PROMOS__ || [];
    if (promos.length <= 1) return;
    promoTimer = setInterval(() => { promoIndex++; promoUpdate(); }, 6500);
}

function promoStop(){
    if (promoTimer) { clearInterval(promoTimer); promoTimer = null; }
}

function promoRestart(){
    promoStart();
}

// ==========================================
// BANNER debajo del aviso (placement: "banner")
// ==========================================
let bannerIndex = 0;
let bannerTimer = null;

function bannerStop() {
  if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; }
}

function bannerUpdate() {
  const list = window.__BANNERS__ || [];
  const wrap = document.getElementById('nativePromo');
  const img = document.getElementById('nativePromoImg');
  const title = document.getElementById('nativePromoTitle');
  const desc = document.getElementById('nativePromoDesc');
  const cta = document.getElementById('nativePromoCta');
  if (!wrap || !img || !title || !desc || !cta) return;
  if (!list.length) { wrap.style.display = 'none'; return; }

  bannerIndex = ((bannerIndex % list.length) + list.length) % list.length;
  const p = list[bannerIndex];

  wrap.style.display = 'block';
  img.src = String(p.img || '');
  img.alt = String(p.title || 'Banner');
  title.textContent = String(p.title || 'Banner');
  desc.textContent = String(p.desc || '');
  cta.textContent = String((p.cta || 'Ver') + ' →');
  cta.href = String(p.href || '#');

  // Badge (si existe)
  const badgeEl = wrap.querySelector('.native-badge');
  if (badgeEl) badgeEl.textContent = String(p.badge || 'Banner');
}

function bannerStart() {
  bannerStop();
  const list = window.__BANNERS__ || [];
  if (list.length <= 1) return;
  bannerTimer = setInterval(() => { bannerIndex++; bannerUpdate(); }, 12000);
}

function initBannerBelowAviso() {
  const wrap = document.getElementById('nativePromo');
  if (!wrap) return;

  const list = __adsByPlacement('banner').filter(p => p && p.title && p.img);
  if (!list.length) { wrap.style.display = 'none'; return; }

  window.__BANNERS__ = list;
  bannerIndex = 0;
  bannerUpdate();
  bannerStart();

  // Pausa al hover (desktop)
  wrap.addEventListener('mouseenter', bannerStop);
  wrap.addEventListener('mouseleave', bannerStart);
}

// ==========================================
// PROMO del día (placement: "promos")
// ==========================================
let promoDayIndex = 0;
let promoDayTimer = null;

function promoDayStop() {
  if (promoDayTimer) { clearInterval(promoDayTimer); promoDayTimer = null; }
}

function promoDayUpdate() {
  const list = window.__PROMODAY__ || [];
  const spot = document.getElementById('sideSpotlight');
  if (!spot) return;
  if (!list.length) {
    spot.innerHTML = '<div class="empty-state">—</div>';
    return;
  }

  promoDayIndex = ((promoDayIndex % list.length) + list.length) % list.length;
  const p = list[promoDayIndex];

  const title = escapeHtml(p.title || 'Promo');
  const desc = escapeHtml(p.desc || '');
  const img = escapeHtml(p.img || '');
  const cta = escapeHtml(p.cta || 'Ver');
  const href = escapeHtml(p.href || '#');

  spot.innerHTML = `
    <img class="ps-img" src="${img}" alt="${title}" loading="lazy">
    <div class="ps-title">${title}</div>
    ${desc ? `<div class="ps-desc">${desc}</div>` : ''}
    <a class="ps-cta" href="${href}" target="_blank" rel="noopener">${cta}</a>
  `;
}

function promoDayStart() {
  promoDayStop();
  const list = window.__PROMODAY__ || [];
  if (list.length <= 1) return;
  promoDayTimer = setInterval(() => { promoDayIndex++; promoDayUpdate(); }, 10000);
}

function initPromoDelDia() {
  const spot = document.getElementById('sideSpotlight');
  if (!spot) return;

  const list = __adsByPlacement('promos').filter(p => p && p.title && p.img);
  if (!list.length) {
    spot.innerHTML = '<div class="empty-state">—</div>';
    return;
  }

  window.__PROMODAY__ = list;
  promoDayIndex = 0;
  promoDayUpdate();
  promoDayStart();

  // Pausa al hover
  spot.addEventListener('mouseenter', promoDayStop);
  spot.addEventListener('mouseleave', promoDayStart);
}

        // ==========================================
        // FUNCIONES DE CARGA
        // ==========================================
        
        function showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        function showError(message) {
            alert('Error: ' + message);
        }


        function escapeHtml(str) {
            return String(str ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        // Pobla un <select> con horarios (09:00 - 18:00 cada 30 min)
        function poblarSelectHoraGenerico(selectId) {
            const sel = document.getElementById(selectId);
            if (!sel) return;

            const actual = sel.value || '';

           	const start = 9 * 60;   // 09:00 AM
            const end = 18 * 60;    // 06:00 PM (18:00)
            const step = 40;        // cada 40 min


            const opts = ['<option value="">Seleccionar</option>'];

            for (let t = start; t <= end; t += step) {
                const h24 = Math.floor(t / 60);
                const m = t % 60;

                const value = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                let h12 = h24 % 12;
                if (h12 === 0) h12 = 12;
                const ampm = h24 < 12 ? 'AM' : 'PM';
                const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;

                opts.push(`<option value="${value}">${label}</option>`);
            }

            sel.innerHTML = opts.join('');

            // Restaurar selección si todavía existe
            const existe = Array.from(sel.options).some(o => o.value === actual);
            sel.value = existe ? actual : '';
        }

        function poblarSelectHoraPartido() {
            poblarSelectHoraGenerico('horaPartido');
        }

        function poblarSelectHoraLiguilla() {
            poblarSelectHoraGenerico('liguillaHora');
        }

        // Hora por defecto: "la hora siguiente" (redondeada a :00)
        function getHoraSiguienteRedondeadaHHMM() {
            const d = new Date();
            d.setSeconds(0, 0);
            d.setMinutes(0);
            d.setHours(d.getHours() + 1);

            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        }

        // Selecciona el horario más cercano >= a la hora siguiente (si el select está vacío)
        function setHoraDefaultEnSelect(selectId, { force = false } = {}) {
            const sel = document.getElementById(selectId);
            if (!sel) return;
            if (!force && sel.value) return;

            const base = getHoraSiguienteRedondeadaHHMM();
            const [bh, bm] = base.split(':').map(n => parseInt(n, 10));
            if (!Number.isFinite(bh) || !Number.isFinite(bm)) return;

            let baseMin = (bh * 60) + bm;

            // límites del select (09:00 a 18:00) por si el dispositivo está fuera de rango
            baseMin = Math.max(baseMin, 9 * 60);
            baseMin = Math.min(baseMin, 18 * 60);

            const opts = Array.from(sel.options)
                .map(o => o.value)
                .filter(v => !!v);

            const toMin = (v) => {
                const [h, m] = String(v).split(':').map(x => parseInt(x, 10));
                if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
                return (h * 60) + m;
            };

            let best = '';
            let bestMin = Infinity;
            for (const v of opts) {
                const mins = toMin(v);
                if (mins == null) continue;
                if (mins >= baseMin && mins < bestMin) {
                    best = v;
                    bestMin = mins;
                }
            }

            // si no hay uno >=, agarra el último
            if (!best && opts.length) best = opts[opts.length - 1];

            if (best) sel.value = best;
        }

        function formatDateYYYYMMDD(dateObj) {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function getProximoDomingo() {
            const d = new Date();
            d.setHours(0, 0, 0, 0);

            const day = d.getDay(); // 0=Domingo, 1=Lunes, ...
            const delta = (7 - day) % 7; // si hoy es domingo -> 0, si es lunes -> 6, etc.
            d.setDate(d.getDate() + delta);

            return d;
        }

        function setFechaDefaultEnInput(inputId, { force = false } = {}) {
            const input = document.getElementById(inputId);
            if (!input) return;

            // Solo pone default si está vacío (o si force=true)
            if (!force && input.value) return;

            input.value = formatDateYYYYMMDD(getProximoDomingo());
        }

        function setFechaPartidoDefault({ force = false } = {}) {
            setFechaDefaultEnInput('fechaPartido', { force });
        }

        function setFechaLiguillaDefault({ force = false } = {}) {
            setFechaDefaultEnInput('liguillaFecha', { force });
        }



        function renderTorneoSelect() {
            const select = document.getElementById('torneoSelect');
            if (!select) return;

            const base = '<option value="">Seleccionar torneo…</option>';
            const opts = torneos.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');
            select.innerHTML = base + opts;
        }

        async function cargarTorneos() {
            if (!supabaseConfigured) return;

            const select = document.getElementById('torneoSelect');
            if (select) select.disabled = true;

            try {
                const { data, error } = await supabaseClient
                    .from('torneos')
                    .select('id, nombre, created_at')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                torneos = data || [];
                renderTorneoSelect();

                // Restaurar último torneo (si existe)
                const saved = localStorage.getItem('torneo_id');
                const existe = saved && torneos.some(t => String(t.id) === String(saved));

                if (existe) {
                    const sel = document.getElementById('torneoSelect');
                    if (sel) sel.value = saved;
                    await setTorneo(saved, { skipSave: true });
                } else if (torneos.length === 1) {
                    const sel = document.getElementById('torneoSelect');
                    if (sel) sel.value = torneos[0].id;
                    await setTorneo(torneos[0].id);
                } else {
                    await setTorneo(null, { clearOnly: true });
                }
            } catch (error) {
                console.error('Error cargando torneos:', error);
                showError('Error al cargar la lista de torneos');

                torneos = [];
                renderTorneoSelect();
                await setTorneo(null, { clearOnly: true });
            } finally {
                if (select) select.disabled = false;
            }
        }

        async function setTorneo(id, opts = {}) {
            torneoActualId = id ? String(id) : null;

            if (torneoActualId && !opts.skipSave) localStorage.setItem('torneo_id', torneoActualId);
            if (!torneoActualId) localStorage.removeItem('torneo_id');

            updateAdminTorneoActions();

            // Mostrar / ocultar app
            const appMain = document.getElementById('appMain');
            const noTorneo = document.getElementById('noTorneo');
            if (appMain) appMain.style.display = torneoActualId ? 'block' : 'none';
            if (noTorneo) noTorneo.style.display = torneoActualId ? 'none' : 'block';

            // Volver a la pestaña inicial
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const tabla = document.getElementById('tabla');
            if (tabla) tabla.classList.add('active');
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const primeraTab = document.querySelector('.tab');
            if (primeraTab) primeraTab.classList.add('active');

            // Reiniciar estado local al cambiar de torneo
            equipos = [];
            enfrentamientosProgramados = [];
            proximoEnfrentamiento = null;
            avisoActual = '';
            indiceEditando = -1;
            filtroActual = 'pendientes';
            equipoFiltroSeleccionado = '__all__';
            jugadores = [];
            equipoJugadoresId = null;
            jugadorModalId = null;
            jugadorModalNombreOriginal = null;
            const selJug = document.getElementById('jugadorEquipoSelect');
            if (selJug) selJug.value = '';

            // Eventos/Reportes
            partidoEditandoId = null;
            eventosPartido = [];
            eventoEquipoSeleccionadoId = null;
            jugadoresPorEquipoCache.clear();
            limpiarReportesUI();


            actualizarVistas();
            actualizarProximoPartido();
            filtrarPartidos(filtroActual);
            mostrarAvisoBanner();

            // Paneles laterales (solo lectura): limpiar al cambiar torneo
            resetPublicSidePanelsUI();

            if (!torneoActualId || opts.clearOnly) return;

            await cargarDatos();
        }

        function onTorneoChange(id) {
            setTorneo(id);
        }

        function abrirModalTorneo() {
            const modal = document.getElementById('modalTorneo');
            const form = document.getElementById('formTorneo');
            if (form) form.reset();
            if (modal) modal.classList.add('show');
            __revalidateEquipoNombreInputs();
        }

        function cerrarModalTorneo() {
            const modal = document.getElementById('modalTorneo');
            const form = document.getElementById('formTorneo');
            if (modal) modal.classList.remove('show');
            if (form) form.reset();
        }

        

        function updateAdminTorneoActions() {
            const btnEdit = document.getElementById('btnEditarTorneo');
            const btnDel = document.getElementById('btnEliminarTorneo');
            const enabled = !!torneoActualId;

            if (btnEdit) btnEdit.disabled = !enabled;
            if (btnDel) btnDel.disabled = !enabled;
        }

        function abrirModalEditarTorneo() {
            const t = torneos.find(x => String(x.id) === String(torneoActualId));
            if (!t) {
                alert('Primero selecciona un torneo en el selector 🏆');
                return;
            }

            const modal = document.getElementById('modalEditarTorneo');
            const form = document.getElementById('formEditarTorneo');
            const input = document.getElementById('nombreTorneoEditar');

            if (form) form.reset();
            if (input) input.value = t.nombre ?? '';

            if (modal) modal.classList.add('show');
        }

        function cerrarModalEditarTorneo() {
            const modal = document.getElementById('modalEditarTorneo');
            const form = document.getElementById('formEditarTorneo');
            if (modal) modal.classList.remove('show');
            if (form) form.reset();
        }

        async function editarTorneo(e) {
            e.preventDefault();

            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                alert('Selecciona un torneo primero');
                return;
            }

            const input = document.getElementById('nombreTorneoEditar');
            const nombre = (input?.value ?? '').trim();
            if (!nombre) {
                alert('Escribe el nombre del torneo');
                return;
            }

            showLoading();
            try {
                const { data, error } = await supabaseClient
                    .from('torneos')
                    .update({ nombre })
                    .eq('id', torneoActualId)
                    .select('id, nombre, created_at')
                    .single();

                if (error) throw error;

                const idx = torneos.findIndex(t => String(t.id) === String(torneoActualId));
                if (idx >= 0) torneos[idx] = { ...torneos[idx], ...data };

                renderTorneoSelect();
                const sel = document.getElementById('torneoSelect');
                if (sel) sel.value = torneoActualId;

                cerrarModalEditarTorneo();
            } catch (error) {
                console.error('Error editando torneo:', error);
                showError('Error al editar el torneo');
            } finally {
                hideLoading();
            }
        }

        async function confirmarEliminarTorneo() {
            const t = torneos.find(x => String(x.id) === String(torneoActualId));
            if (!t) {
                alert('Primero selecciona un torneo en el selector 🏆');
                return;
            }

            const ok = prompt(`Vas a eliminar el torneo "${t.nombre}" y TODO lo que cuelga de él (equipos, partidos, avisos).

Escribe ELIMINAR para confirmar:`);
            if (ok !== 'ELIMINAR') return;

            await eliminarTorneo(t.id);
        }

        async function eliminarTorneo(torneoId) {
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }

            showLoading();
            try {
               
                // Con cascadas en BD, basta con borrar el torneo
                const delTorneo = await supabaseClient.from('torneos').delete().eq('id', torneoId);
                if (delTorneo.error) throw delTorneo.error;


                // 3) Actualizar estado local/UI
                torneos = torneos.filter(t => String(t.id) !== String(torneoId));
                renderTorneoSelect();

                const sel = document.getElementById('torneoSelect');

                if (torneos.length > 0) {
                    const nextId = torneos[0].id;
                    if (sel) sel.value = nextId;
                    await setTorneo(nextId);
                } else {
                    if (sel) sel.value = '';
                    await setTorneo(null, { clearOnly: true });
                }

                updateAdminTorneoActions();
                alert('Torneo eliminado ✅ (que descanse en paz)');
            } catch (error) {
                console.error('Error eliminando torneo:', error);
                showError('Error al eliminar el torneo');
            } finally {
                hideLoading();
            }
        }
async function crearTorneo(e) {
            e.preventDefault();

            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }

            const nombreInput = document.getElementById('nombreTorneo');
            if (!nombreInput) return;

            const nombre = nombreInput.value.trim();
            if (!nombre) {
                alert('Escribe el nombre del torneo');
                return;
            }
            showLoading();
            try {
                const { data, error } = await supabaseClient
    .from('torneos')
    .insert([{ nombre }])  // ✅ Solo nombre
    .select('id, nombre, created_at')
    .single();

                if (error) throw error;

                torneos.unshift(data);
                renderTorneoSelect();

                const select = document.getElementById('torneoSelect');
                if (select) select.value = data.id;

                cerrarModalTorneo();
                await setTorneo(data.id);
            } catch (error) {
                console.error('Error creando torneo:', error);
                showError('Error al crear torneo');
            } finally {
                hideLoading();
            }
        }

        async function cargarDatos() {
            if (!supabaseConfigured) {
                hideLoading();
                return;
            }

            if (!torneoActualId) {
                hideLoading();
                return;
            }

            showLoading();
            try {
                await cargarEquipos();
                equiposById = new Map((equipos || []).map(e => [String(e.id), e.nombre]));
                __revalidateEquipoNombreInputs();
                await cargarPartidos();
                await cargarPosiciones();
                await cargarAvisosAdmin();
                await cargarAdminResumenTorneo();
                await cargarEstadisticasLectura();
                await cargarPublicSidePanels();
                actualizarTimelineMini();
                actualizarVistas();
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (error) {
                console.error('Error cargando datos:', error);
                showError('Error al cargar los datos');
            } finally {
                hideLoading();
            }
        }

        async function cargarEquipos() {
            const { data, error } = await supabaseClient
                .from('equipos')
                .select('*')
                .eq('torneo_id', torneoActualId)
			.order('nombre', { ascending: true });
            
            if (error) {
                console.error('Error cargando equipos:', error);
                throw error;
            }
            
            equipos = data || [];
        }

		async function cargarPosiciones() {
			if (!supabaseConfigured || !torneoActualId) {
				posiciones = [];
				posicionesByEquipoId = new Map();
				return;
			}

			// Preferimos la VIEW para que ya venga el nombre del equipo (y columnas derivadas)
			// Si no existe, hacemos fallback a la tabla "posiciones".
			let data = null;
			let error = null;

			// 1) Intentar con VIEW
			({ data, error } = await supabaseClient
				.from('v_posiciones_torneo')
				.select('*')
				.eq('torneo_id', torneoActualId)
				.order('pts', { ascending: false })
				.order('dif', { ascending: false })
				.order('gf', { ascending: false }));

			// 2) Fallback a tabla si la VIEW no existe
			if (error && isMissingTable(error, 'v_posiciones_torneo')) {
				({ data, error } = await supabaseClient
					.from('posiciones')
					.select('*')
					.eq('torneo_id', torneoActualId)
					.order('pts', { ascending: false })
					.order('dif', { ascending: false })
					.order('gf', { ascending: false }));
			}

			if (error) {
				if (isMissingTable(error, 'posiciones') || isMissingTable(error, 'v_posiciones_torneo')) {
					posiciones = [];
					posicionesByEquipoId = new Map();
					return;
				}
				console.error('Error cargando posiciones:', error);
				throw error;
			}

			posiciones = data || [];
			posicionesByEquipoId = new Map((posiciones || []).map(p => [String(p.equipo_id), p]));
		}

       async function cargarPartidos() {
                    if (!supabaseConfigured || !torneoActualId) {
                        enfrentamientosProgramados = [];
                        return;
                    }

                    // 1) Partidos (solo columnas necesarias)
                    let partidosData = null;
                    let partidosError = null;

                    // Intentar traer columna "fase" (para liguilla). Si no existe, hacemos fallback.
                    let partidosRes = await supabaseClient
                        .from('partidos')
                        .select('id, local_id, visitante_id, local, visitante, fecha, hora, fecha_hora, notas, ubicacion_lat, ubicacion_lng, finalizado, fase, tipo_partido')
                        .eq('torneo_id', torneoActualId)
                        .order('fecha_hora', { ascending: true });

                    if (partidosRes.error && isMissingColumn(partidosRes.error, 'fase')) {
                        partidosRes = await supabaseClient
                            .from('partidos')
                            .select('id, local_id, visitante_id, local, visitante, fecha, hora, fecha_hora, notas, ubicacion_lat, ubicacion_lng, finalizado, tipo_partido')
                            .eq('torneo_id', torneoActualId)
                            .order('fecha_hora', { ascending: true });
                    }

                    // Si falla por columna tipo_partido inexistente, fallback simple
                    if (partidosRes.error && isMissingColumn(partidosRes.error, 'tipo_partido')) {
                        // Intentar mantener fase si existe
                        partidosRes = await supabaseClient
                            .from('partidos')
                            .select('id, local_id, visitante_id, local, visitante, fecha, hora, fecha_hora, notas, ubicacion_lat, ubicacion_lng, finalizado, fase')
                            .eq('torneo_id', torneoActualId)
                            .order('fecha_hora', { ascending: true });

                        if (partidosRes.error && isMissingColumn(partidosRes.error, 'fase')) {
                            partidosRes = await supabaseClient
                                .from('partidos')
                                .select('id, local_id, visitante_id, local, visitante, fecha, hora, fecha_hora, notas, ubicacion_lat, ubicacion_lng, finalizado')
                                .eq('torneo_id', torneoActualId)
                                .order('fecha_hora', { ascending: true });
                        }
                    }

                    partidosData = partidosRes.data;
                    partidosError = partidosRes.error;

                    if (partidosError) {
                        if (isMissingTable(partidosError, 'partidos')) {
                            enfrentamientosProgramados = [];
                            return;
                        }
                        console.error('Error cargando partidos:', partidosError);
                        throw partidosError;
                    }

                    const partidos = partidosData || [];

                    // 2) Marcadores (consulta separada para NO depender de relación embebida)
                    let marcadorByPartidoId = new Map();

                    try {
                        const ids = partidos.map(p => p?.id).filter(Boolean); // UUIDs
                        if (ids.length > 0) {
                            let marcRes = await supabaseClient
                                .from('marcadores_partido')
                                .select('partido_id, goles_local, goles_visitante, penales_local, penales_visitante')
                                .eq('torneo_id', torneoActualId)
                                .in('partido_id', ids);

                            if (marcRes.error && isMissingColumn(marcRes.error, 'penales_local')) {
                                marcRes = await supabaseClient
                                    .from('marcadores_partido')
                                    .select('partido_id, goles_local, goles_visitante')
                                    .eq('torneo_id', torneoActualId)
                                    .in('partido_id', ids);
                            }

                            const marcData = marcRes.data;
                            const marcError = marcRes.error;

                            if (!marcError) {
                                marcadorByPartidoId = new Map((marcData || []).map(m => [String(m.partido_id), m]));
                            } else if (!isMissingTable(marcError, 'marcadores_partido')) {
                                console.warn('No se pudieron cargar marcadores_partido, continúo sin marcador:', marcError);
                            }
                        }
                    } catch (err) {
                        console.warn('Marcadores opcionales (ignorado):', err);
                    }

                    // 3) Normalización para UI
                    enfrentamientosProgramados = partidos.map(p => {
                        const localId = p.local_id ? String(p.local_id) : null;
                        const visitanteId = p.visitante_id ? String(p.visitante_id) : null;

                        const localNombre = localId
                            ? (equiposById.get(localId) ?? p.local ?? '—')
                            : (p.local ?? '—');

                        const visitanteNombre = visitanteId
                            ? (equiposById.get(visitanteId) ?? p.visitante ?? '—')
                            : (p.visitante ?? '—');

                        const lat = Number.parseFloat(p.ubicacion_lat);
                        const lng = Number.parseFloat(p.ubicacion_lng);
                        const ubicacion = (Number.isFinite(lat) && Number.isFinite(lng))
                            ? { lat, lng }
                            : UBICACION_DEFAULT;

                        const fh = p.fecha_hora ? new Date(p.fecha_hora) : new Date(`${p.fecha}T${p.hora}`);
                        const finalizado = !!p.finalizado;

                        const mp = marcadorByPartidoId.get(String(p.id)) || null;
                        const golesLocal = Number(mp?.goles_local ?? 0);
                        const golesVisitante = Number(mp?.goles_visitante ?? 0);
                        const penalesLocal = Number(mp?.penales_local ?? 0);
                        const penalesVisitante = Number(mp?.penales_visitante ?? 0);

                        return {
                            id: p.id,
                            localId,
                            visitanteId,
                            local: localNombre,
                            visitante: visitanteNombre,
                            fecha: p.fecha,
                            hora: p.hora,
                            fechaHora: fh,
                            notas: p.notas,
                            ubicacion,
                            finalizado,
                            fase: p.fase ?? 'LIGA',
                            tipoPartido: p.tipo_partido ?? 'OFICIAL',
                            resultado: finalizado ? { golesLocal, golesVisitante, penalesLocal, penalesVisitante } : null
                        };
                    });

                    // UI: si ya se generó liguilla, bloquear creación de partidos OFICIALES
                    _aplicarRestriccionTipoPartido();
                }





        async function cargarAviso() {
            const { data, error } = await supabaseClient
                .from('avisos')
                .select('id, texto, created_at, updated_at')
                .eq('torneo_id', torneoActualId)
                .eq('activo', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Error cargando aviso:', error);
                return;
            }
            
            avisoActual = data ? data.texto : '';
            avisoActualObj = data ? data : null;
            syncAvisosAdminUI(true);
            mostrarAvisoBanner();
        }


        function _fmtFechaMX(iso) {
            if (!iso) return '—';
            try {
                return new Date(iso).toLocaleString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return String(iso);
            }
        }

        function _setBadge(el, kind, text) {
            if (!el) return;
            el.classList.remove('badge-muted', 'badge-ok', 'badge-warn');
            if (kind) el.classList.add(kind);
            el.textContent = text || '—';
        }

        function syncAvisosAdminUI(fromLoad = false) {
            // Solo si existen elementos (admin tab)
            const badge = document.getElementById('avisoEstadoBadge');
            const dt = document.getElementById('avisoUltimoFecha');
            const input = document.getElementById('avisoInput');
            const vista = document.getElementById('vistaPrevia');

            if (dt) dt.textContent = avisoActualObj?.created_at ? _fmtFechaMX(avisoActualObj.created_at) : '—';

            if (badge) {
                if (avisoActual) {
                    _setBadge(badge, 'badge-ok', 'Activo');
                } else {
                    _setBadge(badge, 'badge-muted', 'Sin aviso');
                }
            }

            // No pisar lo que el admin está escribiendo… a menos que:
            // - sea carga inicial
            // - el textarea esté vacío
            // - el textarea todavía trae exactamente lo que se cargó la última vez
            if (input && UI_IS_ADMIN) {
                const current = String(input.value || '');
                const canOverwrite = fromLoad || current.trim() === '' || _lastAvisoLoadedText === current;
                if (canOverwrite) {
                    input.value = avisoActual || '';
                    _lastAvisoLoadedText = input.value;
                }
            }

            // Vista previa: si el admin está escribiendo, mostramos lo que está escribiendo
            const previewText = (input && UI_IS_ADMIN) ? String(input.value || '') : (avisoActual || '');
            if (vista) vista.textContent = previewText.trim() ? previewText : 'Sin avisos publicados';

            updateAvisoCounter(previewText);
        }

        function updateAvisoCounter(text) {
            const counter = document.getElementById('avisoCounter');
            const wrap = counter?.parentElement;
            if (!counter) return;

            const len = String(text || '').length;
            counter.textContent = String(len);

            if (wrap) {
                wrap.classList.remove('is-hot', 'is-over');
                if (len > AVISO_MAX_CHARS) wrap.classList.add('is-over');
                else if (len >= Math.max(0, AVISO_MAX_CHARS - 40)) wrap.classList.add('is-hot');
            }
        }

        function onAvisoInputChange(value) {
            const input = document.getElementById('avisoInput');
            const texto = (typeof value === 'string') ? value : String(input?.value || '');
            const vista = document.getElementById('vistaPrevia');
            if (vista) vista.textContent = texto.trim() ? texto : 'Sin avisos publicados';
            updateAvisoCounter(texto);
        }

        async function cargarAvisosHistorial() {
            if (!UI_IS_ADMIN) return;
            if (!supabaseConfigured || !torneoActualId) return;

            const wrap = document.getElementById('avisosHistorial');
            if (wrap) wrap.innerHTML = '<div class="empty-state">Cargando…</div>';

            const { data, error } = await supabaseClient
                .from('avisos')
                .select('id, texto, activo, created_at, updated_at')
                .eq('torneo_id', torneoActualId)
                .order('created_at', { ascending: false })
                .limit(15);

            if (error) {
                console.error('Error cargando historial de avisos:', error);
                if (wrap) wrap.innerHTML = '<div class="empty-state">No se pudo cargar el historial.</div>';
                return;
            }

            avisosHistorial = Array.isArray(data) ? data : [];
            renderAvisosHistorial();
        }

        function renderAvisosHistorial() {
            const wrap = document.getElementById('avisosHistorial');
            if (!wrap) return;

            if (!avisosHistorial.length) {
                wrap.innerHTML = '<div class="empty-state">Sin historial todavía.</div>';
                return;
            }

            const html = avisosHistorial.map(a => {
                const id = String(a?.id || '');
                const activo = !!a?.activo;
                const dt = _fmtFechaMX(a?.created_at);
                const texto = String(a?.texto || '');

                const badge = activo
                    ? '<span class="badge badge-ok">Activo</span>'
                    : '<span class="badge badge-muted">Inactivo</span>';

                return `
                    <div class="aviso-item" data-aviso-id="${escapeHtml(id)}">
                        <div class="aviso-main">
                            <div class="aviso-item-top">
                                ${badge}
                                <span class="aviso-date">${escapeHtml(dt)}</span>
                            </div>
                            <div class="aviso-text">${escapeHtml(texto)}</div>
                        </div>
                        <div class="aviso-actions">
                            <button type="button" class="btn-chip" data-action="aviso-copiar" data-id="${escapeHtml(id)}">Copiar</button>
                            ${activo ? '' : `<button type="button" class="btn-chip" data-action="aviso-activar" data-id="${escapeHtml(id)}">Activar</button>`}
                            <button type="button" class="btn-chip danger" data-action="aviso-eliminar" data-id="${escapeHtml(id)}">Eliminar</button>
                        </div>
                    </div>
                `;
            }).join('');

            wrap.innerHTML = html;
        }

        async function cargarAvisosAdmin() {
            await cargarAviso();
            if (UI_IS_ADMIN) {
                await cargarAvisosHistorial();
            }
            syncAvisosAdminUI(false);
        }

        async function limpiarAvisoActual() {
            if (!UI_IS_ADMIN) return;
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }

            if (!confirm('¿Quitar el aviso actual? (Se conserva en historial como inactivo)')) return;

            showLoading();
            try {
                const { error } = await supabaseClient
                    .from('avisos')
                    .update({ activo: false })
                    .eq('torneo_id', torneoActualId)
                    .eq('activo', true);

                if (error) throw error;

                avisoActual = '';
                avisoActualObj = null;
                syncAvisosAdminUI(false);
                mostrarAvisoBanner();
                await cargarAvisosHistorial();
            } catch (err) {
                console.error('Error quitando aviso:', err);
                showError('Error al quitar el aviso');
            } finally {
                hideLoading();
            }
        }

        async function activarAvisoPorId(idRaw) {
            const id = String(idRaw || '').trim();
            if (!id) return;
            if (!UI_IS_ADMIN) return;
            if (!supabaseConfigured || !torneoActualId) return;

            showLoading();
            try {
                // 1) Desactivar cualquiera activo
                const off = await supabaseClient
                    .from('avisos')
                    .update({ activo: false })
                    .eq('torneo_id', torneoActualId)
                    .eq('activo', true);
                if (off.error) throw off.error;

                // 2) Activar el elegido
                const on = await supabaseClient
                    .from('avisos')
                    .update({ activo: true })
                    .eq('torneo_id', torneoActualId)
                    .eq('id', id)
                    .select('id, texto, created_at, updated_at')
                    .single();

                if (on.error) throw on.error;

                avisoActualObj = on.data || null;
                avisoActual = avisoActualObj?.texto ? String(avisoActualObj.texto) : '';
                _lastAvisoLoadedText = avisoActual;

                syncAvisosAdminUI(true);
                mostrarAvisoBanner();
                await cargarAvisosHistorial();
            } catch (err) {
                console.error('Error activando aviso:', err);
                showError('Error al activar el aviso');
            } finally {
                hideLoading();
            }
        }

        function copiarAvisoPorId(idRaw) {
            const id = String(idRaw || '').trim();
            if (!id) return;
            const row = (avisosHistorial || []).find(a => String(a?.id || '') === id);
            if (!row) return;

            const input = document.getElementById('avisoInput');
            if (input) {
                input.value = String(row.texto || '');
                updateAvisoCounter(input.value);
            }

            onAvisoInputChange(String(row.texto || ''));
        }

        async function eliminarAvisoPorId(idRaw) {
            const id = String(idRaw || '').trim();
            if (!id) return;
            if (!UI_IS_ADMIN) return;
            if (!supabaseConfigured || !torneoActualId) return;

            const aviso = (avisosHistorial || []).find(a => String(a?.id || '') === id);
            const isActive = !!aviso?.activo;

            const msg = isActive
                ? 'Este aviso está ACTIVO. Si lo eliminas, el público se queda sin aviso. ¿Eliminar de todos modos?'
                : '¿Eliminar este aviso del historial?';

            if (!confirm(msg)) return;

            showLoading();
            try {
                const { error } = await supabaseClient
                    .from('avisos')
                    .delete()
                    .eq('torneo_id', torneoActualId)
                    .eq('id', id);

                if (error) throw error;

                // si borraste el activo, refrescamos activo
                await cargarAviso();
                await cargarAvisosHistorial();
                syncAvisosAdminUI(true);
            } catch (err) {
                console.error('Error eliminando aviso:', err);
                showError('Error al eliminar el aviso');
            } finally {
                hideLoading();
            }
        }

        async function refrescarAvisosAdmin() {
            if (!supabaseConfigured || !torneoActualId) return;
            showLoading();
            try {
                await cargarAvisosAdmin();
            } catch (err) {
                console.error('Error refrescando avisos:', err);
            } finally {
                hideLoading();
            }
        }
        // ==========================================
        // FUNCIONES DE TABS Y UI
        // ==========================================
        
        function showTab(tabName, e) {
            if (!torneoActualId) return;

            // Ocultar/mostrar secciones
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(tabName);
            if (section) section.classList.add('active');

            // Marcar tab activo
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

            // Si viene de evento delegado, el botón real está en e.target (no en currentTarget)
            const btnFromEvent = e?.target?.closest?.('.tab[data-action="tab"]');

            // Fallback: si showTab se llama sin evento (por código), buscamos el tab por data-tab
            const btn = btnFromEvent || document.querySelector(`.tab[data-action="tab"][data-tab="${tabName}"]`);

            if (btn) btn.classList.add('active');

            // Cargar estadísticas al abrir la pestaña
            if (tabName === 'estadisticas') {
                // No bloqueamos UI: se carga en background
                cargarEstadisticasLectura();
            }

            // Liguilla (solo lectura)
            if (tabName === 'liguilla') {
                cargarLiguilla();
            }

            // Calendario: respetar filtro actual
            if (tabName === 'enfrentamientos') {
                filtrarPartidos(filtroActual);
            }

        }

        // ==========================================
        // FUNCIONES DE EQUIPOS
        // ==========================================

        // ==========================================
        // Validación de nombre único de EQUIPOS (solo front)
        // - Evita duplicados ignorando mayúsculas y espacios
        // - Aplica tanto en "Agregar Equipo" como en el modal "Nuevo/Editar equipo"
        // ==========================================
        let __validateNombreEquipoFormFn = null;
        let __validateNombreEquipoAdminFn = null;

        function __normEquipoNombre(v) {
            return String(v ?? '')
                .trim()
                .replace(/\s+/g, ' ')
                .toLowerCase();
        }

        function __isNombreEquipoDuplicadoLocal(nombre, excludeId = null) {
            if (!torneoActualId) return false;
            const n = __normEquipoNombre(nombre);
            if (!n) return false;

            return (equipos || [])
                .filter(e => e && e.activo !== false)
                .some(e => __normEquipoNombre(e.nombre) === n && (!excludeId || String(e.id) !== String(excludeId)));
        }

        function __ensureInlineError(afterEl, id) {
            if (!afterEl) return null;
            let el = document.getElementById(id);
            if (el) return el;

            el = document.createElement('div');
            el.id = id;
            el.className = 'field-error';
            el.style.display = 'none';

            // Insertar justo después del input
            const parent = afterEl.parentElement;
            if (!parent) return el;

            if (afterEl.nextSibling) parent.insertBefore(el, afterEl.nextSibling);
            else parent.appendChild(el);

            return el;
        }

        function __setNombreEquipoUx(input, btn, errEl, duplicated, message) {
            if (duplicated) {
                if (input) input.classList.add('input-error');
                if (errEl) {
                    errEl.textContent = message || 'Ya existe un equipo con ese nombre.';
                    errEl.style.display = '';
                }
                if (btn) {
                    btn.classList.add('btn-disabled');
                    btn.disabled = true;
                    btn.setAttribute('aria-disabled', 'true');
                }
            } else {
                if (input) input.classList.remove('input-error');
                if (errEl) {
                    errEl.textContent = '';
                    errEl.style.display = 'none';
                }
                if (btn) {
                    btn.classList.remove('btn-disabled');
                    btn.disabled = false;
                    btn.removeAttribute('aria-disabled');
                }
            }
        }

        function __wireEquipoNombreForm() {
            if (__validateNombreEquipoFormFn) return;

            const form = document.getElementById('formEquipo');
            const input = document.getElementById('nombreEquipo');
            if (!form || !input) return;

            const btn = form.querySelector('button[type="submit"]');
            const errEl = __ensureInlineError(input, 'equipoNombreErrorForm');

            __validateNombreEquipoFormFn = () => {
                const val = String(input.value ?? '');
                // Si no hay torneo seleccionado o está vacío, no bloqueamos (la validación de vacío ya existe)
                const duplicated = !!val.trim() && __isNombreEquipoDuplicadoLocal(val, null);
                __setNombreEquipoUx(input, btn, errEl, duplicated, 'Ya existe un equipo con ese nombre en este torneo.');
                return !duplicated;
            };

            input.addEventListener('input', __validateNombreEquipoFormFn);
            input.addEventListener('blur', __validateNombreEquipoFormFn);

            // Freno extra: aunque el botón no esté disabled por algún motivo, bloqueamos submit
            form.addEventListener('submit', (ev) => {
                if (__validateNombreEquipoFormFn && !__validateNombreEquipoFormFn()) {
                    ev.preventDefault();
                    ev.stopPropagation();
                }
            });
        }

        function __wireEquipoNombreAdminModal() {
            if (__validateNombreEquipoAdminFn) return;

            const input = document.getElementById('equipoNombreAdmin');
            const modal = document.getElementById('modalEquipoAdmin');
            if (!input || !modal) return;

            const btn = modal.querySelector('[data-action="equipo-admin-guardar"]');
            const errEl = __ensureInlineError(input, 'equipoNombreErrorAdmin');

            __validateNombreEquipoAdminFn = () => {
                const val = String(input.value ?? '');
                const excludeId = (equipoModalModo === 'edit') ? (equipoModalId ? String(equipoModalId) : null) : null;
                const duplicated = !!val.trim() && __isNombreEquipoDuplicadoLocal(val, excludeId);
                __setNombreEquipoUx(input, btn, errEl, duplicated, 'Ya existe otro equipo con ese nombre en este torneo.');
                return !duplicated;
            };

            input.addEventListener('input', __validateNombreEquipoAdminFn);
            input.addEventListener('blur', __validateNombreEquipoAdminFn);
        }

        function __revalidateEquipoNombreInputs() {
            try { __validateNombreEquipoFormFn?.(); } catch {}
            try { __validateNombreEquipoAdminFn?.(); } catch {}
        }


        
        async function agregarEquipo(e) {
            e.preventDefault();
            
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }


            const nombreInput = document.getElementById('nombreEquipo');
            if (!nombreInput) return;

            const nombre = nombreInput.value.trim();
            if (!nombre) {
                alert('Escribe el nombre del equipo');
                return;
            }

            // Validación front: evitar nombres duplicados (sin depender de constraints en BD)
            if (__isNombreEquipoDuplicadoLocal(nombre, null)) {
                __revalidateEquipoNombreInputs();
                alert('Ya existe un equipo con ese nombre en este torneo.');
                return;
            }

            showLoading();
            try {
                const { data, error } = await supabaseClient
                                                            .from('equipos')
                                                            .insert([{ nombre, torneo_id: torneoActualId }])  // ✅
                                                            .select()
                                                            .single();

                if (error) {
                    if (error.code === '23505') {
                        alert('Este equipo ya está registrado');
                    } else {
                        throw error;
                    }
                    return;
                }

                equipos.push(data);
                __revalidateEquipoNombreInputs();

                const formEquipo = document.getElementById('formEquipo');
                if (formEquipo) formEquipo.reset();
				
                await cargarPosiciones();
                actualizarVistas();
            } catch (error) {
                console.error('Error:', error);
                showError('Error al agregar equipo');
            } finally {
                hideLoading();
            }
        }

        async function eliminarEquipo(nombre) {
            if (!confirm(`¿Eliminar a ${nombre}?`)) return;

            showLoading();
            try {
                const { error } = await supabaseClient
                    .from('equipos')
                    .delete()
                    .eq('torneo_id', torneoActualId)
                    .eq('nombre', nombre);

                if (error) throw error;

                await supabaseClient
                    .from('partidos')
                    .delete()
                    .eq('torneo_id', torneoActualId)
                    .or(`local.eq.${nombre},visitante.eq.${nombre}`);

                equipos = equipos.filter(eq => eq.nombre !== nombre);
                enfrentamientosProgramados = enfrentamientosProgramados.filter(
                    p => p.local !== nombre && p.visitante !== nombre
                );

                actualizarVistas();
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (error) {
                console.error('Error:', error);
                showError('Error al eliminar equipo');
            } finally {
                hideLoading();
            }
        }

        // ===== Modal: Administrar equipo (editar / eliminar) =====
        let equipoModalId = null;
        let equipoModalNombreOriginal = null;
        let equipoModalModo = 'edit'; // 'edit' | 'create'

        function abrirModalEquipoAdmin(equipoId, nombreActual, modo = 'edit') {
            equipoModalModo = (modo === 'create') ? 'create' : 'edit';

            // Guardar referencia del equipo seleccionado
            equipoModalId = (equipoModalModo === 'create') ? null : (equipoId ? String(equipoId) : null);
            equipoModalNombreOriginal = String(nombreActual ?? '').trim();

            const modal = document.getElementById('modalEquipoAdmin');
            const input = document.getElementById('equipoNombreAdmin');
            const confirmBox = document.getElementById('equipoAdminConfirmDelete');
            const titulo = document.getElementById('tituloModalEquipoAdmin');
            const btnDes = document.getElementById('btnEquipoAdminDesactivar');

            const eq = equipoModalId ? (equipos || []).find(x => String(x.id) === String(equipoModalId)) : null;
            const equipoInactivo = !!(eq && eq.activo === false);

            if (confirmBox) confirmBox.style.display = 'none';
            if (input) {
                input.value = (equipoModalModo === 'create') ? '' : equipoModalNombreOriginal;
                // enfocar después de render
                setTimeout(() => input.focus(), 0);
            }

            if (titulo) titulo.textContent = (equipoModalModo === 'create') ? 'Nuevo equipo' : 'Equipo';

            // En modo crear: ocultar desactivar. En modo editar: ocultar si ya está inactivo.
            if (btnDes) {
                if (equipoModalModo === 'create' || equipoInactivo) {
                    btnDes.style.display = 'none';
                } else {
                    btnDes.style.display = 'inline-flex';
                }
            }

            if (modal) modal.classList.add('show');
        }

        function abrirModalEquipoNuevo() {
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            abrirModalEquipoAdmin(null, '', 'create');
        }

        function abrirModalEquipoSeleccionado() {
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            if (!equipoJugadoresId) {
                alert('Selecciona un equipo primero');
                return;
            }
            const eq = (equipos || []).find(x => String(x.id) === String(equipoJugadoresId));
            abrirModalEquipoAdmin(equipoJugadoresId, eq?.nombre ?? '');
        }

        function cerrarModalEquipoAdmin() {
            const modal = document.getElementById('modalEquipoAdmin');
            const confirmBox = document.getElementById('equipoAdminConfirmDelete');
            const btnDes = document.getElementById('btnEquipoAdminDesactivar');
            if (confirmBox) confirmBox.style.display = 'none';
            if (modal) modal.classList.remove('show');

            if (btnDes) btnDes.style.display = 'inline-flex';

            equipoModalId = null;
            equipoModalNombreOriginal = null;
            equipoModalModo = 'edit';
        }

        function mostrarConfirmEliminarEquipoAdmin() {
            const confirmBox = document.getElementById('equipoAdminConfirmDelete');
            if (confirmBox) confirmBox.style.display = 'block';
        }

        function cancelarEliminarEquipoAdmin() {
            const confirmBox = document.getElementById('equipoAdminConfirmDelete');
            if (confirmBox) confirmBox.style.display = 'none';
        }

        async function confirmarEliminarEquipoAdmin() {
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            if (!equipoModalId) {
                showError('No se encontró el ID del equipo');
                return;
            }

            const nombre = equipoModalNombreOriginal;

            showLoading();
            try {
                // 1) Desactivar equipo (NO borrar)
                const { error: errEq } = await supabaseClient
                    .from('equipos')
                    .update({ activo: false })
                    .eq('torneo_id', torneoActualId)
                    .eq('id', equipoModalId);

                if (errEq) throw errEq;

                // 2) Estado en memoria (no lo quitamos, solo marcamos)
                equipos = (equipos || []).map(eq =>
                    String(eq.id) === String(equipoModalId) ? { ...eq, activo: false } : eq
                );

                cerrarModalEquipoAdmin();

                // 3) Refrescar UI
                actualizarVistas();
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (error) {
                console.error('Error:', error);
                showError('Error al desactivar equipo');
            } finally {
                hideLoading();
            }
        }

        async function guardarCambiosEquipoAdmin() {
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            const input = document.getElementById('equipoNombreAdmin');
            const nombreNuevo = String(input?.value ?? '').trim();
            const nombreAnterior = equipoModalNombreOriginal;

            if (!nombreNuevo) {
                alert('El nombre no puede ir vacío');
                if (input) input.focus();
                return;
            }

            // Validación front: evitar nombres duplicados (sin depender de constraints en BD)
            const __excludeId = (equipoModalModo === 'edit') ? (equipoModalId ? String(equipoModalId) : null) : null;
            if (__isNombreEquipoDuplicadoLocal(nombreNuevo, __excludeId)) {
                __revalidateEquipoNombreInputs();
                alert('Ya existe un equipo con ese nombre en este torneo.');
                if (input) input.focus();
                return;
            }


            // ===== Crear equipo =====
            if (equipoModalModo === 'create' || !equipoModalId) {
                showLoading();
                try {
                    const payload = { nombre: nombreNuevo, torneo_id: torneoActualId, activo: true };

                    let { data, error } = await supabaseClient
                        .from('equipos')
                        .insert([payload])
                        .select()
                        .single();

                    if (error && typeof isMissingColumn === 'function' && isMissingColumn(error, 'activo')) {
                        delete payload.activo;
                        const res2 = await supabaseClient
                            .from('equipos')
                            .insert([payload])
                            .select()
                            .single();
                        data = res2.data;
                        error = res2.error;
                    }

                    if (error) {
                        if (error.code === '23505') {
                            alert('Ya existe un equipo con ese nombre en este torneo');
                            return;
                        }
                        throw error;
                    }

                    const nuevo = {
                        ...data,
                        pj: data?.pj ?? 0,
                        pg: data?.pg ?? 0,
                        pe: data?.pe ?? 0,
                        pp: data?.pp ?? 0,
                        gf: data?.gf ?? 0,
                        gc: data?.gc ?? 0,
                        pts: data?.pts ?? 0,
                    };

                    equipos.push(nuevo);
                    __revalidateEquipoNombreInputs();
                    equiposById?.set?.(String(nuevo.id), nuevo.nombre);

                    cerrarModalEquipoAdmin();

                    // Seleccionar equipo recién creado en la pantalla de jugadores
                    actualizarSelectJugadores();


                    actualizarVistas();
                } catch (error) {
                    console.error('Error:', error);
                    showError('Error al crear equipo');
                } finally {
                    hideLoading();
                }
                return;
            }

            // ===== Editar equipo =====
            if (nombreNuevo === nombreAnterior) {
                cerrarModalEquipoAdmin();
                return;
            }

            showLoading();
            try {
                // 1) Renombrar equipo por ID
                const { error: errEquipo } = await supabaseClient
                    .from('equipos')
                    .update({ nombre: nombreNuevo })
                    .eq('torneo_id', torneoActualId)
                    .eq('id', equipoModalId);

                if (errEquipo) {
                    if (errEquipo.code === '23505') {
                        alert('Ya existe un equipo con ese nombre en este torneo');
                        return;
                    }
                    throw errEquipo;
                }

                // 2) Mantener consistencia en partidos (se guardan por nombre)
                const { error: errLocal } = await supabaseClient
                    .from('partidos')
                    .update({ local: nombreNuevo })
                    .eq('torneo_id', torneoActualId)
                    .eq('local', nombreAnterior);
                if (errLocal) throw errLocal;

                const { error: errVisitante } = await supabaseClient
                    .from('partidos')
                    .update({ visitante: nombreNuevo })
                    .eq('torneo_id', torneoActualId)
                    .eq('visitante', nombreAnterior);
                if (errVisitante) throw errVisitante;

                // 3) Estado en memoria
                equipos = equipos.map(eq => {
                    if (String(eq.id) === String(equipoModalId)) return { ...eq, nombre: nombreNuevo };
                    return eq;
                });

                enfrentamientosProgramados = (enfrentamientosProgramados || []).map(p => ({
                    ...p,
                    local: p.local === nombreAnterior ? nombreNuevo : p.local,
                    visitante: p.visitante === nombreAnterior ? nombreNuevo : p.visitante
                }));

                if (proximoEnfrentamiento) {
                    proximoEnfrentamiento = {
                        ...proximoEnfrentamiento,
                        local: proximoEnfrentamiento.local === nombreAnterior ? nombreNuevo : proximoEnfrentamiento.local,
                        visitante: proximoEnfrentamiento.visitante === nombreAnterior ? nombreNuevo : proximoEnfrentamiento.visitante
                    };
                }

                if (equipoFiltroSeleccionado === nombreAnterior) {
                    equipoFiltroSeleccionado = nombreNuevo;
                }

                __revalidateEquipoNombreInputs();

                cerrarModalEquipoAdmin();

                actualizarVistas();
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (error) {
                console.error('Error:', error);
                showError('Error al editar equipo');
            } finally {
                hideLoading();
            }
        }

        



        

        

// ==========================================
        // FUNCIONES DE PARTIDOS
        // ==========================================

        // Regla: cuando ya existe liguilla generada, bloquear creación de partidos OFICIALES (solo AMISTOSO)
        function _liguillaYaGenerada() {
            try {
                return Array.isArray(enfrentamientosProgramados)
                    && enfrentamientosProgramados.some(p => String(p?.fase || '').toUpperCase() === 'LIGUILLA');
            } catch {
                return false;
            }
        }

        function _aplicarRestriccionTipoPartido() {
            if (!UI_IS_ADMIN) return;
            const sel = document.getElementById('tipoPartido');
            if (!sel) return;

            const locked = _liguillaYaGenerada();

            const optOficial = sel.querySelector('option[value="OFICIAL"]');
            if (optOficial) optOficial.disabled = !!locked;

            // Si está bloqueado, forzamos amistoso para evitar "accidentes"
            if (locked) sel.value = 'AMISTOSO';

            // Mensaje UI (se crea una vez)
            let msg = document.getElementById('tipoPartidoLockMsg');
            if (!msg) {
                msg = document.createElement('div');
                msg.id = 'tipoPartidoLockMsg';
                msg.style.marginTop = '6px';
                msg.style.fontSize = '12px';
                msg.style.opacity = '0.9';
                sel.parentElement?.appendChild(msg);
            }

            if (msg) {
                msg.textContent = locked
                    ? '🔒 Liguilla generada: ya no puedes crear partidos OFICIALES. Solo AMISTOSOS.'
                    : '';
                msg.style.display = locked ? 'block' : 'none';
            }
        }
        
        async function configurarEnfrentamiento(e) {
            e.preventDefault();

            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }


            const localSelect = document.getElementById('enfrentamientoLocal');
            const visitanteSelect = document.getElementById('enfrentamientoVisitante');
            const fechaInput = document.getElementById('fechaPartido');
            const horaInput = document.getElementById('horaPartido');
            const notasInput = document.getElementById('notasPartido');
            const tipoSelect = document.getElementById('tipoPartido');
            const tipoPartido = (tipoSelect && tipoSelect.value) ? tipoSelect.value : 'OFICIAL';

            if (!localSelect || !visitanteSelect || !fechaInput || !horaInput) {
                console.error('Faltan elementos del formulario');
                return;
            }

            const localId = localSelect.value;       
			const visitanteId = visitanteSelect.value; 
            const fecha = fechaInput.value;
            const hora = horaInput.value;
            const notas = notasInput ? notasInput.value.trim() : '';

            if (!localId || !visitanteId || !fecha || !hora) {
                alert('Completa todos los campos');
                return;
            }


           if (localId === visitanteId) {
                alert('Debes seleccionar equipos diferentes');
                return;
            }

            // 🚫 Regla: si ya se generó liguilla, NO permitir crear partidos OFICIALES
            // (Solo AMISTOSO para no alterar tabla/estadísticas/flujo de liguilla)
            if (_liguillaYaGenerada() && String(tipoPartido || 'OFICIAL').toUpperCase() !== 'AMISTOSO') {
                _aplicarRestriccionTipoPartido();
                alert('Ya se generó la liguilla. A partir de ahora solo puedes programar partidos AMISTOSOS.');
                return;
            }

            
            // Nombres para UI (y opcionalmente guardarlos también en DB como respaldo)
            const localNombre =
                equiposById.get(String(localId)) ??
                localSelect.selectedOptions?.[0]?.textContent?.trim() ??
                '';

            const visitanteNombre =
                equiposById.get(String(visitanteId)) ??
                visitanteSelect.selectedOptions?.[0]?.textContent?.trim() ??
                '';

            const fechaHora = new Date(`${fecha}T${hora}`);
            if (Number.isNaN(fechaHora.getTime())) {
                alert('Fecha u hora inválida');
                return;
            }

            showLoading();
            try {
                const { data, error } = await supabaseClient
                    .from('partidos')
                    .insert([{
                        torneo_id: torneoActualId,
                        local_id: localId,
        				visitante_id: visitanteId,
                        local: localNombre,
        				visitante: visitanteNombre,
                        fecha,
                        hora,
                        fecha_hora: fechaHora.toISOString(),
                        notas,
                        ubicacion_lat: UBICACION_DEFAULT.lat,
                        ubicacion_lng: UBICACION_DEFAULT.lng,
                        tipo_partido: tipoPartido,
                        fase: (tipoPartido === 'AMISTOSO') ? 'AMISTOSO' : 'LIGA'
                    }])
                    .select()
                    .single();

                if (error) throw error;

                enfrentamientosProgramados.push({
                    id: data.id,
                    localId: String(localId),
    				visitanteId: String(visitanteId),
    				local: localNombre,
    				visitante: visitanteNombre,
                    fecha,
                    hora,
                    notas,
                    fechaHora,
                    ubicacion: UBICACION_DEFAULT,
                    tipoPartido: tipoPartido,
                    fase: (tipoPartido === 'AMISTOSO') ? 'AMISTOSO' : 'LIGA'
                });

                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();

                const form = document.getElementById('formEnfrentamiento');
                if (form) form.reset();
                setFechaPartidoDefault({ force: true });

            } catch (error) {
                console.error('Error:', error);
                showError('Error al programar partido');
            } finally {
                hideLoading();
            }
        }

        async function eliminarEnfrentamiento(index) {
            if (!confirm('¿Eliminar este partido programado?')) return;

            const partido = enfrentamientosProgramados[index];

            // 🚫 No permitir borrar partidos de LIGUILLA (solo editar)
            if (String(partido?.fase ?? '').toUpperCase() === 'LIGUILLA') {
                alert('Los partidos de Liguilla no se pueden eliminar. Solo puedes editarlos.');
                return;
            }

showLoading();
            try {
                const { error } = await supabaseClient
                    .from('partidos')
                    .delete()
                    .eq('id', partido.id)
                    .eq('torneo_id', torneoActualId);

                if (error) throw error;

                enfrentamientosProgramados.splice(index, 1);
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (error) {
                console.error('Error:', error);
                showError('Error al eliminar partido');
            } finally {
                hideLoading();
            }
        }

        // ==========================================
        // FUNCIONES DE EDICIÓN
        // ==========================================
        
        function abrirModalEditar(index) {
            const partido = enfrentamientosProgramados[index];
            if (!partido) return;

            indiceEditando = index;

			const editarPartidoTexto = document.getElementById('editarPartidoTexto');
			const editarNotas = document.getElementById('editarNotas');
			const camposFechaHora = document.getElementById('camposFechaHora');
			const camposResultado = document.getElementById('camposResultado');
			const tituloModal = document.getElementById('tituloModal');
			const btnGuardar = document.getElementById('btnGuardar');
			const editarFecha = document.getElementById('editarFecha');
			const editarHora = document.getElementById('editarHora');
			const chkFinalizado = document.getElementById('editarFinalizado');
			const marcadorTexto = document.getElementById('marcadorTexto');
			const marcadorSub = document.getElementById('marcadorSub');

			if (!editarPartidoTexto || !editarNotas || !camposFechaHora || !camposResultado || !tituloModal || !btnGuardar || !chkFinalizado || !marcadorTexto || !marcadorSub) {
				console.error('Faltan elementos del modal');
				return;
			}

			editarPartidoTexto.value = `${partido.local} vs ${partido.visitante}`;
			editarNotas.value = partido.notas || '';
			if (editarFecha) editarFecha.value = partido.fecha || '';
			if (editarHora) editarHora.value = partido.hora || '';

			// Siempre mostramos marcador + finalizado (marcador se calcula por eventos)
			camposResultado.style.display = 'block';
			camposFechaHora.style.display = 'block';

			chkFinalizado.checked = !!partido.finalizado;
			// Marcador inicial (si está finalizado ya viene desde la tabla marcadores_partido)
			const marcador = partido.resultado ? { golesLocal: partido.resultado.golesLocal, golesVisitante: partido.resultado.golesVisitante, penalesLocal: partido.resultado.penalesLocal ?? 0, penalesVisitante: partido.resultado.penalesVisitante ?? 0 } : { golesLocal: 0, golesVisitante: 0, penalesLocal: 0, penalesVisitante: 0 };
			marcadorTexto.textContent = `${marcador.golesLocal} - ${marcador.golesVisitante}`;
			marcadorSub.textContent = partido.finalizado ? '✅ Oficial (cuenta para tabla)' : '📝 Previo (aún no cuenta)';

			// Penales: solo si es liguilla y hay empate
			actualizarPenalesModalUI(partido, marcador);

			// Autosave de campos "suaves" (fecha/hora/notas/penales) (mejora 10)
			setupAutosaveEditarModal(partido);

			tituloModal.textContent = partido.finalizado ? 'Editar Partido (finalizado)' : 'Editar Partido';
			btnGuardar.textContent = 'Guardar Cambios';

			// Inicializar sección de eventos (no rompe si la tabla no existe)
			partidoEditandoId = partido.id ? String(partido.id) : null;
			void initEventosModal(partido);

			const modalEditar = document.getElementById('modalEditar');
			if (modalEditar) {
				// Actualizar link de ubicación del modal
				const link = modalEditar.querySelector?.('.ubicacion-link');
				if (link && partido?.ubicacion?.lat != null && partido?.ubicacion?.lng != null) {
					link.href = `https://maps.google.com/?q=${partido.ubicacion.lat},${partido.ubicacion.lng}`;
				}
				modalEditar.classList.add('show');
			}
        }

        // Abrir el modal de edición a partir del ID del partido
        // (útil para hacer click en la tarjeta del bracket de liguilla)
        async function abrirModalEditarPorPartidoId(partidoId) {
            const pid = String(partidoId || '').trim();
            if (!pid) return;

            let idx = (enfrentamientosProgramados || []).findIndex(p => String(p.id) === pid);
            if (idx < 0) {
                // Refrescar la lista (sin recargar toda la página)
                await cargarPartidos();
                idx = (enfrentamientosProgramados || []).findIndex(p => String(p.id) === pid);
            }

            if (idx < 0) {
                alert('No encontré ese partido en el calendario. Intenta en la pestaña Calendario.');
                return;
            }

            abrirModalEditar(idx);
        }

        function cerrarModal() {
            const modalEditar = document.getElementById('modalEditar');
            const formEditarPartido = document.getElementById('formEditarPartido');

            if (modalEditar) modalEditar.classList.remove('show');
            if (formEditarPartido) formEditarPartido.reset();

			const editarFecha = document.getElementById('editarFecha');
			const editarHora = document.getElementById('editarHora');
			if (editarFecha) editarFecha.required = false;
			if (editarHora) editarHora.required = false;

            // Limpiar eventos
            partidoEditandoId = null;
            eventosPartido = [];
            eventoEquipoSeleccionadoId = null;
            limpiarEventosModalUI();

            indiceEditando = -1;
        }

        // ==========================================
        // AUTOSAVE "suave" en el modal (mejora 10)
        // Guarda: notas, fecha/hora, y penales (sin finalizar el partido)
        // ==========================================
        let __autosaveTimer = null;
        let __autosavePid = null;
        let __autosaveLastKey = '';

        function setAutosaveStatus(text, kind = '') {
            const el = document.getElementById('autosaveEstado');
            if (!el) return;
            el.textContent = text || '';
            el.className = `autosave-status ${kind}`.trim();
        }

        function setupAutosaveEditarModal(partido) {
            if (!UI_IS_ADMIN) return;
            if (!partido || !partido.id) return;

            __autosavePid = String(partido.id);
            __autosaveLastKey = '';
            setAutosaveStatus('', '');

            const modal = document.getElementById('modalEditar');
            if (!modal) return;

            if (modal.__autosaveBound) return;
            modal.__autosaveBound = true;

            const bind = (id) => {
                const inp = document.getElementById(id);
                if (!inp) return;
                inp.addEventListener('input', queueAutosaveEditarModal);
                inp.addEventListener('change', queueAutosaveEditarModal);
            };

            ['editarNotas', 'editarFecha', 'editarHora', 'editarPenalesLocal', 'editarPenalesVisitante'].forEach(bind);
        }

        function queueAutosaveEditarModal() {
            if (!UI_IS_ADMIN) return;
            if (!supabaseConfigured || !torneoActualId) return;
            if (!__autosavePid) return;

            if (__autosaveTimer) clearTimeout(__autosaveTimer);
            __autosaveTimer = setTimeout(doAutosaveEditarModal, 650);
        }

        async function doAutosaveEditarModal() {
            try {
                if (!UI_IS_ADMIN) return;
                if (!supabaseConfigured || !torneoActualId) return;
                const pid = String(__autosavePid || '').trim();
                if (!pid) return;

                const editarNotas = document.getElementById('editarNotas');
                const editarFecha = document.getElementById('editarFecha');
                const editarHora = document.getElementById('editarHora');
                const inputPL = document.getElementById('editarPenalesLocal');
                const inputPV = document.getElementById('editarPenalesVisitante');

                const notas = String(editarNotas?.value || '').trim();
                const fecha = String(editarFecha?.value || '').trim();
                const hora = String(editarHora?.value || '').trim();

                const rawPL = String(inputPL?.value || '').trim();
                const rawPV = String(inputPV?.value || '').trim();
                const pl = rawPL === '' ? null : parseInt(rawPL, 10);
                const pv = rawPV === '' ? null : parseInt(rawPV, 10);

                const key = `${pid}|${notas}|${fecha}|${hora}|${pl ?? ''}|${pv ?? ''}`;
                if (key === __autosaveLastKey) return;
                __autosaveLastKey = key;

                setAutosaveStatus('Guardando…', 'saving');

                const upd = { notas };
                if (fecha && hora) {
                    const dt = new Date(`${fecha}T${hora}`);
                    if (!Number.isNaN(dt.getTime())) {
                        upd.fecha = fecha;
                        upd.hora = hora;
                        upd.fecha_hora = dt.toISOString();
                    }
                }

                const { error } = await supabaseClient
                    .from('partidos')
                    .update(upd)
                    .eq('id', pid)
                    .eq('torneo_id', torneoActualId);

                if (error) throw error;

                // Guardar penales si están capturados (sin tocar goles)
                if (pl != null && pv != null && !Number.isNaN(pl) && !Number.isNaN(pv)) {
                    const marcadorDb = await fetchMarcadorPartidoDesdeBD(pid);
                    await upsertMarcadorPartidoEnBD(pid, {
                        golesLocal: Number(marcadorDb?.golesLocal ?? 0),
                        golesVisitante: Number(marcadorDb?.golesVisitante ?? 0),
                        penalesLocal: Number(pl ?? 0),
                        penalesVisitante: Number(pv ?? 0),
                    });
                }

                setAutosaveStatus('Guardado ✅', 'ok');
                // limpiar texto después de un rato
                setTimeout(() => {
                    const el = document.getElementById('autosaveEstado');
                    if (el && el.textContent === 'Guardado ✅') el.textContent = '';
                }, 1400);

                // Invalidate cache ligera de liguilla para que refresque el horario visible
                try { __LF_CACHE.liguillaByTorneo?.delete?.(torneoActualId); } catch {}
            } catch (e) {
                console.warn('Autosave error:', e);
                setAutosaveStatus('No se pudo guardar', 'err');
            }
        }

        async function guardarEdicion(e) {
            e.preventDefault();

            if (indiceEditando === -1) return;

            const partido = enfrentamientosProgramados[indiceEditando];
            if (!partido) return;

            const editarNotas = document.getElementById('editarNotas');
            const editarFecha = document.getElementById('editarFecha');
            const editarHora = document.getElementById('editarHora');
            const chkFinalizado = document.getElementById('editarFinalizado');

            if (!editarNotas || !chkFinalizado) return;

            const nuevasNotas = editarNotas.value.trim();
            const finalizadoNuevo = !!chkFinalizado.checked;

            // Confirmación al finalizar (mejora 9)
            if (finalizadoNuevo && !partido.finalizado) {
                const msg = `Vas a finalizar este partido:\n\n${partido.local} vs ${partido.visitante}\n\n¿Confirmas?`;
                if (!confirm(msg)) {
                    return;
                }
            }

            // Penales (solo aplica a liguilla cuando hay empate)
            const inputPL = document.getElementById('editarPenalesLocal');
            const inputPV = document.getElementById('editarPenalesVisitante');
            let penalesLocal = null;
            let penalesVisitante = null;
            if (inputPL && inputPV) {
                const rawPL = String(inputPL.value || '').trim();
                const rawPV = String(inputPV.value || '').trim();
                if (rawPL !== '') penalesLocal = parseInt(rawPL, 10);
                if (rawPV !== '') penalesVisitante = parseInt(rawPV, 10);
                if (penalesLocal !== null && Number.isNaN(penalesLocal)) penalesLocal = null;
                if (penalesVisitante !== null && Number.isNaN(penalesVisitante)) penalesVisitante = null;
            }

            let actualizacionPartido = {
				notas: nuevasNotas,
				finalizado: finalizadoNuevo
			};

            showLoading();
            try {
				// Fecha/hora (si vienen)
				if (editarFecha && editarHora) {
					const nuevaFecha = String(editarFecha.value || '').trim();
					const nuevaHora = String(editarHora.value || '').trim();
					if (nuevaFecha && nuevaHora) {
						const nuevaFechaHora = new Date(`${nuevaFecha}T${nuevaHora}`);
						if (Number.isNaN(nuevaFechaHora.getTime())) {
							alert('Fecha u hora inválida');
							return;
						}
						actualizacionPartido = {
							...actualizacionPartido,
							fecha: nuevaFecha,
							hora: nuevaHora,
							fecha_hora: nuevaFechaHora.toISOString()
						};
						partido.fecha = nuevaFecha;
						partido.hora = nuevaHora;
						partido.fechaHora = nuevaFechaHora;
					}
				}

				// Si se finaliza, opcionalmente marcamos timestamp
				if (finalizadoNuevo && !partido.finalizado) {
					actualizacionPartido = { ...actualizacionPartido, finalizado_at: new Date().toISOString() };
				}
				if (!finalizadoNuevo) {
					// si lo reabres, limpiamos timestamp (si existe)
					actualizacionPartido = { ...actualizacionPartido, finalizado_at: null };
				}

	
			// IMPORTANT: si vas a finalizar, primero guardamos el marcador (y penales si aplica)
			if (finalizadoNuevo) {
				// Marcador base: preferimos eventos si existen
				let marcadorCalc = null;
				if (Array.isArray(eventosPartido) && eventosPartido.length > 0) {
					marcadorCalc = calcularMarcadorDesdeEventos(partido, eventosPartido);
				} else {
					marcadorCalc = await fetchMarcadorPartidoDesdeBD(partido.id);
				}

				const gl = Number(marcadorCalc?.golesLocal ?? 0);
				const gv = Number(marcadorCalc?.golesVisitante ?? 0);

				const esLiguilla = String(partido?.fase || '').toUpperCase() === 'LIGUILLA';
				const empate = (gl === gv);

				let pl = Number(penalesLocal ?? 0);
				let pv = Number(penalesVisitante ?? 0);
				if (esLiguilla && empate) {
					// Requeridos y NO pueden empatar
					if (penalesLocal === null || penalesVisitante === null) {
						alert('Empate en liguilla: captura penales (ej. 5-4)');
						return;
					}
					if (pl == pv) {
						alert('Los penales NO pueden empatar (ej. 5-4)');
						return;
					}
				} else {
					// Si no aplica, limpiamos a 0
					pl = 0;
					pv = 0;
				}

				await upsertMarcadorPartidoEnBD(partido.id, {
					golesLocal: gl,
					golesVisitante: gv,
					penalesLocal: pl,
					penalesVisitante: pv
				});
			}
			// En BD nueva se usa "finalizado". Si aún no existe (legacy), caemos a "jugado".
				let { error } = await supabaseClient
					.from('partidos')
					.update(actualizacionPartido)
					.eq('id', partido.id)
					.eq('torneo_id', torneoActualId);

				if (error && (isMissingColumn(error, 'finalizado') || isMissingColumn(error, 'finalizado_at'))) {
					const updLegacy = { ...actualizacionPartido };
					// Si no existe finalizado, usamos jugado
					if (isMissingColumn(error, 'finalizado')) {
						delete updLegacy.finalizado;
						updLegacy.jugado = finalizadoNuevo;
					}
					// Si no existe finalizado_at, lo omitimos
					if (isMissingColumn(error, 'finalizado_at')) {
						delete updLegacy.finalizado_at;
					}
					({ error } = await supabaseClient
						.from('partidos')
						.update(updLegacy)
						.eq('id', partido.id)
						.eq('torneo_id', torneoActualId));
				}

				if (error) throw error;

				partido.notas = nuevasNotas;
				partido.finalizado = finalizadoNuevo;

				// Refrescar marcador desde BD (marcadores_partido)
				const marcadorDb = await fetchMarcadorPartidoDesdeBD(partido.id);
				partido.resultado = finalizadoNuevo ? { ...marcadorDb } : null;

				// Recargar posiciones/reportes desde BD (fuente de verdad)
				await cargarPosiciones();
                await cargarAdminResumenTorneo();
                await cargarPartidos();

                // Panel lateral (visitante): refrescar últimos resultados / tops
                await cargarPublicSidePanels();

				actualizarTabla();
				actualizarProximoPartido();
				actualizarListaEnfrentamientos();
				actualizarTimelineMini();
				cerrarModal();
			} catch (error) {
                console.error('Error:', error);
                showError('Error al actualizar partido');
            } finally {
                hideLoading();
            }
        }

        

        // ==========================================
        // RESUMEN ADMIN (sin duplicar estadísticas)
        // ==========================================
        function formatFaseLabel(fase) {
            const f = String(fase || '').toUpperCase();
            if (!f) return '—';
            if (f === 'LIGA') return 'Liga';
            if (f === 'LIGUILLA') return 'Liguilla';
            if (f === 'TERMINADO') return 'Terminado';
            return f;
        }

        function formatFechaHoraBonita(value) {
            const dt = value ? new Date(value) : null;
            if (!dt || Number.isNaN(dt.getTime())) return '';
            const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const d = dias[dt.getDay()];
            const day = dt.getDate();
            const m = meses[dt.getMonth()];
            let hh = dt.getHours();
            const mm = String(dt.getMinutes()).padStart(2, '0');
            const ampm = hh >= 12 ? 'p. m.' : 'a. m.';
            hh = hh % 12; if (hh === 0) hh = 12;
            return `📅 ${d} ${day} ${m} • 🕖 ${hh}:${mm} ${ampm}`;
        }

        // ==========================================
        // PANEL LATERAL (solo lectura / visitante)
        // - Izquierda: últimos 5 resultados + top 3 goleadores + top 3 disciplina
        // - Derecha: patrocinadores (PROMOS)
        // - Mobile: drawer con tabs
        // ==========================================

        function hasPublicPanels() {
            return !UI_IS_ADMIN && (
                document.getElementById('publicSideLeft') ||
                document.getElementById('mobilePanelDrawer')
            );
        }

        function resetPublicSidePanelsUI() {
            if (!hasPublicPanels()) return;

            const set = (id, html) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = html;
            };

            set('sideLastResults', '<div class="empty-state">Selecciona un torneo.</div>');
            set('sideTopScorers', '<div class="empty-state">—</div>');
            set('sideTopDiscipline', '<div class="empty-state">—</div>');
            set('mobileLastResults', '<div class="empty-state">Selecciona un torneo.</div>');
            set('mobileTopScorers', '<div class="empty-state">—</div>');
            set('mobileTopDiscipline', '<div class="empty-state">—</div>');

            // Panel derecho: patrocinadores se pueden renderizar aunque no haya torneo
            renderPatrocinadoresSidePanels();
            // Drawer + componentes v2 (aunque no haya torneo)
            renderAdsDrawerPanels();
            initSponsorRibbon();
            initPromosFeatured();
            updateAdsCountBadge();
        }

        function getAdsSafe(placement) {
            const w = (typeof window !== 'undefined') ? window : null;
            const all = (w && Array.isArray(w.__ADS__)) ? w.__ADS__ : (Array.isArray(PROMOS) ? PROMOS : []);
            const p = __normPlacement(placement);
            return (Array.isArray(all) ? all : []).filter(x => __normPlacement(x?.placement) === p);
        }

        function renderPatrocinadoresSidePanels() {
            if (!hasPublicPanels()) return;

            const promos = getAdsSafe('patrocinadores');

            const renderTo = (containerId) => {
                const el = document.getElementById(containerId);
                if (!el) return;
                if (!promos.length) {
                    el.innerHTML = '<div class="empty-state">Sin patrocinadores.</div>';
                    return;
                }
                const max = (containerId === 'sidePromos') ? 3 : 6;
                el.innerHTML = promos.slice(0, max).map(p => {
                    const title = escapeHtml(p.title || 'Patrocinador');
                    const desc = escapeHtml(p.desc || '');
                    const img = escapeHtml(p.img || '');
                    const cta = escapeHtml(p.cta || 'Ver');
                    const href = escapeHtml(p.href || '#');
                    const badge = escapeHtml(p.badge || '');
                    return `
                        <div class="promo-card-mini">
                            <img src="${img}" alt="${title}" loading="lazy">
                            <div>
                                <div class="p-title">${title}</div>
                                <div class="p-desc">${desc}</div>
                                <div class="p-foot">
                                    ${badge ? `<span class="side-badge">${badge}</span>` : '<span></span>'}
                                    <a class="p-cta" href="${href}" target="_blank" rel="noopener">${cta}</a>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            };

            renderTo('sidePromos');
        }

        // ==========================================
        // UI v2 (Espectador): Ribbon + Promos destacadas + Drawer de anuncios
        // ==========================================

        const __ADS_PAGE_SIZE = 24;
        const __adsLimits = { patrocinadores: __ADS_PAGE_SIZE, promos: __ADS_PAGE_SIZE, banners: __ADS_PAGE_SIZE };

        function __shuffle(arr) {
            const a = Array.isArray(arr) ? arr.slice() : [];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        function updateAdsCountBadge() {
            const badge = document.getElementById('adsCount');
            if (!badge) return;
            const total =
                getAdsSafe('patrocinador').length +
                getAdsSafe('banner').length +
                getAdsSafe('promos').length +
                getAdsSafe('patrocinadores').length;

            badge.textContent = String(total);
            badge.style.display = total > 0 ? 'inline-flex' : 'none';
        }

        function initSponsorRibbon() {
            const wrap = document.getElementById('sponsorRibbon');
            const track = document.getElementById('sponsorRibbonTrack');
            if (!wrap || !track) return;

            const list = getAdsSafe('patrocinadores').filter(p => p && p.title && p.img);
            if (!list.length) {
                wrap.style.display = 'none';
                return;
            }

            const pick = __shuffle(list).slice(0, 12);
            track.innerHTML = pick.map(p => {
                const title = escapeHtml(p.title || 'Patrocinador');
                const img = escapeHtml(p.img || '');
                const href = escapeHtml(p.href || '#');
                return `
                  <a class="sr-item" role="listitem" href="${href}" target="_blank" rel="noopener" title="${title}">
                    <img src="${img}" alt="${title}" loading="lazy">
                  </a>
                `;
            }).join('');

            // Fallback de imagen (sin inline onerror)
            track.querySelectorAll('img').forEach(img => {
                img.addEventListener('error', () => {
                    img.style.opacity = '.25';
                    img.alt = 'Imagen no disponible';
                });
            });

            wrap.style.display = 'block';
        }

        // Promos destacadas (placement: promos)
        let __pfIndex = 0;
        let __pfTimer = null;

        function __pfStop() {
            if (__pfTimer) { clearInterval(__pfTimer); __pfTimer = null; }
        }

        function __pfStart() {
            __pfStop();
            const list = window.__PF_LIST__ || [];
            if (list.length <= 1) return;
            __pfTimer = setInterval(() => {
                __pfIndex++;
                promosFeaturedUpdate();
            }, 10000);
        }

        function promosFeaturedUpdate() {
            const wrap = document.getElementById('promosFeatured');
            const card = document.getElementById('pfCard');
            const thumbs = document.getElementById('pfThumbs');
            const counter = document.getElementById('pfCounter');
            const list = window.__PF_LIST__ || [];
            if (!wrap || !card || !thumbs || !counter) return;
            if (!list.length) {
                wrap.style.display = 'none';
                return;
            }

            __pfIndex = ((__pfIndex % list.length) + list.length) % list.length;
            const p = list[__pfIndex];

            const title = escapeHtml(p.title || 'Promo');
            const desc = escapeHtml(p.desc || '');
            const img = escapeHtml(p.img || '');
            const cta = escapeHtml(p.cta || 'Ver');
            const href = escapeHtml(p.href || '#');
            const badge = escapeHtml(p.badge || 'Promo');

            counter.textContent = `${__pfIndex + 1}/${list.length}`;

            card.innerHTML = `
              <img src="${img}" alt="${title}" loading="lazy">
              <div class="pf-body">
                <div class="pf-badge">${badge}</div>
                <div class="pf-title2">${title}</div>
                ${desc ? `<div class="pf-desc">${desc}</div>` : ''}
                <div class="pf-foot">
                  <a class="pf-cta" href="${href}" target="_blank" rel="noopener">${cta} →</a>
                </div>
              </div>
            `;

            thumbs.innerHTML = list.slice(0, 20).map((x, i) => {
                const t = escapeHtml(x.title || 'Promo');
                const im = escapeHtml(x.img || '');
                const active = i === __pfIndex ? 'active' : '';
                return `
                  <button type="button" class="pf-thumb ${active}" data-pf-index="${i}" aria-label="${t}">
                    <img src="${im}" alt="${t}" loading="lazy">
                    <span>${t}</span>
                  </button>
                `;
            }).join('');

            thumbs.querySelectorAll('button.pf-thumb').forEach(btn => {
                btn.addEventListener('click', () => {
                    const i = parseInt(btn.getAttribute('data-pf-index') || '0', 10);
                    __pfIndex = i;
                    promosFeaturedUpdate();
                    __pfStart();
                });
            });

            // Fallback de imágenes
            card.querySelectorAll('img').forEach(imgEl => {
                imgEl.addEventListener('error', () => {
                    imgEl.style.opacity = '.25';
                    imgEl.alt = 'Imagen no disponible';
                });
            });

            wrap.style.display = 'block';
        }

        function initPromosFeatured() {
            const wrap = document.getElementById('promosFeatured');
            if (!wrap) return;

            const list = getAdsSafe('promos').filter(p => p && p.title && p.img);
            if (!list.length) {
                wrap.style.display = 'none';
                return;
            }

            window.__PF_LIST__ = list;
            __pfIndex = 0;
            promosFeaturedUpdate();
            __pfStart();

            // Pausa al hover
            wrap.addEventListener('mouseenter', __pfStop);
            wrap.addEventListener('mouseleave', __pfStart);
        }

        function __tabToPlacement(tab) {
            const t = String(tab || '').toLowerCase();
            if (t === 'banners') return 'banner';
            if (t === 'patrocinadores') return 'patrocinadores';
            if (t === 'promos') return 'promos';
            return 'patrocinadores';
        }

        function renderAdsGrid(containerId, placement, limitKey, moreBtnId) {
            const el = document.getElementById(containerId);
            if (!el) return;

            const list = getAdsSafe(placement).filter(p => p && p.title && p.img);
            if (!list.length) {
                el.innerHTML = '<div class="empty-state">Sin anuncios.</div>';
                const btn = document.getElementById(moreBtnId);
                if (btn) btn.style.display = 'none';
                return;
            }

            const limit = __adsLimits[String(limitKey || '')] || __ADS_PAGE_SIZE;
            const slice = list.slice(0, limit);

            el.innerHTML = slice.map(p => {
                const title = escapeHtml(p.title || 'Anuncio');
                const desc = escapeHtml(p.desc || '');
                const img = escapeHtml(p.img || '');
                const cta = escapeHtml(p.cta || 'Ver');
                const href = escapeHtml(p.href || '#');
                const badge = escapeHtml(p.badge || '');
                return `
                  <div class="ads-card">
                    <img class="ads-img" src="${img}" alt="${title}" loading="lazy">
                    <div>
                      <div class="ads-title">${title}</div>
                      ${desc ? `<div class="ads-desc">${desc}</div>` : ''}
                      <div class="ads-actions">
                        ${badge ? `<span class="side-badge">${badge}</span>` : '<span></span>'}
                        <a class="ads-cta" href="${href}" target="_blank" rel="noopener">${cta}</a>
                      </div>
                    </div>
                  </div>
                `;
            }).join('');

            // Mostrar/ocultar botón "Cargar más"
            const moreBtn = document.getElementById(moreBtnId);
            if (moreBtn) {
                moreBtn.style.display = (limit < list.length) ? 'block' : 'none';
            }

            // Fallback de imágenes
            el.querySelectorAll('img').forEach(imgEl => {
                imgEl.addEventListener('error', () => {
                    imgEl.style.opacity = '.25';
                    imgEl.alt = 'Imagen no disponible';
                });
            });
        }

        function renderAdsDrawerPanels() {
            renderAdsGrid('adsSponsorsGrid', 'patrocinadores', 'patrocinadores', 'adsMoreSponsors');
            renderAdsGrid('adsPromosGrid', 'promos', 'promos', 'adsMorePromos');
            renderAdsGrid('adsBannersGrid', 'banner', 'banners', 'adsMoreBanners');
        }

        function adsLoadMore(tab) {
            const t = String(tab || '').toLowerCase();
            if (t === 'patrocinadores') __adsLimits.patrocinadores += __ADS_PAGE_SIZE;
            if (t === 'promos') __adsLimits.promos += __ADS_PAGE_SIZE;
            if (t === 'banners') __adsLimits.banners += __ADS_PAGE_SIZE;
            renderAdsDrawerPanels();
        }

        function formatResultadoMini(p) {
            const r = p?.resultado;
            if (!r) return '';
            const gl = Number(r.golesLocal ?? 0);
            const gv = Number(r.golesVisitante ?? 0);
            let txt = `${gl}-${gv}`;

            const pl = Number(r.penalesLocal ?? 0);
            const pv = Number(r.penalesVisitante ?? 0);
            // Si hay penales, mostramos desempate
            if (gl === gv && (pl > 0 || pv > 0)) {
                txt += ` (${pl}-${pv})`;
            }
            return txt;
        }

        function renderLastResultsTo(containerId, partidos) {
            const el = document.getElementById(containerId);
            if (!el) return;

            const arr = (partidos || []).slice(0, 5);
            if (!arr.length) {
                el.innerHTML = '<div class="empty-state">Aún no hay resultados.</div>';
                return;
            }

            el.innerHTML = arr.map(p => {
                const title = `${escapeHtml(p.local || '—')} vs ${escapeHtml(p.visitante || '—')}`;
                const value = escapeHtml(formatResultadoMini(p) || '—');
                const when = formatFechaHoraBonita(p.fechaHora);
                const fase = String(p.fase || '').toUpperCase();
                const badge = (fase && fase !== 'LIGA') ? `<span class="side-badge">🏆 ${escapeHtml(fase)}</span>` : '';
                return `
                    <div class="side-item">
                        <div class="row1">
                            <div class="title">${title}</div>
                            <div class="value">${value}</div>
                        </div>
                        <div class="row2">${escapeHtml(when)} ${badge ? ' • ' + badge : ''}</div>
                    </div>
                `;
            }).join('');
        }

        function renderTop3To(containerId, rows, kind) {
            const el = document.getElementById(containerId);
            if (!el) return;

            const data = Array.isArray(rows) ? rows : [];
            let top = [];

            if (kind === 'goles') {
                top = data
                    .map(s => ({
                        nombre: String(s.jugador_nombre || 'Jugador'),
                        equipo: String(s.equipo_nombre || (equiposById.get(String(s.equipo_id)) || '')),
                        value: Number(s.goles ?? 0)
                    }))
                    .filter(x => x.value > 0)
                    .sort((a, b) => b.value - a.value || a.nombre.localeCompare(b.nombre))
                    .slice(0, 3);
            } else {
                // disciplina
                top = data
                    .map(s => ({
                        nombre: String(s.jugador_nombre || 'Jugador'),
                        equipo: String(s.equipo_nombre || (equiposById.get(String(s.equipo_id)) || '')),
                        amarillas: Number(s.amarillas ?? 0),
                        rojas: Number(s.rojas ?? 0)
                    }))
                    .map(x => ({ ...x, value: x.amarillas + x.rojas }))
                    .filter(x => x.value > 0)
                    .sort((a, b) => b.value - a.value || b.rojas - a.rojas || a.nombre.localeCompare(b.nombre))
                    .slice(0, 3);
            }

            if (!top.length) {
                el.innerHTML = '<div class="empty-state">Sin datos.</div>';
                return;
            }

            el.innerHTML = top.map((r, i) => {
                const left = `${i + 1}. ${escapeHtml(r.nombre)}`;
                const team = escapeHtml(r.equipo || '—');
                const value = (kind === 'goles')
                    ? `⚽ ${Number(r.value)}`
                    : `🟨 ${Number(r.amarillas)} • 🟥 ${Number(r.rojas)}`;
                return `
                    <div class="side-item">
                        <div class="row1">
                            <div class="title">${left}</div>
                            <div class="value">${escapeHtml(value)}</div>
                        </div>
                        <div class="row2">${team}</div>
                    </div>
                `;
            }).join('');
        }

        async function cargarPublicSidePanels() {
            if (!hasPublicPanels()) return;
            if (!supabaseConfigured || !torneoActualId) {
                resetPublicSidePanelsUI();
                return;
            }

            try {
                // Patrocinadores (siempre)
                renderPatrocinadoresSidePanels();

                // Últimos 5 resultados oficiales
                const last5 = (enfrentamientosProgramados || [])
                    .filter(p => p && p.finalizado)
                    .filter(p => String(p.tipoPartido || 'OFICIAL').toUpperCase() === 'OFICIAL')
                    .sort((a, b) => (b.fechaHora?.getTime?.() || 0) - (a.fechaHora?.getTime?.() || 0))
                    .slice(0, 5);

                renderLastResultsTo('sideLastResults', last5);
                renderLastResultsTo('mobileLastResults', last5);

                // Top 3 goleadores + disciplina
                const stats = await obtenerEstadisticasJugadores();
                renderTop3To('sideTopScorers', stats, 'goles');
                renderTop3To('mobileTopScorers', stats, 'goles');
                renderTop3To('sideTopDiscipline', stats, 'disciplina');
                renderTop3To('mobileTopDiscipline', stats, 'disciplina');
            } catch (err) {
                console.warn('Panel lateral: no se pudo cargar', err);
                // No rompemos la app
            }
        }

        function openMobilePanel() {
            const overlay = document.getElementById('mobilePanelOverlay');
            const drawer = document.getElementById('mobilePanelDrawer');
            if (!overlay || !drawer) return;
            overlay.classList.add('open');
            drawer.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
            drawer.setAttribute('aria-hidden', 'false');
        }

        function closeMobilePanel() {
            const overlay = document.getElementById('mobilePanelOverlay');
            const drawer = document.getElementById('mobilePanelDrawer');
            if (!overlay || !drawer) return;
            overlay.classList.remove('open');
            drawer.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            drawer.setAttribute('aria-hidden', 'true');
        }

        
        function setMobilePanelTab(tab) {
            const t = String(tab || '').toLowerCase();
            const btns = [...document.querySelectorAll('.mobile-panel-tabs .mptab')];
            const secResumen = document.getElementById('mobilePanelResumen');
            const secPatro = document.getElementById('mobilePanelPatrocinadores');
            const secPromos = document.getElementById('mobilePanelPromos');
            const secBanners = document.getElementById('mobilePanelBanners');

            btns.forEach(b => b.classList.toggle('active', String(b.dataset.tab || '') === t));

            if (secResumen) secResumen.classList.toggle('active', t === 'resumen');
            if (secPatro) secPatro.classList.toggle('active', t === 'patrocinadores');
            if (secPromos) secPromos.classList.toggle('active', t === 'promos');
            if (secBanners) secBanners.classList.toggle('active', t === 'banners');
        }

        async function cargarAdminResumenTorneo() {
            const wrap = document.getElementById('adminResumenTorneo');
            if (!wrap) return; // si no es admin, o no existe el bloque

            if (!supabaseConfigured || !torneoActualId) {
                wrap.innerHTML = '<div class="empty-state">Selecciona un torneo para ver el resumen.</div>';
                return;
            }

            // UI rápida
            wrap.innerHTML = `
                <div class="summary-item"><div class="k">📌 Fase</div><div class="v">Cargando…</div></div>
                <div class="summary-item"><div class="k">⏳ Pendientes</div><div class="v">…</div></div>
                <div class="summary-item"><div class="k">🗓️ Próximo partido</div><div class="v">…</div></div>
                <div class="summary-item"><div class="k">🏆 Campeón</div><div class="v">…</div></div>
            `;

            try {
                const { data: t, error: eT } = await supabaseClient
                    .from('torneos')
                    .select('id,nombre,fase_actual,campeon_id,subcampeon_id')
                    .eq('id', torneoActualId)
                    .maybeSingle();

                if (eT || !t) {
                    wrap.innerHTML = '<div class="empty-state">No se pudo cargar el resumen.</div>';
                    return;
                }

                const fase = String(t.fase_actual || '').toUpperCase();

                // Pendientes oficiales
                let pendientes = 0;
                let nextMatch = null;

                // Intentamos con tipo_partido (si existe)
                let q = supabaseClient
                    .from('partidos')
                    .select('id,fecha_hora,fecha,hora,local_id,visitante_id,fase,tipo_partido,finalizado')
                    .eq('torneo_id', torneoActualId)
                    .eq('finalizado', false)
                    .order('fecha_hora', { ascending: true });

                let res = await q;
                if (res.error && isMissingColumn(res.error, 'tipo_partido')) {
                    // fallback viejo
                    res = await supabaseClient
                        .from('partidos')
                        .select('id,fecha_hora,fecha,hora,local_id,visitante_id,fase,finalizado')
                        .eq('torneo_id', torneoActualId)
                        .eq('finalizado', false)
                        .order('fecha_hora', { ascending: true });
                }

                const arr = (res.data || []).filter(p => {
                    const tp = String(p.tipo_partido || 'OFICIAL').toUpperCase();
                    return tp === 'OFICIAL' || p.tipo_partido == null; // si no existe, cuenta
                });

                pendientes = arr.length;
                nextMatch = arr[0] || null;

                // Campeón
                let campeonTxt = 'Pendiente';
                if (fase === 'TERMINADO' && t.campeon_id) {
                    const ids = [t.campeon_id, t.subcampeon_id].filter(Boolean).map(String);
                    const { data: eqs } = await supabaseClient
                        .from('equipos')
                        .select('id,nombre')
                        .in('id', ids);
                    const map = new Map((eqs || []).map(x => [String(x.id), String(x.nombre || '')]));
                    const camp = map.get(String(t.campeon_id)) || 'Campeón';
                    const sub = t.subcampeon_id ? (map.get(String(t.subcampeon_id)) || 'Subcampeón') : '';
                    campeonTxt = `👑 ${camp}${sub ? ` • 🥈 ${sub}` : ''}`;
                }

                // Próximo partido (nombre equipos)
                let proximoTxt = '—';
                if (nextMatch) {
                    const a = getEquipoNombreSafe(nextMatch.local_id);
                    const b = getEquipoNombreSafe(nextMatch.visitante_id);
                    const fh = nextMatch.fecha_hora || null;
                    const when = fh ? formatFechaHoraBonita(fh) : '';
                    proximoTxt = `${a} vs ${b}${when ? `<div class="summary-sub">${when}</div>` : ''}`;
                }

                wrap.innerHTML = `
                    <div class="summary-item">
                        <div class="k">📌 Fase</div>
                        <div class="v"><span class="pill pill-${fase === 'TERMINADO' ? 'done' : (fase === 'LIGUILLA' ? 'warn' : 'ok')}">${escapeHtml(formatFaseLabel(fase))}</span></div>
                    </div>
                    <div class="summary-item">
                        <div class="k">⏳ Pendientes (oficiales)</div>
                        <div class="v">${pendientes}</div>
                    </div>
                    <div class="summary-item summary-wide">
                        <div class="k">🗓️ Próximo partido</div>
                        <div class="v">${proximoTxt}</div>
                    </div>
                    <div class="summary-item summary-wide">
                        <div class="k">🏆 Campeón</div>
                        <div class="v">${escapeHtml(campeonTxt)}</div>
                    </div>
                `;

            } catch (err) {
                console.error('Error cargando resumen admin:', err);
                wrap.innerHTML = '<div class="empty-state">No se pudo cargar el resumen.</div>';
            }
        }

// ==========================================
        // ESTADÍSTICAS (SOLO LECTURA) - Pestaña "Estadísticas"
        // Fuente de verdad: estadistica_jugador / v_estadistica_jugador_torneo
        // ==========================================
        
        // ==========================================
        // REPORTES (DEPRECADO)
        // Se eliminó el módulo de reportes en Admin. Esta función se mantiene
        // como compatibilidad para evitar ReferenceError en resets.
        // ==========================================
        function limpiarReportesUI() {
            const ids = [
                'reporteGoleadores',
                'reporteTarjetas',
                'reporteHint',
                'reportesWrap',
                'reportesContainer',
                'adminReportesWrap'
            ];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });
            const hint = document.getElementById('reporteHint');
            if (hint) {
                hint.textContent = '';
                hint.style.display = 'none';
            }
        }

function limpiarEstadisticasUI() {
            const ids = ['statsCampeonWrap', 'statsGoleadores', 'statsAmarillas', 'statsRojas', 'statsMejorDefensa', 'statsMejorAtaque'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });
            const hint = document.getElementById('statsHint');
            if (hint) {
                hint.textContent = '';
                hint.style.display = 'none';
            }
        }

        async function renderCampeonEnEstadisticas() {
            const el = document.getElementById('statsCampeonWrap');
            if (!el) return;

            if (!supabaseConfigured || !torneoActualId) {
                el.innerHTML = '';
                return;
            }

            // Placeholder mientras carga
            el.innerHTML = `
                <div class="stats-champ-row">
                    <div>
                        <div class="stats-champ-kicker">🏆 Campeón del torneo</div>
                        <div class="stats-champ-name">Cargando…</div>
                        <div class="stats-champ-sub">${escapeHtml((torneos.find(t => String(t.id)===String(torneoActualId))?.nombre) || '')}</div>
                    </div>
                    <div class="stats-champ-pill">⏳</div>
                </div>
            `;

            try {
                const { data: t, error } = await supabaseClient
                    .from('torneos')
                    .select('id,nombre,campeon_id,subcampeon_id,fase_actual')
                    .eq('id', torneoActualId)
                    .maybeSingle();

                if (error || !t) {
                    el.innerHTML = '';
                    return;
                }

                const torneoNombre = String(t.nombre || 'Torneo');
                const fase = String(t.fase_actual || '').toUpperCase();
                const terminado = fase === 'TERMINADO';

                if (!terminado || !t.campeon_id) {
                    el.innerHTML = `
                        <div class="stats-champ-row">
                            <div>
                                <div class="stats-champ-kicker">🏆 Campeón del torneo</div>
                                <div class="stats-champ-name">Pendiente</div>
                                <div class="stats-champ-sub">${escapeHtml(torneoNombre)}</div>
                                <div class="stats-champ-note">Se definirá al finalizar la liguilla.</div>
                            </div>
                            <div class="stats-champ-pill">${terminado ? '🏁' : '⏳'}</div>
                        </div>
                    `;
                    return;
                }

                const ids = [t.campeon_id, t.subcampeon_id].filter(Boolean).map(String);
                const { data: eqs } = await supabaseClient
                    .from('equipos')
                    .select('id,nombre')
                    .in('id', ids);

                const map = new Map((eqs || []).map(x => [String(x.id), String(x.nombre || '')]));
                const campeon = map.get(String(t.campeon_id)) || 'Campeón';
                const sub = t.subcampeon_id ? (map.get(String(t.subcampeon_id)) || 'Subcampeón') : '';

                el.innerHTML = `
                    <div class="stats-champ-row">
                        <div>
                            <div class="stats-champ-kicker">🏆 Campeón del torneo</div>
                            <div class="stats-champ-name">${escapeHtml(campeon)}</div>
                            <div class="stats-champ-sub">${escapeHtml(torneoNombre)}${sub ? ` • 🥈 ${escapeHtml(sub)}` : ''}</div>
                        </div>
                        <div class="stats-champ-pill done">👑</div>
                    </div>
                `;

            } catch (err) {
                console.warn('No se pudo cargar campeón del torneo:', err);
                el.innerHTML = '';
            }
        }



async function obtenerEstadisticasJugadores() {
            if (!supabaseConfigured || !torneoActualId) return [];

            // Cache rápido (evita doble consulta cuando la pestaña Estadísticas y el panel lateral
            // piden la misma info).
            const cached = cacheGet(__LF_CACHE.statsByTorneo, String(torneoActualId), 30 * 1000);
            if (cached) return cached;

            // 1) Intentar vista (si existe)
            let res = await supabaseClient
                .from('v_estadistica_jugador_torneo')
                .select('jugador_id, equipo_id, jugador_nombre, equipo_nombre, goles, autogoles, amarillas, rojas')
                .eq('torneo_id', torneoActualId);

            if (!res.error) {
                const out = (res.data || []).map(s => ({
                    jugador_id: s.jugador_id,
                    equipo_id: s.equipo_id,
                    jugador_nombre: s.jugador_nombre,
                    equipo_nombre: s.equipo_nombre,
                    goles: Number(s.goles ?? 0),
                    autogoles: Number(s.autogoles ?? 0),
                    amarillas: Number(s.amarillas ?? 0),
                    rojas: Number(s.rojas ?? 0),
                }));
                cacheSet(__LF_CACHE.statsByTorneo, String(torneoActualId), out);
                return out;
            }

            // 2) Fallback: tabla estadistica_jugador + nombres desde jugadores/equipos
            if (!isMissingTable(res.error, 'v_estadistica_jugador_torneo')) {
                throw res.error;
            }

            const { data: sj, error: eSj } = await supabaseClient
                .from('estadistica_jugador')
                .select('jugador_id, equipo_id, goles, autogoles, amarillas, rojas')
                .eq('torneo_id', torneoActualId);

            if (eSj) {
                if (isMissingTable(eSj, 'estadistica_jugador')) return [];
                throw eSj;
            }

            const { data: js, error: eJ } = await supabaseClient
                .from('jugadores')
                .select('id, nombre, equipo_id')
                .eq('torneo_id', torneoActualId);

            if (eJ && !isMissingTable(eJ, 'jugadores')) throw eJ;

            const jMap = new Map((js || []).map(j => [String(j.id), j]));

            const out = (sj || []).map(r => {
                const j = jMap.get(String(r.jugador_id));
                const eqName = equiposById.get(String(r.equipo_id)) || '';
                return {
                    jugador_id: r.jugador_id,
                    equipo_id: r.equipo_id,
                    jugador_nombre: j?.nombre || 'Jugador',
                    equipo_nombre: eqName,
                    goles: Number(r.goles ?? 0),
                    autogoles: Number(r.autogoles ?? 0),
                    amarillas: Number(r.amarillas ?? 0),
                    rojas: Number(r.rojas ?? 0),
                };
            });

            cacheSet(__LF_CACHE.statsByTorneo, String(torneoActualId), out);
            return out;
        }

        function renderTopLista(containerId, rows, opts = {}) {
            const el = document.getElementById(containerId);
            if (!el) return;

            const {
                valueKey = 'goles',
                labelPrefix = '',
                emptyText = 'Sin datos.',
                valueRender = null,
            } = opts;

            const arr = (rows || [])
                .map(s => ({
                    nombre: String(s.jugador_nombre || 'Jugador'),
                    equipo: String(s.equipo_nombre || (equiposById.get(String(s.equipo_id)) || '')),
                    value: Number(s[valueKey] ?? 0),
                    amarillas: Number(s.amarillas ?? 0),
                    rojas: Number(s.rojas ?? 0),
                }))
                .filter(r => r.value > 0)
                .sort((a, b) => b.value - a.value || a.nombre.localeCompare(b.nombre));

            if (!arr.length) {
                el.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
                return;
            }

            el.innerHTML = arr.slice(0, 10).map((r, i) => {
                const right = valueRender
                    ? valueRender(r)
                    : `<div style="font-weight:900; font-size:1.1em;">${labelPrefix}${r.value}</div>`;

                return `
                    <div class="match-item" style="display:flex; justify-content:space-between; gap:10px;">
                        <div>
                            <div style="font-weight:700;">${i + 1}. ${escapeHtml(r.nombre)}</div>
                            <div style="opacity:.75; font-size:.92em;">${escapeHtml(r.equipo || '—')}</div>
                        </div>
                        ${right}
                    </div>
                `;
            }).join('');
        }

        async function obtenerMejorEquipoDesdePosiciones(kind) {
            // kind: 'defensa' | 'ataque'
            if (!supabaseConfigured || !torneoActualId) return null;

            // Preferimos VIEW
            let query = supabaseClient
                .from('v_posiciones_torneo')
                .select('equipo_id, equipo_nombre, gf, gc, pts, dif')
                .eq('torneo_id', torneoActualId);

            if (kind === 'defensa') {
                query = query.order('gc', { ascending: true }).order('dif', { ascending: false }).limit(1);
            } else {
                query = query.order('gf', { ascending: false }).order('dif', { ascending: false }).limit(1);
            }

            let { data, error } = await query;

            if (error && isMissingTable(error, 'v_posiciones_torneo')) {
                // Fallback: tabla posiciones
                let q2 = supabaseClient
                    .from('posiciones')
                    .select('equipo_id, gf, gc, pts, dif')
                    .eq('torneo_id', torneoActualId);

                if (kind === 'defensa') {
                    q2 = q2.order('gc', { ascending: true }).order('dif', { ascending: false }).limit(1);
                } else {
                    q2 = q2.order('gf', { ascending: false }).order('dif', { ascending: false }).limit(1);
                }

                ({ data, error } = await q2);
            }

            if (error) return null;
            const row = (data || [])[0];
            if (!row) return null;

            return {
                equipo_id: row.equipo_id,
                equipo_nombre: row.equipo_nombre || getEquipoNombreSafe(row.equipo_id),
                gf: Number(row.gf ?? 0),
                gc: Number(row.gc ?? 0),
                dif: Number(row.dif ?? 0),
                pts: Number(row.pts ?? 0),
            };
        }

        async function cargarEstadisticasLectura() {
            // Si no existe la pestaña en el HTML, no hacemos nada
            const wrap = document.getElementById('estadisticas');
            if (!wrap) return;

            if (!supabaseConfigured || !torneoActualId) {
                limpiarEstadisticasUI();
                return;
            }

            const hint = document.getElementById('statsHint');

            // UI rápida mientras carga
            const champWrap = document.getElementById('statsCampeonWrap');
            if (champWrap) {
                champWrap.innerHTML = `
                    <div class="stats-champ-row">
                        <div>
                            <div class="stats-champ-kicker">🏆 Campeón del torneo</div>
                            <div class="stats-champ-name">Cargando…</div>
                            <div class="stats-champ-sub">${escapeHtml((torneos.find(t => String(t.id)===String(torneoActualId))?.nombre) || '')}</div>
                        </div>
                        <div class="stats-champ-pill">⏳</div>
                    </div>
                `;
            }

            ['statsGoleadores', 'statsAmarillas', 'statsRojas', 'statsMejorDefensa', 'statsMejorAtaque'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<div class="empty-state">Cargando…</div>';
            });

            if (hint) {
                hint.textContent = '';
                hint.style.display = 'none';
            }

            try {
                // Campeón principal (tarjeta destacada)
                await renderCampeonEnEstadisticas();

                const stats = await obtenerEstadisticasJugadores();

                // ⚽ Goleadores
                renderTopLista('statsGoleadores', stats, {
                    valueKey: 'goles',
                    emptyText: 'Sin goles registrados.'
                });

                // 🟨 Amarillas
                renderTopLista('statsAmarillas', stats, {
                    valueKey: 'amarillas',
                    emptyText: 'Sin amarillas registradas.'
                });

                // 🟥 Rojas
                renderTopLista('statsRojas', stats, {
                    valueKey: 'rojas',
                    emptyText: 'Sin rojas registradas.'
                });

                // 🛡️ Mejor defensa
                const def = await obtenerMejorEquipoDesdePosiciones('defensa');
                const elDef = document.getElementById('statsMejorDefensa');
                if (elDef) {
                    if (!def) {
                        elDef.innerHTML = '<div class="empty-state">Sin datos.</div>';
                    } else {
                        elDef.innerHTML = `
                            <div class="match-item" style="display:flex; justify-content:space-between; gap:10px;">
                                <div style="font-weight:800;">${escapeHtml(def.equipo_nombre || '—')}</div>
                                <div style="font-weight:900;">GC ${def.gc}</div>
                            </div>
                        `;
                    }
                }

                // 🔥 Mejor ataque
                const atk = await obtenerMejorEquipoDesdePosiciones('ataque');
                const elAtk = document.getElementById('statsMejorAtaque');
                if (elAtk) {
                    if (!atk) {
                        elAtk.innerHTML = '<div class="empty-state">Sin datos.</div>';
                    } else {
                        elAtk.innerHTML = `
                            <div class="match-item" style="display:flex; justify-content:space-between; gap:10px;">
                                <div style="font-weight:800;">${escapeHtml(atk.equipo_nombre || '—')}</div>
                                <div style="font-weight:900;">GF ${atk.gf}</div>
                            </div>
                        `;
                    }
                }

                // Hint si no hay eventos/estadísticas
                if (!stats || !stats.length) {
                    if (hint) {
                        hint.textContent = 'Aún no hay estadísticas registradas en este torneo.';
                        hint.style.display = 'block';
                    }
                }

            } catch (err) {
                console.error('Error cargando estadísticas (lectura):', err);
                limpiarEstadisticasUI();
                if (hint) {
                    hint.textContent = 'No se pudieron cargar las estadísticas.';
                    hint.style.display = 'block';
                }
            }
        }


        // ==========================================
        // LIGUILLA (solo lectura)
        // ==========================================

        async function cargarLiguilla({ force = false } = {}) {
            const wrap = document.getElementById('liguillaWrap');
            if (!wrap) return;

            // Admin: controlar UI (botón Generar) según exista liguilla
            const setLiguillaGeneradaUI = (isGenerada, partidos = null) => {
                if (!UI_IS_ADMIN) return;

                // Estado del torneo actual (si ya terminó, ya no tiene sentido programar rondas)
                const tActual = Array.isArray(torneos)
                    ? torneos.find(t => String(t.id) === String(torneoActualId))
                    : null;
                const faseActual = String(tActual?.fase_actual || '').toUpperCase();
                const torneoTerminado = faseActual === 'TERMINADO';

                const btnGen = document.querySelector('[data-action="generar-liguilla"]');
                const btnProgRonda = document.querySelector('[data-action="programar-ronda-liguilla"]');
                const cuposSel = document.getElementById('liguillaCupos');
                const estado = document.getElementById('liguillaEstado');

                // Si ya existe liguilla, deshabilitamos generar y bloqueamos cupos
                if (btnGen) {
                    if (isGenerada) {
                        btnGen.disabled = true;
                        btnGen.dataset.liguillaGenerada = '1';
                        btnGen.textContent = '✅ Liguilla generada';
                    } else {
                        btnGen.disabled = false;
                        btnGen.dataset.liguillaGenerada = '0';
                        btnGen.textContent = '🏁 Generar Liguilla';
                    }
                }

                // Programar ronda activa solo tiene sentido cuando ya existe liguilla
                if (btnProgRonda) {
                    btnProgRonda.disabled = !isGenerada || torneoTerminado;
                    btnProgRonda.title = !isGenerada
                        ? 'Primero genera la liguilla'
                        : (torneoTerminado
                            ? 'El torneo ya terminó (no se pueden reprogramar rondas)'
                            : 'Programa la ronda activa con incrementos de +1h');
                }

                // Si el torneo ya terminó, bloqueamos también los inputs de fecha/hora para evitar confusión
                const fechaInput = document.getElementById('liguillaFecha');
                const horaSelect = document.getElementById('liguillaHora');
                if (torneoTerminado) {
                    if (fechaInput) fechaInput.disabled = true;
                    if (horaSelect) horaSelect.disabled = true;
                }

                if (cuposSel) {
                    cuposSel.disabled = !!isGenerada;

                    // Ajustar valor según layout detectado (solo informativo)
                    if (isGenerada && Array.isArray(partidos) && partidos.length) {
                        try {
                            const grupos = groupLiguillaByEtapa(partidos);
                            const layout = getLiguillaLayout(grupos);
                            if (layout?.type) cuposSel.value = String(layout.type);
                        } catch {}
                    }
                }

                if (estado && torneoTerminado) {
                    estado.textContent = '🏆 Torneo terminado. La liguilla está cerrada.';
                }

                if (estado && isGenerada && !torneoTerminado) {
                    // No estorbar si el usuario está ejecutando una acción
                    if (!String(estado.textContent || '').trim()) {
                        estado.textContent = '✅ Liguilla generada. Usa “Programar ronda activa” para agendar.';
                    }
                }

                if (estado && !isGenerada && !torneoTerminado) {
                    if (!String(estado.textContent || '').trim()) {
                        estado.textContent = 'Genera la liguilla para poder programar la ronda activa.';
                    }
                }
            };

            if (!supabaseConfigured || !torneoActualId) {
                wrap.innerHTML = '<div class="empty-state">Selecciona un torneo para ver la liguilla.</div>';
                setLiguillaGeneradaUI(false);
                return;
            }

            // Si hay cache reciente, lo mostramos primero para evitar parpadeo (mejora 21)
            const cached = (!force) ? cacheGet(__LF_CACHE.liguillaByTorneo, torneoActualId, 15000) : null;
            if (cached && Array.isArray(cached)) {
                renderLiguillaPartidos(cached);
                setLiguillaGeneradaUI(cached.length > 0, cached);
                
            } else {
                // Skeleton bonito (mejora 20)
                wrap.innerHTML = renderLiguillaSkeleton();
                setLiguillaGeneradaUI(false);
            }

            try {
                // Loading overlay sin borrar bracket actual (sobre el contenedor scroll)
                setWrapLoading(wrap.parentElement || wrap, true);

                const { data, error } = await supabaseClient
                    .from('v_liguilla_partidos')
                    .select('*')
                    .eq('torneo_id', torneoActualId)
                    .order('ronda', { ascending: true })
                    .order('llave', { ascending: true });

                if (error) throw error;

                if (!data || data.length === 0) {
                    wrap.innerHTML = '<div class="empty-state">Aún no hay liguilla generada para este torneo.</div>';
                    setLiguillaGeneradaUI(false);
                    return;
                }

                setLiguillaGeneradaUI(true, data);

                // Guardar cache
                cacheSet(__LF_CACHE.liguillaByTorneo, torneoActualId, data);

                // Mantener scroll horizontal (mejora 21)
                const prevScroll = wrap.scrollLeft;
                renderLiguillaPartidos(data);
                wrap.scrollLeft = prevScroll;
            } catch (err) {
                console.error('Error cargando liguilla:', err);
                wrap.innerHTML = '<div class="empty-state">No se pudo cargar la liguilla.</div>';
            }
            finally {
                setWrapLoading(wrap.parentElement || wrap, false);
            }
        }

        function renderLiguillaSkeleton() {
            // 3 columnas y 4 tarjetas como placeholder (responsive)
            return `
              <div class="bracket bracket-skeleton" style="--rows:8;">
                ${[0, 1, 2].map(() => `
                  <div class="bracket-col">
                    <div class="bracket-col-title"><span class="sk sk-t"></span></div>
                    <div class="bracket-grid" style="--rows:8;">
                      ${[0,1,2,3].map((i) => `
                        <div class="bracket-match sk-card" style="grid-row:${1 + i*2} / span 2;">
                          <div class="sk sk-line"></div>
                          <div class="sk sk-line"></div>
                          <div class="sk sk-line sm"></div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
        }

                function renderLiguillaPartidos(partidos) {
            // ✅ Nueva UI tipo bracket (llaves)
            renderLiguillaBracket(partidos);
        }

        function groupLiguillaByEtapa(partidos) {
            const grupos = { REPECHAJE: [], CUARTOS: [], SEMIS: [], FINAL: [] };
            for (const p of (partidos || [])) {
                const etapa = String(p.etapa || 'FINAL').toUpperCase();
                if (!grupos[etapa]) grupos[etapa] = [];
                grupos[etapa].push(p);
            }

            // Orden estable por llave
            for (const k of Object.keys(grupos)) {
                grupos[k].sort((a, b) => Number(a.llave ?? 0) - Number(b.llave ?? 0));
            }

            return grupos;
        }

        function getLiguillaLayout(grupos) {
            const cCuartos = (grupos.CUARTOS || []).length;
            const cRepe = (grupos.REPECHAJE || []).length;
            const cSemis = (grupos.SEMIS || []).length;
            const cFinal = (grupos.FINAL || []).length;

            // Detectar formato por lo que exista (o lo que ya está generado)
            let type = 2;
            if (cCuartos >= 4) type = 8;
            else if (cRepe >= 2) type = 6;
            else if (cSemis >= 2) type = 4;
            else type = 2;

            if (type === 8) {
                return {
                    type,
                    rows: 8,
                    stages: ['CUARTOS', 'SEMIS', 'FINAL'],
                    expectedCounts: { CUARTOS: 4, SEMIS: 2, FINAL: 1 },
                    stagePositions: {
                        CUARTOS: [1, 3, 5, 7],
                        SEMIS: [2, 6],
                        FINAL: [4]
                    }
                };
            }

            if (type === 6) {
                return {
                    type,
                    rows: 4,
                    stages: ['REPECHAJE', 'SEMIS', 'FINAL'],
                    expectedCounts: { REPECHAJE: 2, SEMIS: 2, FINAL: 1 },
                    stagePositions: {
                        REPECHAJE: [1, 3],
                        SEMIS: [1, 3],
                        FINAL: [2]
                    }
                };
            }

            if (type === 4) {
                return {
                    type,
                    rows: 4,
                    stages: ['SEMIS', 'FINAL'],
                    expectedCounts: { SEMIS: 2, FINAL: 1 },
                    stagePositions: {
                        SEMIS: [1, 3],
                        FINAL: [2]
                    }
                };
            }

            return {
                type: 2,
                rows: 2,
                stages: ['FINAL'],
                expectedCounts: { FINAL: 1 },
                stagePositions: { FINAL: [1] }
            };
        }

        function formatFechaLiguilla(p) {
            const cap = (s) => {
                if (!s) return '';
                const t = String(s).trim();
                return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
            };

            try {
                if (p?.fecha_hora) {
                    const dt = new Date(p.fecha_hora);

                    // Usar es-MX para consistencia en español (Dom 19 Ene)
                    const wdRaw = dt.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
                    const monRaw = dt.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
                    const day = String(dt.getDate()).padStart(2, '0');

                    const datePart = `${cap(wdRaw)} ${day} ${cap(monRaw)}`;
                    const timePart = dt.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

                    return `📅 ${datePart} • 🕖 ${timePart}`;
                }
            } catch {}

            if (p?.fecha) {
                const f = String(p.fecha);
                const h = p?.hora ? String(p.hora) : '';
                return h ? `📅 ${f} • 🕖 ${h}` : `📅 ${f}`;
            }

            return '';
        }

        // Panel rápido con los resultados / programación de la ronda activa (mejora 12 + 18)
        function renderLiguillaResumen(partidos) {
            const el = document.getElementById('liguillaResumenWrap');
            if (!el) return;

            const grupos = groupLiguillaByEtapa(partidos || []);
            const layout = getLiguillaLayout(grupos);

            // Etapa activa = primera que tenga algo pendiente
            let etapaActiva = layout.stages[layout.stages.length - 1] || 'FINAL';
            for (const st of layout.stages) {
                const list = (grupos[st] || []).filter(x => !x.__placeholder);
                if (list.some(x => !x.finalizado)) {
                    etapaActiva = st;
                    break;
                }
            }

            const matches = (grupos[etapaActiva] || []).filter(x => !x.__placeholder);

            if (!matches.length) {
                el.innerHTML = '';
                return;
            }

            const badgeStage = {
                REPECHAJE: '🔥 Repechaje',
                CUARTOS: '🏟️ Cuartos',
                SEMIS: '🎯 Semis',
                FINAL: '🏆 Final'
            };

            el.innerHTML = `
              <div class="lig-summary-card">
                <div class="lig-summary-title">${badgeStage[etapaActiva] || etapaActiva} • Resultados / Agenda</div>
                <div class="lig-summary-list">
                  ${matches.map((p) => {
                      const finalizado = !!p.finalizado;
                      const gl = Number(p.goles_local ?? 0);
                      const gv = Number(p.goles_visitante ?? 0);
                      const pl = Number(p.penales_local ?? 0);
                      const pv = Number(p.penales_visitante ?? 0);
                      const empate = finalizado && gl === gv;

                      const local = p.local_nombre || 'Local';
                      const vis = p.visitante_nombre || 'Visitante';

                      let score = finalizado ? `${gl}-${gv}` : 'Pendiente';
                      if (empate) score = `${gl}-${gv} (${pl}-${pv})`;

                      const fechaTxt = formatFechaLiguilla(p);
                      return `
                        <div class="lig-summary-item">
                          <div class="lig-summary-left">
                            <div class="lig-summary-teams">${escapeHtml(local)} <span class="vs">vs</span> ${escapeHtml(vis)}</div>
                            <div class="lig-summary-meta">${fechaTxt ? escapeHtml(fechaTxt) : '⏳ Sin programar'}</div>
                          </div>
                          <div class="lig-summary-right">
                            <div class="lig-summary-score ${finalizado ? 'ok' : ''}">${escapeHtml(score)}</div>
                            <div class="lig-summary-badge ${finalizado ? 'ok' : ''}">${finalizado ? '✅' : '⏳'}</div>
                          </div>
                        </div>
                      `;
                  }).join('')}
                </div>
              </div>
            `;
        }

        // Historial de torneos terminados (mejora 14)
        async function renderHistorialTorneos() {
            const el = document.getElementById('liguillaHistorialWrap');
            if (!el) return;
            if (!supabaseConfigured) return;

            try {
                // Cache 60s para no spamear
                if (__LF_CACHE.historialTorneos?.data && (Date.now() - (__LF_CACHE.historialTorneos.ts || 0) < 60000)) {
                    el.innerHTML = __LF_CACHE.historialTorneos.data;
                    return;
                }

                let q = supabaseClient
                    .from('torneos')
                    .select('id,nombre,campeon_id,subcampeon_id,created_at,fase_actual')
                    .eq('fase_actual', 'TERMINADO')
                    .not('campeon_id', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (torneoActualId) q = q.neq('id', torneoActualId);

                const { data: torList, error } = await q;
                if (error) throw error;

                if (!torList || !torList.length) {
                    el.innerHTML = '';
                    return;
                }

                const ids = Array.from(new Set(
                    torList.flatMap(t => [t.campeon_id, t.subcampeon_id]).filter(Boolean).map(String)
                ));

                const nombres = new Map();
                if (ids.length) {
                    const { data: eqs } = await supabaseClient
                        .from('equipos')
                        .select('id,nombre')
                        .in('id', ids);

                    (eqs || []).forEach(e => nombres.set(String(e.id), String(e.nombre || '')));
                }

                const html = `
                  <div class="lig-history-card">
                    <div class="lig-history-title">📜 Historial de Campeones</div>
                    <div class="lig-history-list">
                      ${torList.map(t => {
                        const camp = nombres.get(String(t.campeon_id)) || '—';
                        const sub = t.subcampeon_id ? (nombres.get(String(t.subcampeon_id)) || '—') : '';
                        const name = String(t.nombre || 'Torneo');
                        return `
                          <div class="lig-history-item">
                            <div class="lig-history-left">
                              <div class="lig-history-name">${escapeHtml(name)}</div>
                              <div class="lig-history-meta">🏆 ${escapeHtml(camp)}${sub ? ` <span style="opacity:.6;">•</span> 🥈 ${escapeHtml(sub)}` : ''}</div>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;

                __LF_CACHE.historialTorneos = { ts: Date.now(), data: html };
                el.innerHTML = html;
            } catch (e) {
                console.warn('No se pudo cargar historial:', e);
                el.innerHTML = '';
            }
        }

        function computeWinnerFlags(p) {
            const gl = Number(p.goles_local ?? 0);
            const gv = Number(p.goles_visitante ?? 0);
            const pl = Number(p.penales_local ?? 0);
            const pv = Number(p.penales_visitante ?? 0);

            // Regla: si empata en goles, penales
            if (gl > gv) return { localWin: true, visitanteWin: false, penales: false };
            if (gv > gl) return { localWin: false, visitanteWin: true, penales: false };

            // Empate
            if (pl > pv) return { localWin: true, visitanteWin: false, penales: true };
            if (pv > pl) return { localWin: false, visitanteWin: true, penales: true };

            return { localWin: false, visitanteWin: false, penales: false };
        }

        function renderLiguillaBracket(partidos) {
            const wrap = document.getElementById('liguillaWrap');
            if (!wrap) return;

            const grupos = groupLiguillaByEtapa(partidos || []);
            const layout = getLiguillaLayout(grupos);

            const htmlCols = layout.stages
                .map(stage => renderBracketColumn(stage, grupos[stage] || [], layout))
                .join('');

            wrap.innerHTML = `
                <div class="bracket" id="liguillaBracket" style="--rows:${layout.rows};">
                    ${htmlCols}
                    <svg class="bracket-svg" id="liguillaBracketSvg"></svg>
                </div>
            `;

            // Guardar layout para redibujar conectores
            window.__liguillaLayoutLast = layout;

            requestAnimationFrame(() => {
                drawBracketConnectors(layout);
            });

            // Recalcular líneas al hacer resize (una sola vez)
            if (!window.__liguillaBracketResizeBound) {
                window.__liguillaBracketResizeBound = true;
                window.addEventListener('resize', () => {
                    const l = window.__liguillaLayoutLast;
                    if (!l) return;
                    requestAnimationFrame(() => drawBracketConnectors(l));
                });
            }
        }

        function renderBracketColumn(stage, matches, layout) {
            const expected = layout.expectedCounts?.[stage] ?? (matches || []).length;
            const arr = Array.isArray(matches) ? [...matches] : [];

            // Completar con placeholders si faltan (para que se vea el bracket completo)
            while (arr.length < expected) {
                arr.push({
                    __placeholder: true,
                    local_nombre: 'Pendiente',
                    visitante_nombre: 'Pendiente',
                    finalizado: false,
                    etapa: stage,
                    llave: arr.length + 1,
                });
            }

            const positions = layout.stagePositions?.[stage] || [];

            const itemsHtml = arr.map((p, idx) => {
                const startRow = positions[idx] || 1;
                return renderBracketMatchCard(p, stage, idx, startRow);
            }).join('');

            return `
                <div class="bracket-col">
                    <div class="bracket-col-title">${escapeHtml(stage)}</div>
                    <div class="bracket-grid" style="--rows:${layout.rows};">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }

        function renderBracketMatchCard(p, stage, idx, startRow) {
            const isPlaceholder = !!p.__placeholder;
            const finalizado = !!p.finalizado && !isPlaceholder;

            const local = p.local_nombre || 'Local';
            const visitante = p.visitante_nombre || 'Visitante';

            const gl = Number(p.goles_local ?? 0);
            const gv = Number(p.goles_visitante ?? 0);
            const pl = Number(p.penales_local ?? 0);
            const pv = Number(p.penales_visitante ?? 0);

            const winner = finalizado
                ? computeWinnerFlags(p)
                : { localWin: false, visitanteWin: false, penales: false };

            // Clases para resaltar ganador (mejora 1)
            const cardWinCls = finalizado
                ? (winner.localWin ? 'winner-local' : (winner.visitanteWin ? 'winner-visit' : ''))
                : '';
            const cardFinalCls = (finalizado && String(stage).toUpperCase() === 'FINAL') ? 'is-final' : '';

            const localCls = finalizado ? (winner.localWin ? 'win' : 'lose') : '';
            const visitCls = finalizado ? (winner.visitanteWin ? 'win' : 'lose') : '';

            // Marcador principal. Si hay empate en liguilla, mostramos penales en paréntesis.
            let scoreLocal = finalizado ? String(gl) : '—';
            let scoreVisit = finalizado ? String(gv) : '—';

            if (finalizado && gl == gv) {
                scoreLocal = `${gl} (${pl})`;
                scoreVisit = `${gv} (${pv})`;
            }

            const fechaTxt = isPlaceholder ? '' : formatFechaLiguilla(p);
            const penTxt = (finalizado && gl == gv) ? `🥅 ${gl}-${gv} (${pl}-${pv})` : '';

            const elId = (p.partido_id || p.id) ? String(p.partido_id || p.id) : `ph-${stage}-${idx}`;
            const canOpenEdit = UI_IS_ADMIN && !isPlaceholder && !!(p.partido_id || p.id);

            // Ícono simple tipo "escudo" (2 letras) para dar sensación de equipo
            const getIco = (name) => {
                const t = String(name || '').trim();
                if (!t || t === 'Pendiente') return '—';
                const parts = t.split(/\s+/).filter(Boolean);
                if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                return (parts[0][0] + parts[1][0]).toUpperCase();
            };

            return `
                <div class="bracket-match bracket-match--minimal ${isPlaceholder ? 'is-placeholder' : ''} ${cardWinCls} ${cardFinalCls}"
                     id="bm-${escapeHtml(elId)}"
                     ${canOpenEdit ? `data-action="liguilla-editar-partido" data-partido-id="${escapeHtml(elId)}" title="Editar partido"` : ''}
                     data-stage="${escapeHtml(stage)}"
                     data-idx="${idx}"
                     style="grid-row:${startRow} / span 2;">

                    <div class="bracket-row bracket-team ${localCls}">
                        <div class="bracket-team">
                            <div class="ico">${escapeHtml(getIco(local))}</div>
                            <div class="name">${escapeHtml(local)}${finalizado && winner.localWin ? ' <span class="crown">👑</span>' : ''}</div>
                        </div>
                        <div class="bracket-score ${finalizado ? '' : 'muted'}">${escapeHtml(scoreLocal)}</div>
                    </div>

                    <div class="bracket-divider"></div>

                    <div class="bracket-row bracket-team ${visitCls}">
                        <div class="bracket-team">
                            <div class="ico">${escapeHtml(getIco(visitante))}</div>
                            <div class="name">${escapeHtml(visitante)}${finalizado && winner.visitanteWin ? ' <span class="crown">👑</span>' : ''}</div>
                        </div>
                        <div class="bracket-score ${finalizado ? '' : 'muted'}">${escapeHtml(scoreVisit)}</div>
                    </div>

                    <div class="bracket-meta">
                        <div class="bf-meta-date">${fechaTxt ? escapeHtml(fechaTxt) : ''}</div>
                        <div class="bf-meta-pen">${penTxt ? escapeHtml(penTxt) : ''}</div>
                    </div>

                </div>
            `;
        }

        function drawBracketConnectors(layout) {
            const bracket = document.getElementById('liguillaBracket');
            const svg = document.getElementById('liguillaBracketSvg');
            if (!bracket || !svg || !layout) return;

            // limpiar
            while (svg.firstChild) svg.removeChild(svg.firstChild);

            const w = bracket.scrollWidth || bracket.offsetWidth || 1;
            const h = bracket.scrollHeight || bracket.offsetHeight || 1;

            svg.setAttribute('width', String(w));
            svg.setAttribute('height', String(h));
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

            const getStageEls = (stage) => {
                return Array.from(bracket.querySelectorAll(`.bracket-match[data-stage="${stage}"]`))
                    .sort((a, b) => Number(a.dataset.idx || 0) - Number(b.dataset.idx || 0));
            };

            const ns = 'http://www.w3.org/2000/svg';
            const rootRect = bracket.getBoundingClientRect();

            const drawPath = (srcEl, tgtEl) => {
                if (!srcEl || !tgtEl) return;

                const s = srcEl.getBoundingClientRect();
                const t = tgtEl.getBoundingClientRect();

                const sx = (s.right - rootRect.left);
                const sy = (s.top + s.height / 2 - rootRect.top);
                const ex = (t.left - rootRect.left);
                const ey = (t.top + t.height / 2 - rootRect.top);

                // si están demasiado cerca, evitamos glitches
                if (!isFinite(sx) || !isFinite(sy) || !isFinite(ex) || !isFinite(ey)) return;

                let mx = sx + Math.max(20, (ex - sx) * 0.50);
                if (mx > ex - 16) mx = (sx + ex) / 2;

                const path = document.createElementNS(ns, 'path');
                // "L" con esquinas redondeadas (mejora 3)
                const r = 10;
                const sign = ey >= sy ? 1 : -1;
                const h1 = mx - r;
                const v2 = ey - sign * r;
                const d = `M ${sx} ${sy} H ${h1} Q ${mx} ${sy} ${mx} ${sy + sign * r} V ${v2} Q ${mx} ${ey} ${mx + r} ${ey} H ${ex}`;
                path.setAttribute('d', d);
                path.setAttribute('class', 'bracket-path');
                svg.appendChild(path);
            };

            if (layout.type === 8) {
                const qf = getStageEls('CUARTOS');
                const sf = getStageEls('SEMIS');
                const fn = getStageEls('FINAL');

                drawPath(qf[0], sf[0]);
                drawPath(qf[1], sf[0]);
                drawPath(qf[2], sf[1]);
                drawPath(qf[3], sf[1]);

                drawPath(sf[0], fn[0]);
                drawPath(sf[1], fn[0]);
            }

            if (layout.type === 6) {
                const rep = getStageEls('REPECHAJE');
                const sf = getStageEls('SEMIS');
                const fn = getStageEls('FINAL');

                // Reglas 6 equipos: llave1 -> Semi2, llave2 -> Semi1
                drawPath(rep[0], sf[1]);
                drawPath(rep[1], sf[0]);

                drawPath(sf[0], fn[0]);
                drawPath(sf[1], fn[0]);
            }

            if (layout.type === 4) {
                const sf = getStageEls('SEMIS');
                const fn = getStageEls('FINAL');

                drawPath(sf[0], fn[0]);
                drawPath(sf[1], fn[0]);
            }

            // type 2 = nada que conectar
        }
async function generarLiguillaDesdeUI() {
            if (!supabaseConfigured || !torneoActualId) {
                alert('Selecciona un torneo primero.');
                return;
            }

            // Si ya existe liguilla, evitamos el doble click (la BD también lo bloquea)
            const btnGen = document.querySelector('[data-action="generar-liguilla"]');
            if (btnGen && String(btnGen.dataset?.liguillaGenerada || '') === '1') {
                alert('La liguilla ya fue generada para este torneo.');
                return;
            }

            const select = document.getElementById('liguillaCupos');
            const fechaInput = document.getElementById('liguillaFecha');
            const horaSelect = document.getElementById('liguillaHora');
            const estado = document.getElementById('liguillaEstado');
            const cupos = Number(select?.value ?? 8);

            const fecha = String(fechaInput?.value || '').trim();
            const hora = String(horaSelect?.value || '').trim();

            // Opcional, pero recomendado: que quede programada la ronda 1 desde que se genera
            if (fecha && !hora) {
                alert('Selecciona la hora de la ronda 1');
                return;
            }
            if (hora && !fecha) {
                alert('Selecciona la fecha de la ronda 1');
                return;
            }

            if (estado) estado.textContent = 'Generando liguilla…';

            try {
                const { error } = await supabaseClient.rpc('generar_liguilla', {
                    p_torneo_id: torneoActualId,
                    p_cupos: cupos,
                });

                if (error) throw error;

                // Si eligieron fecha/hora, se la ponemos a la primera ronda (desde el front)
                if (fecha && hora) {
                    await asignarFechaHoraLiguillaPrimeraRonda(cupos, fecha, hora);
                }

                if (estado) estado.textContent = '✅ Liguilla generada.';
                await cargarLiguilla();

                // Refrescar calendario (para que la ronda 1 salga con fecha/hora sin recargar)
                await cargarPartidos();
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (err) {
                console.error('Error generando liguilla:', err);
                if (estado) estado.textContent = '';
                alert(err?.message || 'No se pudo generar la liguilla.');
            }
        }

        function getEtapaPrimeraRonda(cupos) {
            const n = Number(cupos || 8);
            if (n === 2) return 'FINAL';
            if (n === 4) return 'SEMIS';
            if (n === 6) return 'REPECHAJE';
            return 'CUARTOS';
        }

        async function asignarFechaHoraLiguillaPrimeraRonda(cupos, fecha, hora) {
            try {
                const etapa = getEtapaPrimeraRonda(cupos);
                const { data, error } = await supabaseClient
                    .from('v_liguilla_partidos')
                    .select('partido_id, etapa, llave')
                    .eq('torneo_id', torneoActualId)
                    .eq('etapa', etapa);

                if (error) throw error;

                const partidos = (data || [])
                    .filter(x => !!x.partido_id)
                    .map(x => ({ id: String(x.partido_id), llave: Number(x.llave || 1) }))
                    .sort((a, b) => a.llave - b.llave);

                if (!partidos.length) return;

                const base = new Date(`${fecha}T${hora}`);
                if (Number.isNaN(base.getTime())) return;

                // Match 1 a la hora elegida, match 2 a la hora siguiente, etc.
                for (const p of partidos) {
                    const offsetH = Math.max(0, (p.llave || 1) - 1);
                    const dt = new Date(base.getTime() + offsetH * 60 * 60 * 1000);

                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    const fechaMatch = `${y}-${m}-${d}`;
                    const horaMatch = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

                    const { error: updErr } = await supabaseClient
                        .from('partidos')
                        .update({
                            fecha: fechaMatch,
                            hora: horaMatch,
                            fecha_hora: dt.toISOString(),
                        })
                        .eq('torneo_id', torneoActualId)
                        .eq('id', p.id);

                    if (updErr) throw updErr;

                    // Mantener cache en memoria
                    enfrentamientosProgramados = (enfrentamientosProgramados || []).map(ep => {
                        if (String(ep.id) === String(p.id)) {
                            return {
                                ...ep,
                                fecha: fechaMatch,
                                hora: horaMatch,
                                fechaHora: dt,
                            };
                        }
                        return ep;
                    });
                }
            } catch (e) {
                console.warn('No se pudo asignar fecha/hora a la liguilla:', e);
            }
        }

        // Programar la ronda activa (mejora 7)
        // - Usa los inputs de Fecha/Hora del generador si existen
        // - Si están vacíos, usa el próximo domingo + la hora sugerida
        async function programarRondaActivaLiguilla() {
            if (!UI_IS_ADMIN) return;
            if (!supabaseConfigured || !torneoActualId) {
                alert('Selecciona un torneo primero.');
                return;
            }

            // Si el torneo ya terminó, no tiene sentido reprogramar rondas
            try {
                const { data: t } = await supabaseClient
                    .from('torneos')
                    .select('fase_actual')
                    .eq('id', torneoActualId)
                    .maybeSingle();

                if (String(t?.fase_actual || '').toUpperCase() === 'TERMINADO') {
                    alert('Este torneo ya terminó. No se pueden reprogramar rondas de liguilla.');
                    const estado = document.getElementById('liguillaEstado');
                    if (estado) estado.textContent = '🏆 Torneo terminado. La liguilla está cerrada.';
                    return;
                }
            } catch {}

            const estado = document.getElementById('liguillaEstado');
            if (estado) estado.textContent = 'Programando ronda activa…';

            try {
                // Traemos liguilla (con cache ligero)
                const cached = cacheGet(__LF_CACHE.liguillaByTorneo, torneoActualId, 15000);
                const data = Array.isArray(cached) ? cached : (await (async () => {
                    const { data, error } = await supabaseClient
                        .from('v_liguilla_partidos')
                        .select('*')
                        .eq('torneo_id', torneoActualId)
                        .order('ronda', { ascending: true })
                        .order('llave', { ascending: true });
                    if (error) throw error;
                    cacheSet(__LF_CACHE.liguillaByTorneo, torneoActualId, data || []);
                    return data || [];
                })());

                if (!data.length) {
                    alert('Aún no hay liguilla generada.');
                    if (estado) estado.textContent = '';
                    return;
                }

                const rondaActiva = getRondaActiva(data);
                const partidosRonda = data
                    .filter(p => Number(p.ronda || 0) === rondaActiva)
                    .filter(p => !!(p.partido_id || p.id));

                if (!partidosRonda.length) {
                    alert('No encontré partidos para programar en la ronda activa.');
                    if (estado) estado.textContent = '';
                    return;
                }

                // Fecha/hora elegida o default
                const fechaInput = document.getElementById('liguillaFecha');
                const horaSelect = document.getElementById('liguillaHora');
                let fecha = String(fechaInput?.value || '').trim();
                let hora = String(horaSelect?.value || '').trim();

                if (!fecha || !hora) {
                    const { fecha: fDef, hora: hDef } = getDefaultDomingoHora();
                    if (!fecha) fecha = fDef;
                    if (!hora) hora = hDef;
                }

                if (!fecha || !hora) {
                    alert('Selecciona fecha y hora para programar.');
                    if (estado) estado.textContent = '';
                    return;
                }

                const base = new Date(`${fecha}T${hora}`);
                if (Number.isNaN(base.getTime())) {
                    alert('Fecha u hora inválida');
                    if (estado) estado.textContent = '';
                    return;
                }

                // Orden por llave y aplicamos +1h por cada partido
                const ordenados = partidosRonda
                    .map(p => ({ id: String(p.partido_id || p.id), llave: Number(p.llave || 1) }))
                    .sort((a, b) => a.llave - b.llave);

                for (const p of ordenados) {
                    const offsetH = Math.max(0, (p.llave || 1) - 1);
                    const dt = new Date(base.getTime() + offsetH * 60 * 60 * 1000);

                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    const fechaMatch = `${y}-${m}-${d}`;
                    const horaMatch = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

                    const { error: updErr } = await supabaseClient
                        .from('partidos')
                        .update({
                            fecha: fechaMatch,
                            hora: horaMatch,
                            fecha_hora: dt.toISOString(),
                        })
                        .eq('torneo_id', torneoActualId)
                        .eq('id', p.id);

                    if (updErr) throw updErr;

                    // Actualizar cache en memoria
                    for (const row of data) {
                        const rid = String(row.partido_id || row.id);
                        if (rid === p.id) {
                            row.fecha = fechaMatch;
                            row.hora = horaMatch;
                            row.fecha_hora = dt.toISOString();
                        }
                    }
                }

                // Guardar cache
                cacheSet(__LF_CACHE.liguillaByTorneo, torneoActualId, data);

                if (estado) estado.textContent = '✅ Ronda programada.';

                // Refrescar UI liguilla + calendario
                await cargarLiguilla({ force: true });
                await cargarPartidos();
                actualizarProximoPartido();
                actualizarListaEnfrentamientos();
                actualizarTimelineMini();
            } catch (e) {
                console.error('Error programando ronda activa:', e);
                if (estado) estado.textContent = '';
                alert(e?.message || 'No se pudo programar la ronda activa.');
            }
        }

        function getRondaActiva(partidos) {
            const rondas = Array.from(new Set((partidos || []).map(p => Number(p.ronda || 0)).filter(n => n > 0))).sort((a, b) => a - b);
            if (!rondas.length) return 1;
            for (const r of rondas) {
                const list = (partidos || []).filter(p => Number(p.ronda || 0) === r);
                if (list.some(p => !p.finalizado)) return r;
            }
            return rondas[rondas.length - 1];
        }

        function getDefaultDomingoHora() {
            // Próximo domingo
            const now = new Date();
            const day = now.getDay(); // 0 Domingo
            const diff = (7 - day) % 7;
            const next = new Date(now);
            next.setDate(now.getDate() + (diff === 0 ? 7 : diff));
            next.setHours(0, 0, 0, 0);
            const y = next.getFullYear();
            const m = String(next.getMonth() + 1).padStart(2, '0');
            const d = String(next.getDate()).padStart(2, '0');
            // Hora default: primera opción disponible en el select
            const horaSelect = document.getElementById('liguillaHora');
            let hora = '18:00';
            if (horaSelect && horaSelect.options?.length) {
                const opt = Array.from(horaSelect.options).find(o => o.value);
                if (opt?.value) hora = String(opt.value);
            }
            return { fecha: `${y}-${m}-${d}`, hora };
        }

        async function renderCampeonLiguilla() {
            const champWrap = document.getElementById('liguillaCampeonWrap');
            if (!champWrap) return;
            if (!supabaseConfigured || !torneoActualId) return;

            try {
                const { data: t, error } = await supabaseClient
                    .from('torneos')
                    .select('campeon_id, subcampeon_id, fase_actual')
                    .eq('id', torneoActualId)
                    .maybeSingle();

                if (error || !t) {
                    champWrap.innerHTML = '';
                    return;
                }

                if (String(t.fase_actual || '').toUpperCase() !== 'TERMINADO' || !t.campeon_id) {
                    champWrap.innerHTML = '';
                    return;
                }

                const ids = [t.campeon_id, t.subcampeon_id].filter(Boolean);
                const { data: eqs } = await supabaseClient
                    .from('equipos')
                    .select('id,nombre')
                    .in('id', ids);

                const map = new Map((eqs || []).map(x => [x.id, x.nombre]));
                const campeon = map.get(t.campeon_id) || 'Campeón';
                const sub = t.subcampeon_id ? (map.get(t.subcampeon_id) || 'Subcampeón') : '';

                champWrap.innerHTML = `
                    <div class="admin-card" style="padding:14px;">
                        <h3 style="margin:0 0 10px;">🏆 Campeón</h3>
                        <div style="font-size:1.1em; font-weight:900;">${escapeHtml(campeon)}</div>
                        ${sub ? `<div style="opacity:.8; margin-top:6px;">🥈 Subcampeón: <b>${escapeHtml(sub)}</b></div>` : ''}
                    </div>
                `;
            } catch (err) {
                console.warn('No se pudo renderizar campeón:', err);
                champWrap.innerHTML = '';
            }
        }
        function setEventosControlsEnabled(enabled) {
            const ids = ['eventoEquipoSelect', 'eventoJugadorSelect', 'eventoTipoSelect', 'eventoMinutoInput'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = !enabled;
            });
            const btn = document.querySelector('#modalEditar [data-action="evento-agregar"]');
            if (btn) btn.disabled = !enabled;
        }

        function limpiarEventosModalUI() {
            const wrap = document.getElementById('eventosWrap');
            const lista = document.getElementById('eventosLista');
            const hint = document.getElementById('eventosHint');
            if (wrap) wrap.style.display = 'none';
            if (lista) lista.innerHTML = '';
            if (hint) {
                hint.textContent = '';
                hint.style.display = 'none';
            }
            setEventosControlsEnabled(true);
        }

        function getTipoLabel(tipo) {
            const t = String(tipo || '');
            return (EVENT_TYPES.find(x => x.value === t)?.label) || t || '—';
        }

        function getEquipoNombreSafe(equipoId) {
            if (!equipoId) return '—';
            return equiposById.get(String(equipoId)) || (equipos || []).find(x => String(x.id) === String(equipoId))?.nombre || '—';
        }

        function getJugadorNombreSafe(jugadorId) {
            if (!jugadorId) return '';
            const j = jugadoresEventosById.get(String(jugadorId));
            return j?.nombre ? String(j.nombre) : 'Jugador';
        }

        async function fetchJugadoresEquipoParaEventos(equipoId) {
            const key = String(equipoId);
            if (jugadoresPorEquipoCache.has(key)) return jugadoresPorEquipoCache.get(key);

            // Intentar traer campos comunes; si falta "activo", caemos a select('*')
            let res = await supabaseClient
                .from('jugadores')
                .select('id, nombre, dorsal, posicion, equipo_id, activo')
                .eq('torneo_id', torneoActualId)
                .eq('equipo_id', key)
                .order('nombre', { ascending: true });

            if (res.error && isMissingColumn(res.error, 'activo')) {
                res = await supabaseClient
                    .from('jugadores')
                    .select('id, nombre, dorsal, posicion, equipo_id')
                    .eq('torneo_id', torneoActualId)
                    .eq('equipo_id', key)
                    .order('nombre', { ascending: true });
            }

            if (res.error) throw res.error;

            const list = res.data || [];
            list.forEach(j => jugadoresEventosById.set(String(j.id), j));
            jugadoresPorEquipoCache.set(key, list);
            return list;
        }

        async function poblarSelectJugadoresEvento(equipoId) {
            const selJugador = document.getElementById('eventoJugadorSelect');
            if (!selJugador) return;

            selJugador.innerHTML = '<option value="">Sin jugador</option>';
            if (!equipoId) return;

            try {
                const jugadoresEq = await fetchJugadoresEquipoParaEventos(equipoId);
                const opts = (jugadoresEq || []).map(j => {
                    const dorsal = (j.dorsal ?? j.numero ?? null);
                    const dorsalTxt = (dorsal !== null && dorsal !== undefined && dorsal !== '') ? `#${dorsal} ` : '';
                    const activo = (j.activo === false) ? ' (Inactivo)' : '';
                    return `<option value="${escapeHtml(j.id)}">${escapeHtml(dorsalTxt + (j.nombre || 'Jugador') + activo)}</option>`;
                }).join('');
                selJugador.insertAdjacentHTML('beforeend', opts);
            } catch (err) {
                console.error('Error cargando jugadores para eventos:', err);
                // dejamos "Sin jugador"
            }
        }

		async function fetchMarcadorPartidoDesdeBD(partidoId) {
			if (!supabaseConfigured || !torneoActualId || !partidoId) {
				return { golesLocal: 0, golesVisitante: 0, penalesLocal: 0, penalesVisitante: 0 };
			}
			try {
				const { data, error } = await supabaseClient
					.from('marcadores_partido')
					.select('goles_local, goles_visitante, penales_local, penales_visitante')
					.eq('torneo_id', torneoActualId)
					.eq('partido_id', partidoId)
					.maybeSingle();

				// Fallback si la columna de penales no existe
				if (error && isMissingColumn(error, 'penales_local')) {
					const res2 = await supabaseClient
						.from('marcadores_partido')
						.select('goles_local, goles_visitante')
						.eq('torneo_id', torneoActualId)
						.eq('partido_id', partidoId)
						.maybeSingle();
					return {
						golesLocal: Number(res2.data?.goles_local ?? 0),
						golesVisitante: Number(res2.data?.goles_visitante ?? 0),
						penalesLocal: 0,
						penalesVisitante: 0,
					};
				}

				if (error && !isMissingTable(error, 'marcadores_partido')) {
					console.warn('No se pudo leer marcadores_partido (preview):', error);
				}
				return {
					golesLocal: Number(data?.goles_local ?? 0),
					golesVisitante: Number(data?.goles_visitante ?? 0),
					penalesLocal: Number(data?.penales_local ?? 0),
					penalesVisitante: Number(data?.penales_visitante ?? 0),
				};
			} catch (e) {
				console.warn('fetchMarcadorPartidoDesdeBD fallo (ignorado):', e);
				return { golesLocal: 0, golesVisitante: 0, penalesLocal: 0, penalesVisitante: 0 };
			}
		}

		function calcularMarcadorDesdeEventos(partido, evs) {
			const localId = partido?.localId ? String(partido.localId) : null;
			const visitanteId = partido?.visitanteId ? String(partido.visitanteId) : null;
			let golesLocal = 0;
			let golesVisitante = 0;

			(evs || []).forEach(ev => {
				const tipo = String(ev?.tipo_evento || '').toUpperCase();
				const eqId = ev?.equipo_id ? String(ev.equipo_id) : null;
				if (!localId || !visitanteId || !eqId) return;

				if (tipo === 'GOL') {
					if (eqId === localId) golesLocal += 1;
					else if (eqId === visitanteId) golesVisitante += 1;
					return;
				}
				if (tipo === 'AUTOGOL') {
					// Opción A: equipo_id = equipo que cometió el autogol (el gol cuenta al rival)
					if (eqId === localId) golesVisitante += 1;
					else if (eqId === visitanteId) golesLocal += 1;
				}
			});

			return { golesLocal, golesVisitante };
		}

		function actualizarMarcadorModal(partido, marcador) {
			const txt = document.getElementById('marcadorTexto');
			const sub = document.getElementById('marcadorSub');
			if (!txt || !sub) return;
			const gl = Number(marcador?.golesLocal ?? 0);
			const gv = Number(marcador?.golesVisitante ?? 0);
			txt.textContent = `${gl} - ${gv}`;
			if (partido?.finalizado) {
				sub.textContent = '✅ Oficial (cuenta para tabla)';
			} else {
				const hayEventos = Array.isArray(eventosPartido) && eventosPartido.length > 0;
				sub.textContent = hayEventos ? '📝 Previo (aún no cuenta)' : '📝 Sin eventos (aún no cuenta)';
			}
			// Mostrar/ocultar penales si es liguilla y hay empate
			actualizarPenalesModalUI(partido, marcador);
		}

		function actualizarPenalesModalUI(partido, marcador) {
			const wrap = document.getElementById('penalesWrap');
			const inPL = document.getElementById('editarPenalesLocal');
			const inPV = document.getElementById('editarPenalesVisitante');
			const hint = document.getElementById('penalesHint');
			if (!wrap || !inPL || !inPV) return;

			const fase = String(partido?.fase || '').toUpperCase();
			const esLiguilla = (fase === 'LIGUILLA');
			const gl = Number(marcador?.golesLocal ?? 0);
			const gv = Number(marcador?.golesVisitante ?? 0);
			const empate = (gl === gv);

			if (esLiguilla && empate) {
				wrap.style.display = 'block';
				const pl = (marcador?.penalesLocal ?? null);
				const pv = (marcador?.penalesVisitante ?? null);
				inPL.value = (pl === null || pl === undefined) ? '' : String(pl);
				inPV.value = (pv === null || pv === undefined) ? '' : String(pv);
				if (hint) hint.textContent = 'Tip: deben ser diferentes (ej. 5-4).';
			} else {
				wrap.style.display = 'none';
				inPL.value = '';
				inPV.value = '';
			}
		}

		async function upsertMarcadorPartidoEnBD(partidoId, marcador) {
			if (!supabaseConfigured || !torneoActualId || !partidoId) return;
			try {
				const payloadBase = {
					torneo_id: torneoActualId,
					partido_id: partidoId,
					goles_local: Number(marcador?.golesLocal ?? 0),
					goles_visitante: Number(marcador?.golesVisitante ?? 0),
					penales_local: Number(marcador?.penalesLocal ?? 0),
					penales_visitante: Number(marcador?.penalesVisitante ?? 0)
				};

				const stripPenales = (obj) => {
					const o = { ...obj };
					delete o.penales_local;
					delete o.penales_visitante;
					return o;
				};

				// PK = partido_id, así que podemos UPSERT directo
				let res = await supabaseClient
					.from('marcadores_partido')
					.upsert([payloadBase], { onConflict: 'partido_id' });

				if (res.error && isMissingColumn(res.error, 'penales_local')) {
					res = await supabaseClient
						.from('marcadores_partido')
						.upsert([stripPenales(payloadBase)], { onConflict: 'partido_id' });
				}

				if (res.error) {
					if (isMissingTable(res.error, 'marcadores_partido')) return;
					throw res.error;
				}
			} catch (e) {
				console.warn('No se pudo guardar marcadores_partido:', e);
			}
		}


        async function cargarEventosPartido() {
            const lista = document.getElementById('eventosLista');
            const hint = document.getElementById('eventosHint');
            if (!lista || !hint) return;

            if (!supabaseConfigured || !torneoActualId || !partidoEditandoId) return;

            try {
                const { data, error } = await supabaseClient
                    .from('eventos_partido')
                    .select('*')
                    .eq('torneo_id', torneoActualId)
                    .eq('partido_id', partidoEditandoId)
                    .order('created_at', { ascending: true });

                if (error) {
                    if (isMissingTable(error, 'eventos_partido')) {
                        hint.textContent = 'No existe la tabla "eventos_partido". Crea la tabla y recarga.';
                        hint.style.display = 'block';
                        lista.innerHTML = '';
                        setEventosControlsEnabled(false);
                        return;
                    }
                    throw error;
                }

                setEventosControlsEnabled(true);
                hint.style.display = 'none';
                hint.textContent = '';

                eventosPartido = data || [];
                renderEventosPartido();

				// Actualizar marcador (preview u oficial) en el modal
				const partido = (indiceEditando !== -1) ? enfrentamientosProgramados[indiceEditando] : null;
				if (partido) {
					const marcador = await fetchMarcadorPartidoDesdeBD(partidoEditandoId);
					actualizarMarcadorModal(partido, marcador);
					if (partido.finalizado) {
						partido.resultado = { ...marcador };
					}
				}
            } catch (err) {
                console.error('Error cargando eventos:', err);
                lista.innerHTML = '<div class="empty-state">Error cargando eventos.</div>';
            }
        }

        function renderEventosPartido() {
            const lista = document.getElementById('eventosLista');
            if (!lista) return;

            const evs = eventosPartido || [];
            if (!evs.length) {
                lista.innerHTML = '<div class="empty-state">Aún no hay eventos en este partido.</div>';
                return;
            }

            lista.innerHTML = evs.map(ev => {
                const tipo = getTipoLabel(ev.tipo_evento);
                const minuto = (ev.minuto !== null && ev.minuto !== undefined) ? `${ev.minuto}'` : '';
                const eq = getEquipoNombreSafe(ev.equipo_id);
                const jugador = ev.jugador_id ? getJugadorNombreSafe(ev.jugador_id) : '';

                const sub = [minuto, eq, jugador].filter(Boolean).join(' · ');

                return `
                    <div class="match-item" style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                        <div>
                            <div style="font-weight:800;">${escapeHtml(tipo)}</div>
                            <div style="opacity:.75; font-size:.92em; margin-top:3px;">${escapeHtml(sub || '—')}</div>
                        </div>
                        <button type="button" class="btn-delete" data-action="evento-eliminar" data-id="${escapeHtml(ev.id)}" style="margin:0;">Eliminar</button>
                    </div>
                `;
            }).join('');
        }

        async function initEventosModal(partido) {
            const wrap = document.getElementById('eventosWrap');
            const hint = document.getElementById('eventosHint');
            if (!wrap || !hint) return;

            if (!supabaseConfigured || !torneoActualId || !partidoEditandoId) {
                wrap.style.display = 'none';
                return;
            }

            // Si no tenemos IDs de equipos, mejor ocultar (eventos dependen de equipo)
            if (!partido?.localId || !partido?.visitanteId) {
                wrap.style.display = 'none';
                return;
            }

            wrap.style.display = 'block';
            hint.style.display = 'none';
            hint.textContent = '';

            const selEquipo = document.getElementById('eventoEquipoSelect');
            const selTipo = document.getElementById('eventoTipoSelect');
            if (!selEquipo || !selTipo) return;

            // Equipo select: Local/Visitante
            selEquipo.innerHTML = `
                <option value="${escapeHtml(partido.localId)}">${escapeHtml(partido.local)} (Local)</option>
                <option value="${escapeHtml(partido.visitanteId)}">${escapeHtml(partido.visitante)} (Visitante)</option>
            `;
            selEquipo.value = (eventoEquipoSeleccionadoId && (String(eventoEquipoSeleccionadoId) === String(partido.localId) || String(eventoEquipoSeleccionadoId) === String(partido.visitanteId)))
                ? String(eventoEquipoSeleccionadoId)
                : String(partido.localId);

            // Tipo select
            selTipo.innerHTML = EVENT_TYPES.map(t => `<option value="${t.value}">${escapeHtml(t.label)}</option>`).join('');

            // Jugadores (depende del equipo)
            eventoEquipoSeleccionadoId = selEquipo.value;
            await poblarSelectJugadoresEvento(eventoEquipoSeleccionadoId);

            // Cargar listado
            await cargarEventosPartido();
        }

        async function onEventoEquipoChange(equipoId) {
            eventoEquipoSeleccionadoId = equipoId ? String(equipoId) : null;
            await poblarSelectJugadoresEvento(eventoEquipoSeleccionadoId);
        }

        async function agregarEventoPartido() {
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            if (!partidoEditandoId || indiceEditando === -1) {
                showError('No se encontró el partido a editar');
                return;
            }

            const partido = enfrentamientosProgramados[indiceEditando];
            if (!partido) return;

            const selEquipo = document.getElementById('eventoEquipoSelect');
            const selJugador = document.getElementById('eventoJugadorSelect');
            const selTipo = document.getElementById('eventoTipoSelect');
            const inputMin = document.getElementById('eventoMinutoInput');

            const equipoId = String(selEquipo?.value || '');
            const jugadorIdRaw = String(selJugador?.value || '');
            const tipo = String(selTipo?.value || '');
            const minutoRaw = String(inputMin?.value || '').trim();

            if (!equipoId) {
                alert('Selecciona el equipo');
                return;
            }
            if (!EVENT_TYPES.some(x => x.value === tipo)) {
                alert('Selecciona un tipo de evento');
                return;
            }

            let minuto = null;
            if (minutoRaw !== '') {
                const m = parseInt(minutoRaw, 10);
                if (Number.isNaN(m) || m < 0 || m > 130) {
                    alert('Minuto inválido (0 a 130)');
                    return;
                }
                minuto = m;
            }

            const payload = {
                torneo_id: torneoActualId,
                partido_id: partidoEditandoId,
                equipo_id: equipoId,
                jugador_id: jugadorIdRaw ? jugadorIdRaw : null,
                tipo_evento: tipo,
                minuto
            };

            showLoading();
            try {
                const { error } = await supabaseClient
                    .from('eventos_partido')
                    .insert([payload]);

                if (error) {
                    if (isMissingTable(error, 'eventos_partido')) {
                        showError('Falta la tabla "eventos_partido" en Supabase');
                        return;
                    }
                    throw error;
                }

                if (inputMin) inputMin.value = '';
                // refrescar lista y reportes
                await cargarEventosPartido();
                                await cargarEstadisticasLectura();
            } catch (err) {
                console.error('Error agregando evento:', err);
                showError('Error al agregar evento');
            } finally {
                hideLoading();
            }
        }

        async function eliminarEventoPartido(eventoId) {
            const id = String(eventoId || '').trim();
            if (!id) return;

            if (!confirm('¿Eliminar este evento?')) return;

            if (!supabaseConfigured || !torneoActualId) return;
            if (!partidoEditandoId) return;

            showLoading();
            try {
                const { error } = await supabaseClient
                    .from('eventos_partido')
                    .delete()
                    .eq('id', id)
                    .eq('torneo_id', torneoActualId);

                if (error) {
                    if (isMissingTable(error, 'eventos_partido')) {
                        showError('Falta la tabla "eventos_partido" en Supabase');
                        return;
                    }
                    throw error;
                }

                eventosPartido = (eventosPartido || []).filter(x => String(x.id) !== id);
                renderEventosPartido();
                                await cargarEstadisticasLectura();
            } catch (err) {
                console.error('Error eliminando evento:', err);
                showError('Error al eliminar evento');
            } finally {
                hideLoading();
            }
        }

        // ==========================================
        // FUNCIONES DE AVISOS
        // ==========================================
        
        async function guardarAviso(e) {
            e.preventDefault();

            if (!UI_IS_ADMIN) {
                showError('Acceso denegado');
                return;
            }

            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }

            const avisoInput = document.getElementById('avisoInput');
            if (!avisoInput) return;

            const texto = String(avisoInput.value || '').trim();

            if (texto.length > AVISO_MAX_CHARS) {
                showError(`El aviso es demasiado largo (${texto.length}/${AVISO_MAX_CHARS}).`);
                return;
            }

            showLoading();
            try {
                // 1) Apagar cualquier aviso activo
                const off = await supabaseClient
                    .from('avisos')
                    .update({ activo: false })
                    .eq('torneo_id', torneoActualId)
                    .eq('activo', true);

                if (off.error) throw off.error;

                if (texto) {
                    // 2) Insertar nuevo activo (guardamos historial)
                    const ins = await supabaseClient
                        .from('avisos')
                        .insert([{ texto, activo: true, torneo_id: torneoActualId }])
                        .select('id, texto, created_at, updated_at')
                        .single();

                    if (ins.error) throw ins.error;

                    avisoActualObj = ins.data || null;
                    avisoActual = texto;
                    _lastAvisoLoadedText = texto;
                } else {
                    avisoActualObj = null;
                    avisoActual = '';
                    _lastAvisoLoadedText = '';
                }

                syncAvisosAdminUI(true);
                mostrarAvisoBanner();

                // Historial visible en admin
                await cargarAvisosHistorial();

            } catch (error) {
                console.error('Error:', error);
                showError('Error al guardar aviso');
            } finally {
                hideLoading();
            }
        }

        function mostrarAvisoBanner() {
            const banner = document.getElementById('bannerAvisos');
            const display = document.getElementById('avisoDisplay');

            if (!banner || !display) return;

            if (avisoActual) {
                display.textContent = avisoActual;
                display.classList.add('show');
                banner.style.display = 'block';
            } else {
                display.classList.remove('show');
                banner.style.display = 'none';
            }
        }

        // ==========================================
        // FUNCIONES DE VISUALIZACIÓN
        // ==========================================
        
        function actualizarProximoPartido() {
            const ahora = new Date();
            const futuros = enfrentamientosProgramados
                .filter(e => e && e.fechaHora && e.fechaHora >= ahora && !e.resultado)
                .sort((a, b) => a.fechaHora - b.fechaHora);

            proximoEnfrentamiento = futuros.length > 0 ? futuros[0] : null;
            mostrarProximoPartido();
        }

        function mostrarProximoPartido() {
            const div = document.getElementById('proximoPartido');
            if (!div) return;

            if (proximoEnfrentamiento) {
                const fechaObj = new Date(proximoEnfrentamiento.fechaHora);
                const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const fechaFormato = fechaObj.toLocaleDateString('es-ES', opciones);
                const mapsUrl = `https://maps.google.com/?q=${proximoEnfrentamiento.ubicacion.lat},${proximoEnfrentamiento.ubicacion.lng}`;

                const tipo = (proximoEnfrentamiento.tipoPartido ?? proximoEnfrentamiento.tipo_partido ?? 'OFICIAL');
                const tipoTagHtml = (tipo === 'AMISTOSO')
                    ? '<div style="display:inline-block; margin: 6px 0 10px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.25); font-weight: 800;">🤝 Amistoso</div>'
                    : '';

                const notasHtml = proximoEnfrentamiento.notas ? `
                    <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 6px; margin-top: 15px; font-size: 0.95em;">
                        <strong>📝 Notas:</strong><br>
                        ${proximoEnfrentamiento.notas}
                    </div>
                ` : '';

                div.innerHTML = `
                    <div class="next-match-card">
                        <h3>Próximo Enfrentamiento</h3>
                        ${tipoTagHtml}
                        <div class="next-match-teams">
                            ${proximoEnfrentamiento.local} <span style="font-size: 0.7em; margin: 0 15px;">VS</span> ${proximoEnfrentamiento.visitante}
                        </div>
                        <div class="next-match-datetime">
                            📅 ${fechaFormato}<br>
                            ⏰ ${proximoEnfrentamiento.hora}<br>
                            <a href="${mapsUrl}" target="_blank" style="color: white; text-decoration: underline; margin-top: 8px; display: inline-block;">📍 Ver ubicación</a>
                        </div>
                        ${notasHtml}
                    </div>
                `;
            } else {
                div.innerHTML = '<div class="empty-state">No hay partidos programados próximamente</div>';
            }
        }

        function filtrarPartidos(filtro) {
            filtroActual = filtro;

            // Selector de equipo SOLO dentro de "Todos"
            const wrap = document.getElementById('filtroTodosEquipoWrap');
            const sel = document.getElementById('filtroEquipoSelect');

            if (filtroActual === 'todos') {
                if (wrap) wrap.style.display = 'block';
                if (sel) {
                    if (!sel.value) sel.value = '__all__';
                    equipoFiltroSeleccionado = sel.value || '__all__';
                } else {
                    equipoFiltroSeleccionado = '__all__';
            jugadores = [];
            equipoJugadoresId = null;
            jugadorModalId = null;
            jugadorModalNombreOriginal = null;
            const selJug = document.getElementById('jugadorEquipoSelect');
            if (selJug) selJug.value = '';

                }
            } else {
                if (wrap) wrap.style.display = 'none';
            }

            document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));
            const btnFiltro = document.getElementById(`filtro${filtro.charAt(0).toUpperCase() + filtro.slice(1)}`);
            if (btnFiltro) btnFiltro.classList.add('active');

            actualizarListaEnfrentamientos();
            actualizarTimelineMini();
        }

        function onFiltroEquipoChange(nombreEquipo) {
            equipoFiltroSeleccionado = nombreEquipo || '__all__';
            // Al cambiar el equipo, forzamos la vista "Todos" (que es donde aplica el filtro)
            filtrarPartidos('todos');
        }

		function actualizarTimelineMini() {
                const div = document.getElementById('timelineMini');
                if (!div) return;

                const ahora = new Date();

                const base = [...(enfrentamientosProgramados || [])].filter(e => e && e.fechaHora);

                // ✅ Solo pendientes: próximos primero (fecha asc), luego atrasados
                const prox = base
                    .filter(e => !e.resultado && e.fechaHora >= ahora)
                    .sort((a, b) => a.fechaHora - b.fechaHora);

                const atras = base
                    .filter(e => !e.resultado && e.fechaHora < ahora)
                    .sort((a, b) => a.fechaHora - b.fechaHora);

                const lista = [...prox, ...atras].slice(0, 8);

                if (lista.length === 0) {
                    div.innerHTML = '<div class="tl-empty">No hay partidos pendientes</div>';
                    return;
                }

                div.innerHTML = lista.map(e => {
                    const fechaObj = new Date(e.fechaHora);
                    const fechaTxt = fechaObj.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
                    const horaTxt = fechaObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                    const tipo = (e.tipoPartido ?? e.tipo_partido ?? 'OFICIAL');
                    const amistosoTag = (tipo === 'AMISTOSO') ? '<span class="tl-tag tl-tag-amistoso">AMISTOSO</span>' : '';

                    return `
                      <div class="tl-item">
                        <div class="tl-dot"></div>
                        <div class="tl-time">${horaTxt}</div>
                        <div class="tl-match">
                          ${escapeHtml(e.local)} <span style="opacity:.6; font-size:.85em; margin:0 6px;">VS</span> ${escapeHtml(e.visitante)}
                          <span class="tl-badge">PENDIENTE</span> ${amistosoTag}
                        </div>
                        <div class="tl-meta">
                          📅 ${fechaTxt} ·
                        </div>
                      </div>
                    `;
                }).join('');
            }






        function actualizarListaEnfrentamientos() {
            const div = document.getElementById('listaEnfrentamientos');
            if (!div) return;

            if (enfrentamientosProgramados.length === 0) {
                div.innerHTML = '<div class="empty-state">No hay partidos programados</div>';
                return;
            }

            let partidosFiltrados = enfrentamientosProgramados;

            if (filtroActual === 'pendientes') {
                partidosFiltrados = enfrentamientosProgramados.filter(e => !e.resultado);
            } else if (filtroActual === 'jugados') {
                partidosFiltrados = enfrentamientosProgramados.filter(e => !!e.resultado);
            } else if (filtroActual === 'todos') {
                // En "Todos" se puede filtrar por un equipo específico (o ver todos)
                if (equipoFiltroSeleccionado && equipoFiltroSeleccionado !== '__all__') {
                const sel = String(equipoFiltroSeleccionado);

                // Detecta si lo seleccionado parece UUID
                const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                const selIsUuid = uuidRx.test(sel);

                // Si es UUID, intentamos obtener el nombre desde el mapa (para fallback)
                const selNombre = selIsUuid ? (equiposById?.get(sel) ?? null) : sel;

                partidosFiltrados = enfrentamientosProgramados.filter(e => {
                    if (!e) return false;

                    // ✅ Nueva forma (IDs)
                    if (selIsUuid && (e.localId || e.visitanteId)) {
                        return String(e.localId) === sel || String(e.visitanteId) === sel;
                    }

                    // ✅ Fallback por nombre (para compatibilidad)
                    if (selNombre) {
                        return e.local === selNombre || e.visitante === selNombre;
                    }

                    return false;
                });
            }
           }

            if (partidosFiltrados.length === 0) {
                if (filtroActual === 'todos' && equipoFiltroSeleccionado && equipoFiltroSeleccionado !== '__all__') {
                    div.innerHTML = '<div class="empty-state">No hay partidos registrados para ese equipo.</div>';
                } else {
                    div.innerHTML = '<div class="empty-state">No hay partidos en esta categoría</div>';
                }
                return;
            }

            const ordenados = [...partidosFiltrados].sort((a, b) => a.fechaHora - b.fechaHora);

            div.innerHTML = ordenados.map((e) => {
                const index = enfrentamientosProgramados.indexOf(e);
                const fechaObj = new Date(e.fechaHora);
                const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const fechaFormato = fechaObj.toLocaleDateString('es-ES', opciones);
                const horaFormato = fechaObj.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    });


                const mapsUrl = `https://maps.google.com/?q=${e.ubicacion.lat},${e.ubicacion.lng}`;

                const notasHtml = e.notas ? `
                    <div class="enfrentamiento-notas">
                        <strong>📝 Notas:</strong>
                        ${e.notas}
                    </div>
                ` : '';

                const tieneResultado = !!e.resultado;
                const cardClass = tieneResultado ? 'enfrentamiento-card partido-jugado' : 'enfrentamiento-card';

                let contenidoPrincipal = '';
                if (tieneResultado) {
                    contenidoPrincipal = `
                        <div class="enfrentamiento-equipos">
                            ${e.local} <span style="color: #95a5a6; font-size: 0.7em; margin: 0 10px;">VS</span> ${e.visitante}
                        </div>
                        <div class="resultado-final">
                            ${e.resultado.golesLocal} - ${e.resultado.golesVisitante}
                        </div>
                        <div class="enfrentamiento-hora">
                            📅 ${fechaFormato} | ⏰ ${horaFormato}
                        </div>
                    `;
                } else {
                    contenidoPrincipal = `
                        <div class="enfrentamiento-equipos">
                            ${e.local} <span style="color: #95a5a6; font-size: 0.7em; margin: 0 10px;">VS</span> ${e.visitante}
                        </div>
                        <div class="enfrentamiento-hora">⏰ ${horaFormato}</div>
                    `;
                }

                const esLiguilla = String(e.fase ?? '').toUpperCase() === 'LIGUILLA';

                const botonesAccion = tieneResultado ? `
                    <button class="btn-editar-enfrentamiento" data-action="enf-editar" data-index="${index}">Editar Resultado</button>
                ` : (esLiguilla ? `
                    <button class="btn-editar-enfrentamiento" data-action="enf-editar" data-index="${index}">Editar</button>
                    <span class="hint-text" style="margin-left:8px; font-size:12px; color:#7f8c8d;">(Liguilla: no se puede borrar)</span>
                ` : `
                    <button class="btn-editar-enfrentamiento" data-action="enf-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar-enfrentamiento" data-action="enf-eliminar" data-index="${index}">Eliminar</button>
                `);

                const estadoBadge = tieneResultado ? '<span class="resultado-badge">JUGADO</span>' : '';
                const tipo = (e.tipoPartido ?? e.tipo_partido ?? 'OFICIAL');
                const tipoBadge = (tipo === 'AMISTOSO') ? '<span class="amistoso-badge">AMISTOSO</span>' : '';

                return `
                    <div class="${cardClass}">
                        <div class="enfrentamiento-header">
                            <div class="enfrentamiento-fecha">${fechaFormato}${estadoBadge}${tipoBadge}</div>
                            <div>${botonesAccion}</div>
                        </div>
                        ${contenidoPrincipal}
                        <div style="text-align: center; margin-top: 10px;">
                            <a href="${mapsUrl}" target="_blank" class="ubicacion-link" style="font-size: 0.9em;">📍 Ver ubicación en mapa</a>
                        </div>
                        ${notasHtml}
                    </div>
                `;
            }).join('');
        }

        function actualizarVistas() {
            actualizarTabla();
            actualizarListaEquipos();
            actualizarSelects();
            actualizarSelectJugadores();
            actualizarUIJugadores();
            poblarSelectHoraPartido();
            setFechaPartidoDefault();
            setHoraDefaultEnSelect('horaPartido');
            poblarSelectHoraLiguilla();
            setFechaLiguillaDefault();
            setHoraDefaultEnSelect('liguillaHora');
        }
        function actualizarTabla() {
            const tbodyDesktop = document.getElementById('tablaBody');
            const tbodyFixed = document.getElementById('tablaBodyFixed');
            const tbodyScroll = document.getElementById('tablaBodyScroll');

            if (!tbodyDesktop && !tbodyFixed && !tbodyScroll) return;

            const setEmpty = (msg) => {
                const safeMsg = msg || 'No hay equipos registrados';
                if (tbodyDesktop) tbodyDesktop.innerHTML = `<tr><td colspan="10" class="empty-state">${safeMsg}</td></tr>`;
                if (tbodyFixed) tbodyFixed.innerHTML = `<tr><td colspan="2" class="empty-state">${safeMsg}</td></tr>`;
                if (tbodyScroll) tbodyScroll.innerHTML = `<tr><td colspan="8" class="empty-state">${safeMsg}</td></tr>`;
            };

            if (!equipos || equipos.length === 0) {
                setEmpty('No hay equipos registrados');
                return;
            }

            // Fuente de verdad: posiciones (calculadas por triggers a partir de eventos)
            if (!posiciones || posiciones.length === 0) {
                setEmpty('Aún no hay posiciones calculadas. Finaliza partidos para que cuenten en la tabla.');
                return;
            }

            const ordenados = [...posiciones];

            // 1) Tabla normal (desktop)
            if (tbodyDesktop) {
                tbodyDesktop.innerHTML = ordenados.map((p, i) => {
                    const eqId = p.equipo_id ? String(p.equipo_id) : '';
                    // Si viene desde la VIEW, ya incluye el nombre del equipo.
                    const nombre = (p.equipo_nombre ?? '').trim() || equiposById.get(eqId) || '—';
                    const rankClass = (i < 4) ? 'rank-top' : (i < 8) ? 'rank-mid' : 'rank-rest';
                    return `
                        <tr class="${rankClass}">
                            <td class="position">${i + 1}</td>
                            <td><button type="button" class="team-link" data-action="historial-abrir" data-team="${encodeURIComponent(nombre)}">${escapeHtml(nombre)}</button></td>
                            <td>${p.pj ?? 0}</td>
                            <td>${p.pg ?? 0}</td>
                            <td>${p.pe ?? 0}</td>
                            <td>${p.pp ?? 0}</td>
                            <td>${p.gf ?? 0}</td>
                            <td>${p.gc ?? 0}</td>
                            <td>${p.dif ?? ((p.gf ?? 0) - (p.gc ?? 0))}</td>
                            <td><strong>${p.pts ?? 0}</strong></td>
                        </tr>
                    `;
                }).join('');
            }

            // 2) Tabla split (móvil): Pos + Equipo fijo + scroll PJ→PTS
            if (tbodyFixed || tbodyScroll) {
                const fixedRows = ordenados.map((p, i) => {
                    const eqId = p.equipo_id ? String(p.equipo_id) : '';
                    const nombre = (p.equipo_nombre ?? '').trim() || equiposById.get(eqId) || '—';
                    const rankClass = (i < 4) ? 'rank-top' : (i < 8) ? 'rank-mid' : 'rank-rest';
                    return `
                        <tr class="${rankClass}">
                            <td class="position">${i + 1}</td>
                            <td><button type="button" class="team-link" data-action="historial-abrir" data-team="${encodeURIComponent(nombre)}">${escapeHtml(nombre)}</button></td>
                        </tr>
                    `;
                }).join('');

                const scrollRows = ordenados.map((p, i) => {
                    const rankClass = (i < 4) ? 'rank-top' : (i < 8) ? 'rank-mid' : 'rank-rest';
                    return `
                        <tr class="${rankClass}">
                            <td>${p.pj ?? 0}</td>
                            <td>${p.pg ?? 0}</td>
                            <td>${p.pe ?? 0}</td>
                            <td>${p.pp ?? 0}</td>
                            <td>${p.gf ?? 0}</td>
                            <td>${p.gc ?? 0}</td>
                            <td>${p.dif ?? ((p.gf ?? 0) - (p.gc ?? 0))}</td>
                            <td><strong>${p.pts ?? 0}</strong></td>
                        </tr>
                    `;
                }).join('');

                if (tbodyFixed) tbodyFixed.innerHTML = fixedRows;
                if (tbodyScroll) tbodyScroll.innerHTML = scrollRows;

                // Sincroniza alturas para que las filas “casen” perfecto
                requestAnimationFrame(() => {
                    syncTablaSplitHeights();
                });

                if (!window.__tablaSplitBound) {
                    window.__tablaSplitBound = true;
                    window.addEventListener('resize', debounce(() => syncTablaSplitHeights(), 80));
                }
            }
        }

        // Sincroniza alturas entre tablas split (móvil)
        function syncTablaSplitHeights() {
            const leftBody = document.getElementById('tablaBodyFixed');
            const rightBody = document.getElementById('tablaBodyScroll');
            if (!leftBody || !rightBody) return;

            const leftRows = Array.from(leftBody.querySelectorAll('tr'));
            const rightRows = Array.from(rightBody.querySelectorAll('tr'));
            if (!leftRows.length || leftRows.length !== rightRows.length) return;

            // Reset
            leftRows.forEach(r => (r.style.height = ''));
            rightRows.forEach(r => (r.style.height = ''));

            for (let i = 0; i < leftRows.length; i++) {
                const lh = leftRows[i].getBoundingClientRect().height;
                const rh = rightRows[i].getBoundingClientRect().height;
                const h = Math.max(lh, rh);
                leftRows[i].style.height = `${h}px`;
                rightRows[i].style.height = `${h}px`;
            }

            // Headers
            const leftHead = document.querySelector('.tabla-split .split-left thead tr');
            const rightHead = document.querySelector('.tabla-split .split-right thead tr');
            if (leftHead && rightHead) {
                leftHead.style.height = '';
                rightHead.style.height = '';
                const hh = Math.max(leftHead.getBoundingClientRect().height, rightHead.getBoundingClientRect().height);
                leftHead.style.height = `${hh}px`;
                rightHead.style.height = `${hh}px`;
            }
        }

        function debounce(fn, wait) {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(null, args), wait);
            };
        }


        // ==========================================
        // HISTORIAL DE EQUIPO (MODAL)
        // ==========================================

        function cerrarModalHistorialEquipo() {
            const modal = document.getElementById('modalHistorialEquipo');
            if (modal) modal.classList.remove('show');
        }

        function abrirHistorialEquipo(nombreEquipoEncoded) {
            const nombreEquipo = decodeURIComponent(nombreEquipoEncoded || '');
            if (!nombreEquipo) return;

            const modal = document.getElementById('modalHistorialEquipo');
            const titulo = document.getElementById('tituloHistorialEquipo');
            const resumen = document.getElementById('historialResumen');
            const lista = document.getElementById('historialLista');
            const pendientesWrap = document.getElementById('historialPendientesWrap');
            const pendientesDiv = document.getElementById('historialPendientes');

            if (titulo) titulo.textContent = `Historial de ${nombreEquipo}`;

            const partidosEquipo = (enfrentamientosProgramados || [])
                .filter(p => p && (p.local === nombreEquipo || p.visitante === nombreEquipo));

            // Para resumen (últimos 5 y stats) usamos sólo jugados (más reciente primero)
            const jugados = partidosEquipo
                .filter(p => !!p.resultado)
                .sort((a, b) => a.fechaHora - b.fechaHora);

            // Para el listado, mostramos TODOS los partidos ordenados por fecha (más antiguo → más reciente)
            const todosOrdenados = [...partidosEquipo]
                .sort((a, b) => b.fechaHora - a.fechaHora);

            // Resumen: usa datos oficiales de "posiciones" (si existen); si no, calcula con los jugados
            const eq = (equipos || []).find(e => e && e.nombre === nombreEquipo);
            const pos = eq ? (posicionesByEquipoId.get(String(eq.id)) ?? null) : null;
            const stats = pos ? {
                pj: pos.pj, pg: pos.pg, pe: pos.pe, pp: pos.pp, gf: pos.gf, gc: pos.gc, pts: pos.pts
            } : calcularStatsDesdePartidos(nombreEquipo, jugados);

            if (resumen) {
                const dif = (Number(stats.gf) || 0) - (Number(stats.gc) || 0);
                const ult5 = calcularUltimos5(nombreEquipo, jugados);
                resumen.innerHTML = `
                    <span class="history-chip">PJ ${Number(stats.pj) || 0}</span>
                    <span class="history-chip">PG ${Number(stats.pg) || 0}</span>
                    <span class="history-chip">PE ${Number(stats.pe) || 0}</span>
                    <span class="history-chip">PP ${Number(stats.pp) || 0}</span>
                    <span class="history-chip">GF ${Number(stats.gf) || 0}</span>
                    <span class="history-chip">GC ${Number(stats.gc) || 0}</span>
                    <span class="history-chip">DIF ${dif}</span>
                    <span class="history-chip">PTS ${Number(stats.pts) || 0}</span>
                    <span class=\"history-chip\" title=\"Últimos 5 (más reciente → más antiguo)\">Últ.5 ${ult5}</span>
                `;
            }

            if (lista) {
                if (todosOrdenados.length === 0) {
                    lista.innerHTML = '<div class="empty-state">Este equipo aún no tiene partidos registrados.</div>';
                } else {
                    lista.innerHTML = todosOrdenados
                        .map(p => renderHistorialItem(nombreEquipo, p, !!p.resultado))
                        .join('');
                }
            }

            // Ocultamos la sección "Pendientes" (ahora mostramos todo en un solo listado)
            if (pendientesWrap && pendientesDiv) {
                pendientesWrap.style.display = 'none';
                pendientesDiv.innerHTML = '';
            }
            if (modal) modal.classList.add('show');
        }

        function calcularStatsDesdePartidos(nombreEquipo, jugados) {
            let pj = 0, pg = 0, pe = 0, pp = 0, gf = 0, gc = 0;

            (jugados || []).forEach(p => {
                if (!p || !p.resultado) return;
                pj++;

                const esLocal = p.local === nombreEquipo;
                const gF = Number(esLocal ? p.resultado.golesLocal : p.resultado.golesVisitante) || 0;
                const gC = Number(esLocal ? p.resultado.golesVisitante : p.resultado.golesLocal) || 0;

                gf += gF;
                gc += gC;

                if (gF > gC) pg++;
                else if (gF === gC) pe++;
                else pp++;
            });

            const pts = pg * 3 + pe;
            return { pj, pg, pe, pp, gf, gc, pts };
        }

        function calcularUltimos5(nombreEquipo, jugadosOrdenados) {
            const arr = (jugadosOrdenados || [])
                .slice(0, 5) // ya viene ordenado (más reciente primero)
                .map(p => {
                    if (!p || !p.resultado) return '';
                    const esLocal = p.local === nombreEquipo;
                    const gl = Number(p.resultado.golesLocal) || 0;
                    const gv = Number(p.resultado.golesVisitante) || 0;
                    const gF = esLocal ? gl : gv;
                    const gC = esLocal ? gv : gl;

                    if (gF > gC) return '✅';
                    if (gF === gC) return '➖';
                    return '❌';
                })
                .filter(Boolean);

            return arr.length ? arr.join('') : '—';
        }


        function renderHistorialItem(nombreEquipo, p, esJugado) {
            const fechaObj = p && p.fechaHora ? new Date(p.fechaHora) : null;
            const fechaFmt = fechaObj
                ? fechaObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
                : '';
            const horaFmt = p && p.hora ? p.hora : '';
            const esLocal = p && p.local === nombreEquipo;

            let badge = '';
            let scoreline = '';
            let meta = '';

            if (esJugado && p && p.resultado) {
                const gl = Number(p.resultado.golesLocal) || 0;
                const gv = Number(p.resultado.golesVisitante) || 0;

                const gF = esLocal ? gl : gv;
                const gC = esLocal ? gv : gl;

                const estado = gF > gC ? 'Victoria' : (gF === gC ? 'Empate' : 'Derrota');
                badge = gF > gC ? `🟢 ${estado}` : (gF === gC ? `🟡 ${estado}` : `🔴 ${estado}`);

                const localHtml = p.local === nombreEquipo ? `<strong>${escapeHtml(p.local)}</strong>` : escapeHtml(p.local);
                const visHtml = p.visitante === nombreEquipo ? `<strong>${escapeHtml(p.visitante)}</strong>` : escapeHtml(p.visitante);

                scoreline = `${localHtml} <span style="white-space:nowrap;">${gl} - ${gv}</span> ${visHtml}`;
                meta = `${esLocal ? '🏠 Local' : '🚌 Visita'} · ⏰ ${escapeHtml(horaFmt)}`;
            } else {
                const localHtml = p.local === nombreEquipo ? `<strong>${escapeHtml(p.local)}</strong>` : escapeHtml(p.local);
                const visHtml = p.visitante === nombreEquipo ? `<strong>${escapeHtml(p.visitante)}</strong>` : escapeHtml(p.visitante);

                scoreline = `${localHtml} <span style="color:#95a5a6; font-weight:800; white-space:nowrap;">VS</span> ${visHtml}`;
                badge = '⏳ Pendiente';
                meta = `⏰ ${escapeHtml(horaFmt)}`;
            }

            return `
                <div class="history-item">
                    <div class="top">
                        <div class="date">📅 ${escapeHtml(fechaFmt)}</div>
                        <div class="badge">${escapeHtml(badge)}</div>
                    </div>
                    <div class="scoreline">${scoreline}</div>
                    <div class="meta">${meta}</div>
                </div>
            `;
        }


        function actualizarListaEquipos() {
                const div = document.getElementById('listaEquipos');
                if (!div) return;

                if (equipos.length === 0) {
                    div.innerHTML = '<div class="empty-state">No hay equipos registrados</div>';
                    return;
                }

                div.innerHTML = equipos.map(eq => `
                    <div class="match-item team-item">
                        <span style="font-weight: 500;">
                            ${escapeHtml(eq.nombre)}
                            ${eq.activo === false
                                ? '<span style="margin-left:8px; font-size:.85em; opacity:.7;">(Desactivado)</span>'
                                : ''
                            }
                        </span>
                        <div class="team-actions" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
                            <button class="btn-secondary btn-team-admin" data-action="equipo-admin-open"
                                    data-id="${escapeHtml(eq.id)}"
                                    data-nombre="${escapeHtml(eq.nombre)}">Editar</button>
                            <button class="btn-secondary btn-team-admin" data-action="equipo-ajuste-open"
                                    data-id="${escapeHtml(eq.id)}"
                                    data-nombre="${escapeHtml(eq.nombre)}"
                                    title="Ajuste administrativo (jornadas pagadas)">Ajustar PJ</button>
                        </div>
                    </div>
                `).join('');
            }


     function actualizarSelects() {
                const ids = ['enfrentamientoLocal', 'enfrentamientoVisitante'];

                // Solo equipos activos para programar partidos
                const equiposActivos = (equipos || []).filter(eq => eq && eq.activo !== false);

                ids.forEach(id => {
                    const select = document.getElementById(id);
                    if (!select) return;

                    const valorActual = select.value || '';

                    select.innerHTML =
                        '<option value="">Seleccionar</option>' +
                        equiposActivos.map(eq => `<option value="${eq.id}">${escapeHtml(eq.nombre)}</option>`).join('');

                    //  Mantener selección solo si sigue existiendo y está activo
                    const existe = equiposActivos.some(eq => String(eq.id) === String(valorActual));
                    select.value = existe ? valorActual : '';
                });

                // Filtro por equipo (solo aplica en "Todos")
                const filtroSel = document.getElementById('filtroEquipoSelect');
                if (filtroSel) {
                    const actual = filtroSel.value || '__all__';

                    //  Aquí puedes incluir activos + desactivados para ver historial
                    filtroSel.innerHTML =
                        '<option value="__all__">Todos los equipos</option>' +
                        equipos.map(eq => `<option value="${eq.id}">${escapeHtml(eq.nombre)}</option>`).join('');

                    //  Mantener selección si todavía existe (o volver a "Todos")
                    const existe = (equipos || []).some(eq => eq && String(eq.id) === String(actual));
                    filtroSel.value = (actual === '__all__' || existe) ? actual : '__all__';

                    // Sincronizar estado si ya estás viendo "Todos"
                    if (filtroActual === 'todos') {
                        equipoFiltroSeleccionado = filtroSel.value || '__all__';
                    }
                }
            }

        

        // ==========================================
        // FUNCIONES DE JUGADORES
        // ==========================================

        function isMissingColumn(err, col) {
            const msg = String(err?.message ?? '').toLowerCase();
            if (!col) return false;
            return (err?.code === '42703') ||
                msg.includes(`column "${col}" does not exist`) ||
                msg.includes(`column '${col}' does not exist`) ||
                msg.includes(`could not find the '${col}' column`) ||
                msg.includes(`unknown column`) && msg.includes(col);
        }

        function isMissingTable(err, table) {
            const msg = String(err?.message ?? '').toLowerCase();
            if (!table) return false;
            return (err?.code === '42P01') || (msg.includes('does not exist') && msg.includes(table));
        }

        function actualizarSelectJugadores() {
            const sel = document.getElementById('jugadorEquipoSelect');
            if (!sel) return;

            const actual = sel.value || '';
            const base = '<option value="">Seleccionar equipo…</option>';

            // Permitimos ver equipos desactivados (pero los marcamos)
            const opts = (equipos || []).map(eq => {
                const des = (eq && eq.activo === false);
                const label = `${escapeHtml(eq.nombre)}${des ? ' (Desactivado)' : ''}`;
                // Nota: si está desactivado, lo dejamos seleccionable para consultar plantilla, pero no para alta.
                return `<option value="${escapeHtml(eq.id)}">${label}</option>`;
            }).join('');

            sel.innerHTML = base + opts;

            const existe = (equipos || []).some(eq => eq && String(eq.id) === String(actual));
            sel.value = existe ? actual : '';

            actualizarAccionesEquipoJugadores();
        }

        function actualizarAccionesEquipoJugadores() {
            const btnNew = document.getElementById('btnEquipoNuevoQuick');
            const btnAdmin = document.getElementById('btnEquipoAdminQuick');
            const btnAjuste = document.getElementById('btnEquipoAjusteQuick');

            if (btnNew) btnNew.disabled = !torneoActualId;

            const hasEquipo = !!equipoJugadoresId;
            const eq = (equipos || []).find(x => String(x.id) === String(equipoJugadoresId));
            const des = !!(eq && eq.activo === false);

            if (btnAdmin) {
                btnAdmin.disabled = !(torneoActualId && hasEquipo);
                btnAdmin.textContent = des ? '⚙️ Administrar (inactivo)' : '⚙️ Administrar';
            }

            if (btnAjuste) {
                btnAjuste.disabled = !(torneoActualId && hasEquipo);
                btnAjuste.textContent = des ? '🧾 Ajustar PJ (inactivo)' : '🧾 Ajustar PJ';
                btnAjuste.dataset.id = (torneoActualId && hasEquipo && eq) ? String(eq.id) : '';
                btnAjuste.dataset.nombre = (torneoActualId && hasEquipo && eq) ? String(eq.nombre || '') : '';
            }
        }

        function actualizarUIJugadores() {
            const hint = document.getElementById('jugadoresHintEquipo');
            const form = document.getElementById('formJugador');
            const lista = document.getElementById('listaJugadores');

            if (!form || !hint || !lista) return;

            if (!torneoActualId) {
                form.style.display = 'none';
                hint.style.display = 'block';
                hint.textContent = 'Selecciona un torneo para administrar jugadores.';
                lista.innerHTML = '';
                return;
            }

            if (!equipoJugadoresId) {
                form.style.display = 'none';
                hint.style.display = 'block';
                hint.textContent = 'Selecciona un equipo para registrar y administrar su plantilla.';
                lista.innerHTML = '';
                return;
            }

            // Si el equipo está desactivado, permitimos ver/editar, pero no alta
            const eq = (equipos || []).find(x => String(x.id) === String(equipoJugadoresId));
            const des = eq && eq.activo === false;

            form.style.display = 'block';
            hint.style.display = 'none';

            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.disabled = !!des;

            if (des) {
                // mostrar aviso arriba de la lista
                lista.innerHTML = `
                    <div class="empty-state">
                        Este equipo está <strong>desactivado</strong>. Puedes consultar y editar jugadores, pero no dar de alta nuevos.
                    </div>
                ` + renderListaJugadores();
            } else {
                lista.innerHTML = renderListaJugadores();
            }
        }

        function renderListaJugadores() {
            const eq = (equipos || []).find(x => String(x.id) === String(equipoJugadoresId));
            const nombreEq = eq ? eq.nombre : 'Equipo';
            const lista = (jugadores || []);

            if (!lista.length) {
                return `<div class="empty-state">No hay jugadores registrados en <strong>${escapeHtml(nombreEq)}</strong>.</div>`;
            }

            return lista.map(j => {
                const dorsal = (j.dorsal ?? j.numero ?? null);
                const dorsalHtml = (dorsal !== null && dorsal !== undefined && dorsal !== '')
                    ? `<span style="opacity:.8; font-weight:800; margin-right:8px;">#${escapeHtml(dorsal)}</span>`
                    : `<span style="opacity:.45; font-weight:800; margin-right:8px;">#—</span>`;

                const pos = (j.posicion ?? j.position ?? '').trim();
                const posHtml = pos ? `<div style="font-size:.9em; opacity:.75; margin-top:4px;">${escapeHtml(pos)}</div>` : '';

                return `
                    <div class="match-item">
                        <div>
                            <div style="font-weight: 600;">${dorsalHtml}${escapeHtml(j.nombre ?? j.jugador ?? '')}</div>
                            ${posHtml}
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <button class="btn-secondary" data-action="jugador-admin-open"
                                    data-id="${escapeHtml(j.id)}"
                                    data-nombre="${escapeHtml(j.nombre ?? '')}"
                                    data-dorsal="${escapeHtml(dorsal ?? '')}"
                                    data-posicion="${escapeHtml(j.posicion ?? '')}">
                                Editar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function onEquipoJugadoresChange(equipoId) {
            equipoJugadoresId = equipoId ? String(equipoId) : null;
            jugadores = [];
            if (equipoJugadoresId) {
                await cargarJugadores();
            }
            actualizarAccionesEquipoJugadores();
            actualizarUIJugadores();
        }

        async function cargarJugadores() {
            if (!supabaseConfigured) return;
            if (!torneoActualId || !equipoJugadoresId) return;

            try {
                // 1) Intentamos filtrar por activos (si existe la columna)
                let q = supabaseClient
                    .from('jugadores')
                    .select('*')
                    .eq('torneo_id', torneoActualId)
                    .eq('equipo_id', equipoJugadoresId);

                // Preferimos activos=true si existe
                let res = await q.eq('activo', true).order('nombre', { ascending: true });
                if (res.error) {
                    if (isMissingColumn(res.error, 'activo')) {
                        // 2) Reintento sin activo
                        res = await q.order('nombre', { ascending: true });
                    } else {
                        throw res.error;
                    }
                }

                const data = res.data || [];

                // Orden: dorsal (si existe) y luego nombre
                jugadores = data.sort((a, b) => {
                    const da = (a.dorsal ?? 999);
                    const db = (b.dorsal ?? 999);
                    if (da !== db) return da - db;
                    return String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { sensitivity: 'base' });
                });
            } catch (err) {
                console.error('Error cargando jugadores:', err);
                if (isMissingTable(err, 'jugadores')) {
                    alert('No se encontró la tabla "jugadores" en Supabase.');
                } else {
                    showError('Error al cargar jugadores');
                }
                jugadores = [];
            }
        }

        async function agregarJugador(e) {
            e.preventDefault();

            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            if (!equipoJugadoresId) {
                alert('Selecciona un equipo primero');
                return;
            }

            const eq = (equipos || []).find(x => String(x.id) === String(equipoJugadoresId));
            if (eq && eq.activo === false) {
                alert('Este equipo está desactivado. No puedes dar de alta jugadores aquí.');
                return;
            }

            const nombreInput = document.getElementById('nombreJugador');
            const dorsalInput = document.getElementById('dorsalJugador');
            const posInput = document.getElementById('posicionJugador');

            const nombre = String(nombreInput?.value ?? '').trim();
            const dorsalRaw = String(dorsalInput?.value ?? '').trim();
            const posicion = String(posInput?.value ?? '').trim();

            if (!nombre) {
                alert('Escribe el nombre del jugador');
                return;
            }

            const dorsal = dorsalRaw === '' ? null : (Number.isFinite(Number(dorsalRaw)) ? parseInt(dorsalRaw, 10) : null);

            showLoading();
            try {
                const payload = {
                    torneo_id: torneoActualId,
                    equipo_id: equipoJugadoresId,
                    nombre,
                    dorsal,
                    posicion: posicion || null,
                    activo: true
                };

                // Si la tabla no tiene "activo", Supabase dirá que la columna no existe.
                let { data, error } = await supabaseClient
                    .from('jugadores')
                    .insert([payload])
                    .select()
                    .single();

                if (error) {
                    if (isMissingColumn(error, 'activo')) {
                        delete payload.activo;
                        const res2 = await supabaseClient
                            .from('jugadores')
                            .insert([payload])
                            .select()
                            .single();
                        data = res2.data;
                        error = res2.error;
                    }
                }

                if (error) {
                    if (error.code === '23505') {
                        alert('Ya existe un jugador con ese nombre en este equipo');
                    } else {
                        throw error;
                    }
                    return;
                }

                // Actualizar cache de jugadores para el modal de eventos (para que aparezca sin recargar)
                upsertJugadorEnEventosCache(data);

                // Recargar para asegurar orden y consistencia
                const form = document.getElementById('formJugador');
                if (form) form.reset();

                await cargarJugadores();
                actualizarUIJugadores();
            } catch (err) {
                console.error('Error agregando jugador:', err);
                showError('Error al agregar jugador');
            } finally {
                hideLoading();
            }
        }

        // ===== Modal: Administrar jugador (editar / desactivar) =====
        function abrirModalJugadorAdmin(jugadorId, nombreActual, dorsalActual, posicionActual) {
            jugadorModalId = jugadorId ? String(jugadorId) : null;
            jugadorModalNombreOriginal = String(nombreActual ?? '').trim();

            const modal = document.getElementById('modalJugadorAdmin');
            const inputNombre = document.getElementById('jugadorNombreAdmin');
            const inputDorsal = document.getElementById('jugadorDorsalAdmin');
            const inputPos = document.getElementById('jugadorPosicionAdmin');
            const confirmBox = document.getElementById('jugadorAdminConfirmDelete');

            if (confirmBox) confirmBox.style.display = 'none';

            if (inputNombre) inputNombre.value = jugadorModalNombreOriginal;
            if (inputDorsal) inputDorsal.value = String(dorsalActual ?? '');
            if (inputPos) inputPos.value = String(posicionActual ?? '');

            if (modal) modal.classList.add('show');
        }

        function cerrarModalJugadorAdmin() {
            const modal = document.getElementById('modalJugadorAdmin');
            const confirmBox = document.getElementById('jugadorAdminConfirmDelete');
            if (confirmBox) confirmBox.style.display = 'none';
            if (modal) modal.classList.remove('show');

            jugadorModalId = null;
            jugadorModalNombreOriginal = null;
        }

        function mostrarConfirmEliminarJugadorAdmin() {
            const confirmBox = document.getElementById('jugadorAdminConfirmDelete');
            if (confirmBox) confirmBox.style.display = 'block';
        }

        function cancelarEliminarJugadorAdmin() {
            const confirmBox = document.getElementById('jugadorAdminConfirmDelete');
            if (confirmBox) confirmBox.style.display = 'none';
        }

        async function confirmarEliminarJugadorAdmin() {
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            if (!equipoJugadoresId) {
                showError('Selecciona un equipo primero');
                return;
            }
            if (!jugadorModalId) {
                showError('No se encontró el ID del jugador');
                return;
            }

            showLoading();
            try {
                // Preferimos desactivar si existe la columna
                let wasDeleteJugadorAdmin = false;
                let res = await supabaseClient
                    .from('jugadores')
                    .update({ activo: false })
                    .eq('torneo_id', torneoActualId)
                    .eq('equipo_id', equipoJugadoresId)
                    .eq('id', jugadorModalId);

                if (res.error && isMissingColumn(res.error, 'activo')) {
                    // Fallback: borrar
                    wasDeleteJugadorAdmin = true;
                    res = await supabaseClient
                        .from('jugadores')
                        .delete()
                        .eq('torneo_id', torneoActualId)
                        .eq('equipo_id', equipoJugadoresId)
                        .eq('id', jugadorModalId);
                }

                if (res.error) throw res.error;

                // Actualizar cache de jugadores para el modal de eventos
                if (wasDeleteJugadorAdmin) {
                    removeJugadorEnEventosCache(jugadorModalId, equipoJugadoresId);
                } else {
                    patchJugadorEnEventosCache(jugadorModalId, equipoJugadoresId, { activo: false });
                }

                // Actualizar cache de jugadores para el modal de eventos
                patchJugadorEnEventosCache(jugadorModalId, equipoJugadoresId, { nombre: nombreNuevo, dorsal, posicion: posicion || null });

                cerrarModalJugadorAdmin();
                await cargarJugadores();
                actualizarUIJugadores();
            } catch (err) {
                console.error('Error desactivando jugador:', err);
                showError('Error al desactivar jugador');
            } finally {
                hideLoading();
            }
        }

        async function guardarCambiosJugadorAdmin() {
            if (!supabaseConfigured) {
                showError('Por favor configura Supabase primero');
                return;
            }
            if (!torneoActualId) {
                showError('Selecciona un torneo primero');
                return;
            }
            if (!equipoJugadoresId) {
                showError('Selecciona un equipo primero');
                return;
            }
            if (!jugadorModalId) {
                showError('No se encontró el ID del jugador');
                return;
            }

            const inputNombre = document.getElementById('jugadorNombreAdmin');
            const inputDorsal = document.getElementById('jugadorDorsalAdmin');
            const inputPos = document.getElementById('jugadorPosicionAdmin');

            const nombreNuevo = String(inputNombre?.value ?? '').trim();
            const dorsalRaw = String(inputDorsal?.value ?? '').trim();
            const posicion = String(inputPos?.value ?? '').trim();

            if (!nombreNuevo) {
                alert('El nombre no puede ir vacío');
                if (inputNombre) inputNombre.focus();
                return;
            }

            const dorsal = dorsalRaw === '' ? null : (Number.isFinite(Number(dorsalRaw)) ? parseInt(dorsalRaw, 10) : null);

            showLoading();
            try {
                const { error } = await supabaseClient
                    .from('jugadores')
                    .update({ nombre: nombreNuevo, dorsal, posicion: posicion || null })
                    .eq('torneo_id', torneoActualId)
                    .eq('equipo_id', equipoJugadoresId)
                    .eq('id', jugadorModalId);

                if (error) {
                    if (error.code === '23505') {
                        alert('Ya existe un jugador con ese nombre en este equipo');
                        return;
                    }
                    throw error;
                }

                cerrarModalJugadorAdmin();
                await cargarJugadores();
                actualizarUIJugadores();
            } catch (err) {
                console.error('Error guardando jugador:', err);
                showError('Error al editar jugador');
            } finally {
                hideLoading();
            }
        }

// ==========================================
        // INICIALIZACIÓN
        // ==========================================
        

// ==========================================
// INICIALIZACIÓN (entrypoint)
// ==========================================
export async function initApp() {
    // 1) Cargar config versionada y preparar Supabase
    await initConfigAndSupabase();

    // 1.5) Intentar cargar publicidad desde BD (si está habilitado)
    await loadAdsFromDb();

    // 2) Mostrar aviso si falta configuración
    const warn = document.getElementById('configWarning');
    if (!supabaseConfigured) {
        if (warn) warn.style.display = 'block';
        return;
    }
    if (warn) warn.style.display = 'none';

    // 3) Inicializar UI (comerciales por placement) y cargar datos
    initPromoBanner();       // placement: patrocinador (hero)
    initBannerBelowAviso();  // placement: banner
    initPromoDelDia();       // placement: promos (spotlight)
    // UI v2 (espectador): ribbon + promos + drawer
    renderAdsDrawerPanels();
    initSponsorRibbon();
    initPromosFeatured();
    updateAdsCountBadge();
    // Paneles laterales: asegurar que al menos se pinten promos y placeholders
    // incluso antes de seleccionar un torneo.
    resetPublicSidePanelsUI();
    await cargarTorneos();

    // UX: validación en vivo para evitar nombres duplicados de equipos
    try {
        __wireEquipoNombreForm();
        __wireEquipoNombreAdminModal();
        __revalidateEquipoNombreInputs();
    } catch {}
}





        // ============================
        // Ajuste administrativo (equipo que entra tarde)
        // ============================
        let equipoAjusteId = null;
        let equipoAjusteNombre = '';

        function abrirModalEquipoAjuste(equipoId, nombre) {
            equipoAjusteId = String(equipoId || '');
            equipoAjusteNombre = String(nombre || '');

            const modal = document.getElementById('modalEquipoAjuste');
            const titulo = document.getElementById('tituloModalEquipoAjuste');
            const nombreEl = document.getElementById('equipoAjusteNombre');
            const inputJ = document.getElementById('equipoAjusteJornadas');
            const inputGF = document.getElementById('equipoAjusteGFPor');
            const inputGC = document.getElementById('equipoAjusteGCPor');
            const hint = document.getElementById('equipoAjusteHint');

            // Sugerir jornadas faltantes (max pj - pj actual)
            const pjActual = posicionesByEquipoId?.get(String(equipoAjusteId))?.pj ?? 0;
            const maxPJ = Math.max(0, ...(posiciones || []).map(p => Number(p.pj || 0)));
            const sugerido = Math.max(0, Number(maxPJ) - Number(pjActual));

            if (titulo) titulo.textContent = 'Regularizar equipo';
            if (nombreEl) nombreEl.textContent = equipoAjusteNombre || 'Equipo';
            if (inputJ) inputJ.value = String(sugerido);
            if (inputGF) inputGF.value = '3';
            if (inputGC) inputGC.value = '0';

            if (hint) {
                hint.innerHTML = `Sugerencia: <b>${sugerido}</b> jornada(s) para empatar a la jornada actual (máx PJ=${escapeHtml(String(maxPJ))}).`;
            }

            if (modal) { modal.classList.add('show'); modal.style.display = ''; }
        }

        function cerrarModalEquipoAjuste() {
            const modal = document.getElementById('modalEquipoAjuste');
            if (modal) { modal.classList.remove('show'); modal.style.display = ''; }
            equipoAjusteId = null;
            equipoAjusteNombre = '';
        }

        async function guardarAjusteEquipoPagado(modo = 'set') {
            if (!supabaseConfigured || !torneoActualId || !equipoAjusteId) return;

            const inputJ = document.getElementById('equipoAjusteJornadas');
            const inputGF = document.getElementById('equipoAjusteGFPor');
            const inputGC = document.getElementById('equipoAjusteGCPor');

            let jornadas = parseInt(String(inputJ?.value ?? '0'), 10);
            if (Number.isNaN(jornadas) || jornadas < 0) jornadas = 0;

            let gfPor = parseInt(String(inputGF?.value ?? '3'), 10);
            if (Number.isNaN(gfPor) || gfPor < 0) gfPor = 3;

            let gcPor = parseInt(String(inputGC?.value ?? '0'), 10);
            if (Number.isNaN(gcPor) || gcPor < 0) gcPor = 0;

            // Si es "quitar", forzamos a 0
            if (modo === 'clear') {
                const ok = confirm('¿Quitar la regularización? Esto elimina los PJ/Puntos agregados por ajuste.');
                if (!ok) return;
                jornadas = 0;
            }

            try {
                showLoading();

                const { error } = await supabaseClient.rpc('aplicar_equipo_pagado', {
                    p_torneo: torneoActualId,
                    p_equipo: equipoAjusteId,
                    p_jornadas: jornadas,
                    p_gf_por: gfPor,
                    p_gc_por: gcPor
                });

                if (error) throw error;

                await cargarPosiciones();
                actualizarVistas();
                cerrarModalEquipoAjuste();
            } catch (e) {
                console.error('Error aplicando ajuste:', e);
                alert('No se pudo aplicar el ajuste. Revisa consola.');
            } finally {
                hideLoading();
            }
        }

// ==========================================
// EXPORTS (usados por events.js)
// ==========================================
export {
    promoPrev,
    promoNext,
    promoGo,
    onTorneoChange,
    showTab,
    filtrarPartidos,
    onFiltroEquipoChange,
    abrirModalTorneo,
    cerrarModalTorneo,
    abrirModalEditarTorneo,
    cerrarModalEditarTorneo,
    confirmarEliminarTorneo,
    agregarEquipo,
    configurarEnfrentamiento,
    guardarAviso,
    guardarEdicion,
    cerrarModal,
    abrirModalEquipoAdmin,
    abrirModalEquipoNuevo,
    abrirModalEquipoSeleccionado,
    cerrarModalEquipoAdmin,
    abrirModalEquipoAjuste,
    cerrarModalEquipoAjuste,
    guardarAjusteEquipoPagado,
    cancelarEliminarEquipoAdmin,
    confirmarEliminarEquipoAdmin,
    mostrarConfirmEliminarEquipoAdmin,
    guardarCambiosEquipoAdmin,
    abrirHistorialEquipo,
    cerrarModalHistorialEquipo,
    crearTorneo,
    editarTorneo,
    abrirModalEditar,
    abrirModalEditarPorPartidoId,
    eliminarEnfrentamiento,
    onEquipoJugadoresChange,
    agregarJugador,
    abrirModalJugadorAdmin,
    cerrarModalJugadorAdmin,
    mostrarConfirmEliminarJugadorAdmin,
    cancelarEliminarJugadorAdmin,
    confirmarEliminarJugadorAdmin,
    guardarCambiosJugadorAdmin
    ,
    // Eventos por partido
    onEventoEquipoChange,
    agregarEventoPartido,
    eliminarEventoPartido,

    // Liguilla
    cargarLiguilla,
    generarLiguillaDesdeUI,
    programarRondaActivaLiguilla,

    // Panel lateral (mobile)
    openMobilePanel,
    closeMobilePanel,
    setMobilePanelTab,
    adsLoadMore,

    // Avisos (admin)
    limpiarAvisoActual,
    activarAvisoPorId,
    copiarAvisoPorId,
    eliminarAvisoPorId,
    refrescarAvisosAdmin,
    onAvisoInputChange,
    cargarAvisosHistorial
};                                                                                    