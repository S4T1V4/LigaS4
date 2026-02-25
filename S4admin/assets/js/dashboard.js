// Dashboard UI (solo lectura)
// - No cambia la lógica ni toca Supabase.
// - Solo lee lo que ya renderiza el core (tabla + calendario) y lo resume en tarjetas.

const $id = (id) => document.getElementById(id);

function toInt(v) {
  const n = parseInt(String(v ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function textOf(el) {
  return (el?.textContent || '').trim();
}

function readStandingsFromDom() {
  const rows = Array.from(document.querySelectorAll('#tablaBody tr'));
  const list = [];

  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length < 10) continue;

    const team = textOf(tds[1]);
    // Ignorar estado vacío
    if (!team || /no hay equipos/i.test(textOf(tr))) continue;

    list.push({
      pos: toInt(textOf(tds[0])),
      team,
      pj: toInt(textOf(tds[2])),
      gf: toInt(textOf(tds[6])),
      pts: toInt(textOf(tds[9])),
    });
  }

  // Si no trae pos, no rompemos.
  list.sort((a, b) => (a.pos || 999) - (b.pos || 999));
  return list;
}

function readNextMatchFromDom() {
  // Preferimos el primer card visible (lo que el usuario está viendo con el filtro actual)
  const card = document.querySelector('#listaEnfrentamientos .enfrentamiento-card');
  if (!card) return null;

  const teams = textOf(card.querySelector('.enfrentamiento-equipos'));
  const fecha = textOf(card.querySelector('.enfrentamiento-fecha'));
  const hora = textOf(card.querySelector('.enfrentamiento-hora'));

  const when = [fecha, hora].filter(Boolean).join(' · ');
  return { teams, when };
}

function readTorneoName() {
  const sel = $id('torneoSelect');
  if (!sel) return '';
  const opt = sel.options?.[sel.selectedIndex];
  const label = (opt?.textContent || '').trim();
  if (!sel.value) return '';
  return label || '';
}

function setDashText(id, value) {
  const el = $id(id);
  if (el) el.textContent = value;
}

let _raf = 0;
function scheduleUpdate() {
  if (_raf) return;
  _raf = requestAnimationFrame(() => {
    _raf = 0;
    updateDashboard();
  });
}

function updateDashboard() {
  const dash = $id('dash');
  if (!dash) return;

  // Mostrar nombre del torneo
  const tn = readTorneoName();
  setDashText('dashTorneoName', tn ? `Torneo: ${tn}` : 'Torneo: —');

  const standings = readStandingsFromDom();
  if (standings.length) {
    const leader = standings[0];
    setDashText('dashLeaderName', leader.team || '—');
    setDashText('dashLeaderPts', String(leader.pts ?? 0));
    setDashText('dashTeams', String(standings.length));

    const goals = standings.reduce((sum, r) => sum + (r.gf || 0), 0);
    setDashText('dashGoals', String(goals));
  } else {
    setDashText('dashLeaderName', '—');
    setDashText('dashLeaderPts', '0');
    setDashText('dashTeams', '0');
    setDashText('dashGoals', '0');
  }

  const next = readNextMatchFromDom();
  if (next?.teams) {
    setDashText('dashNextTeams', next.teams);
    setDashText('dashNextWhen', next.when || '—');
  } else {
    setDashText('dashNextTeams', '—');
    setDashText('dashNextWhen', '—');
  }
}

function observeDom(id) {
  const el = $id(id);
  if (!el) return null;
  const obs = new MutationObserver(scheduleUpdate);
  obs.observe(el, { childList: true, subtree: true, characterData: true });
  return obs;
}

function init() {
  // Actualiza al inicio
  scheduleUpdate();

  // Observa cambios de tabla + calendario
  observeDom('tablaBody');
  observeDom('listaEnfrentamientos');

  // Torneo select
  const torneoSel = $id('torneoSelect');
  if (torneoSel) torneoSel.addEventListener('change', scheduleUpdate);

  // Fallback: algunos navegadores/caches tardan en pintar; reintento ligero
  window.setTimeout(scheduleUpdate, 500);
  window.setTimeout(scheduleUpdate, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
