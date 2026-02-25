<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#f6f7f9">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>Tabla de Posiciones - Fútbol</title>

    <?php
        if (!isset($APP_VER)) {
        // Cache-busting automático (móvil/tablet suelen cachear JS/CSS agresivo)
        // Usamos el mtime más reciente de los assets principales.
        $ver_files = [
            __DIR__ . '/../assets/css/app.css',
            __DIR__ . '/../assets/js/config.js',
            __DIR__ . '/../assets/js/core.js',
            __DIR__ . '/../assets/js/events.js',
            __DIR__ . '/../assets/js/main.js',
        ];
        $APP_VER = 0;
        foreach ($ver_files as $vf) {
            if (file_exists($vf)) {
                $APP_VER = max($APP_VER, filemtime($vf));
            }
        }
            }
    ?>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
    <link rel="stylesheet" href="assets/css/app.css?v=<?php echo $APP_VER; ?>">
<!-- Minimal Theme Overrides (no JS changes) -->
</head>
<body class="<?php echo $is_admin ? 'is-admin' : 'is-public'; ?>">
    <div id="loadingOverlay" class="loading-overlay" style="display: none;">
        <div class="spinner"></div>
    </div>

    <!-- Layout con paneles laterales (solo lectura / visita) -->
    <div class="page-grid">
        <!-- Panel Izquierdo (Resumen) -->
        <aside id="publicSideLeft" class="side-panel side-left" aria-label="Resumen del torneo">
            <div class="side-panel-inner">
                <div class="side-card">
                    <div class="side-card-title">📌 Resumen</div>

                    <div class="side-block">
                        <div class="side-block-head">✅ Últimos resultados</div>
                        <div id="sideLastResults" class="side-list">
                            <div class="empty-state">Selecciona un torneo.</div>
                        </div>
                    </div>

                    <div class="side-divider"></div>

                    <div class="side-block">
                        <div class="side-block-head">⚽ Goleadores</div>
                        <div id="sideTopScorers" class="side-list">
                            <div class="empty-state">—</div>
                        </div>
                    </div>

                    <div class="side-divider"></div>

                    <div class="side-block">
                        <div class="side-block-head">🟨🟥 Disciplina</div>
                        <div id="sideTopDiscipline" class="side-list">
                            <div class="empty-state">—</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Centro -->
        <div class="container">
        <header>
<h1 class="app-title">
    <?php if (($MODE ?? 'public') === 'admin'): ?>
        🔧 Admin · Liga Guty
    <?php else: ?>
        ⚽ Liga Guty
    <?php endif; ?>
</h1>
            <p class="subtitle">Competir para ser Mejor</p>
<?php if (!$is_admin): ?>
<div class="header-actions">
  <button id="btnAds" class="btn-ads" type="button" data-action="ads-open" data-tab="patrocinadores" aria-label="Abrir anuncios">
    💠 Anuncios <span id="adsCount" class="ads-count">0</span>
  </button>
</div>
<?php endif; ?>
<?php if ($is_admin): ?>
        <div class="admin-bar">
            <div class="admin-badge">🔐 <strong>Admin</strong> <span>Activo</span></div>
            <form class="admin-form" method="post" action="logout.php">
                <span class="hint">Listo para gestionar torneos.</span>
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars((string)($csrf_token ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                <button type="submit" class="btn-secondary">Cerrar sesión</button>
            </form>
        </div>
<?php endif; ?>


</header>
<?php if (!$is_admin): ?>
<div id="sponsorRibbon" class="sponsor-ribbon" role="region" aria-label="Patrocinadores oficiales" style="display:none;">
  <div class="sr-head">
    <div class="sr-title">🤝 Patrocinadores oficiales</div>
    <button type="button" class="sr-all" data-action="ads-open" data-tab="patrocinadores">Ver todos</button>
  </div>
  <div id="sponsorRibbonTrack" class="sr-track" role="list"></div>
</div>
<?php endif; ?>


        <div id="configWarning" class="config-warning" style="display: none;">
            <strong>⚠️ Configuración Requerida</strong>
            <p>Por favor, configura tus credenciales de Supabase en el archivo HTML:</p>
            <p>
                <code>SUPABASE_URL</code> y <code>SUPABASE_KEY</code>
            </p>
        </div>

        </div>

<?php if (!$is_admin): ?>
        <!-- Banner publicitario (debajo del aviso). No depende del hero ni del panel derecho. -->
        <div id="nativePromo" class="native-promo" role="region" aria-label="Banner" style="display:none;">
            <div class="native-badge">Banner</div>
            <div class="native-body">
                <img id="nativePromoImg" src="" alt="Banner" loading="lazy" />
                <div class="native-copy">
                    <div id="nativePromoTitle" class="native-title">—</div>
                    <div id="nativePromoDesc" class="native-desc">—</div>
                </div>
                <a id="nativePromoCta" class="native-cta" href="#" target="_blank" rel="noopener">Ver →</a>
            </div>
        </div>
<?php endif; ?>

<?php if (!$is_admin): ?>
<div id="promosFeatured" class="promos-featured" role="region" aria-label="Promos destacadas" style="display:none;">
  <div class="pf-head">
    <div class="pf-title">🔥 Promos destacadas</div>
    <div class="pf-actions">
      <span id="pfCounter" class="pf-counter">1/1</span>
      <button type="button" class="pf-all" data-action="ads-open" data-tab="promos">Ver todas</button>
    </div>
  </div>
  <div id="pfCard" class="pf-card"></div>
  <div id="pfThumbs" class="pf-thumbs" aria-label="Lista de promos"></div>
</div>
<?php endif; ?>


<?php if (!$is_admin): ?>
<div class="promo-banner sponsor-hero" id="promoBanner" role="region" aria-label="Tabla y Calendario — Presentado por" style="display: none;">
    <div class="sponsor-hero-head">
        <div class="sponsor-hero-label">Tabla y Calendario — <strong>Presentado por</strong></div>
        <div class="sponsor-hero-meta">
            <span id="promoCounter" class="sponsor-hero-counter">1/1</span>
            <div class="promo-dots" id="promoDots" aria-label="Indicadores de promoción"></div>
        </div>
    </div>

    <div class="promo-viewport">
        <div class="promo-track" id="promoTrack" aria-live="polite"></div>
    </div>

    <button class="promo-nav prev" type="button" aria-label="Promoción anterior" data-action="promo-prev">‹</button>
    <button class="promo-nav next" type="button" aria-label="Siguiente promoción" data-action="promo-next">›</button>
</div>
<?php endif; ?>
        


            <div class="torneo-bar">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="torneoSelect">🏆 Torneo</label>
                    <select id="torneoSelect">
                        <option value="">Seleccionar torneo…</option>
                    </select>
                </div>
            </div>

<div id="noTorneo" class="content" style="display: none;">
            <h2>Selecciona un torneo</h2>
            <div class="empty-state">Elige un torneo arriba para ver la tabla, equipos y partidos. Si no hay torneos, créalo desde <strong>Torneos</strong>.</div>
        </div>

        <div id="appMain" style="display: none;">
        <div class="tabs">
            <button class="tab active" data-action="tab" data-tab="tabla">Tabla</button>

            <!-- ✅ Calendario -->
            <button class="tab" data-action="tab" data-tab="enfrentamientos">Calendario</button>

            <!-- ✅ Liguilla (solo lectura) -->
            <button class="tab" data-action="tab" data-tab="liguilla">Liguilla</button>

            <button class="tab" data-action="tab" data-tab="estadisticas">Estadísticas</button>
            <?php if ($is_admin): ?>
            <button class="tab" data-action="tab" data-tab="jugadores">Equipos</button>
            <button class="tab" data-action="tab" data-tab="enfrentamiento">Programar Partido</button>
            <button class="tab" data-action="tab" data-tab="avisos">Avisos</button>
            <button class="tab" data-action="tab" data-tab="admin">Torneos</button>
            <?php endif; ?>
        </div>

        

        <div class="content">
            <!-- Tabla de Posiciones -->
            <div id="tabla" class="section active">
                <!-- Dashboard (sin cambiar lógica: solo lee lo que ya se renderiza) -->
                <div id="dash" class="dash" aria-label="Dashboard">
                    <div class="dash-head">
                        <div>
                            <div class="dash-title">👀 Vista rápida</div>
                            <div class="dash-sub">Toca un botón y listo. (Sí, también funciona con dedos llenos de chetos).</div>
                        </div>
                        <div class="dash-pill" id="dashTorneoName">Torneo: —</div>
                    </div>

                    <div class="dash-cards" role="list">
                        <div class="dash-card" role="listitem">
                            <div class="dc-icon">👑</div>
                            <div class="dc-body">
                                <div class="dc-k">Líder</div>
                                <div class="dc-v" id="dashLeaderName">—</div>
                                <div class="dc-s"><span id="dashLeaderPts">0</span> pts</div>
                            </div>
                        </div>

                        <div class="dash-card" role="listitem">
                            <div class="dc-icon">👥</div>
                            <div class="dc-body">
                                <div class="dc-k">Equipos</div>
                                <div class="dc-v"><span id="dashTeams">0</span></div>
                                <div class="dc-s">participando</div>
                            </div>
                        </div>

                        <div class="dash-card" role="listitem">
                            <div class="dc-icon">📅</div>
                            <div class="dc-body">
                                <div class="dc-k">Próximo partido</div>
                                <div class="dc-v" id="dashNextTeams">—</div>
                                <div class="dc-s" id="dashNextWhen">—</div>
                            </div>
                        </div>

                        <div class="dash-card" role="listitem">
                            <div class="dc-icon">⚽</div>
                            <div class="dc-body">
                                <div class="dc-k">Goles</div>
                                <div class="dc-v"><span id="dashGoals">0</span></div>
                                <div class="dc-s">en el torneo</div>
                            </div>
                        </div>
                    </div>


                </div>

                <h2>Tabla de Posiciones</h2>

                <div class="table-pos-wrap">
                    <!-- Desktop/tablet: tabla normal -->
                    <div class="table-wrap tabla-desktop-wrap">
                        <table id="tablaPosiciones" class="tabla-desktop">
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Equipo</th>
                                    <th>PJ</th>
                                    <th>PG</th>
                                    <th>PE</th>
                                    <th>PP</th>
                                    <th>GF</th>
                                    <th>GC</th>
                                    <th>DIF</th>
                                    <th>PTS</th>
                                </tr>
                            </thead>
                            <tbody id="tablaBody">
                                <tr>
                                    <td colspan="10" class="empty-state">No hay equipos registrados</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Móvil: Pos + Equipo fijos (sin overlay) + scroll horizontal en PJ→PTS -->
                    <div class="tabla-split" id="tablaPosicionesSplit" aria-label="Tabla de posiciones (móvil)">
                        <div class="split-fixed">
                            <table class="split-table split-left">
                                <thead>
                                    <tr>
                                        <th>Pos</th>
                                        <th>Equipo</th>
                                    </tr>
                                </thead>
                                <tbody id="tablaBodyFixed">
                                    <tr>
                                        <td colspan="2" class="empty-state">No hay equipos registrados</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="split-scroll" aria-label="Scroll horizontal de estadísticas">
                            <table class="split-table split-right">
                                <thead>
                                    <tr>
                                        <th>PJ</th>
                                        <th>PG</th>
                                        <th>PE</th>
                                        <th>PP</th>
                                        <th>GF</th>
                                        <th>GC</th>
                                        <th>DIF</th>
                                        <th>PTS</th>
                                    </tr>
                                </thead>
                                <tbody id="tablaBodyScroll">
                                    <tr>
                                        <td colspan="8" class="empty-state">No hay equipos registrados</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Enfrentamientos Programados -->
            <div id="enfrentamientos" class="section">
                <h2>Calendario de Partidos</h2>
                <div class="filtros">
                    <?php if ($is_admin): ?>
                    <button class="btn-filtro active" data-action="filtrar-partidos" data-filtro="pendientes" id="filtroPendientes">Pendientes</button>
                    <button class="btn-filtro" data-action="filtrar-partidos" data-filtro="jugados" id="filtroJugados">Jugados</button>
                    <button class="btn-filtro" data-action="filtrar-partidos" data-filtro="todos" id="filtroTodos">Todos</button>

                    <!-- Selector dentro de "Todos": filtra por equipo o muestra todos -->
                    <div class="form-group" id="filtroTodosEquipoWrap" style="margin: 0; min-width: 240px; display: none;">
                        <label for="filtroEquipoSelect" style="font-size: 0.85em; margin-bottom: 6px; color: #7f8c8d;">Equipo (en “Todos”)</label>
                        <select id="filtroEquipoSelect">
                            <option value="__all__">Todos los equipos</option>
                        </select>
                    </div>
                    <?php else: ?>
                    <button class="btn-filtro active" data-action="filtrar-partidos" data-filtro="pendientes" id="filtroPendientes">Pendientes</button>
                    <?php endif; ?>
                </div>
                <div id="listaEnfrentamientos"></div>
            </div>

            <!-- Liguilla (solo lectura) -->
            <div id="liguilla" class="section">
                <h2>Liguilla</h2>
                <p style="margin-top:-8px; opacity:.75;">Eliminación directa (partido único). Empate = penales.</p>

                <?php if ($is_admin): ?>
                <div style="display:flex; gap:12px; align-items:end; flex-wrap:wrap; margin: 10px 0 14px;">
                    <div class="form-group" style="margin-bottom:0; min-width: 200px;">
                        <label for="liguillaCupos">Equipos a clasificar</label>
                        <select id="liguillaCupos">
                            <option value="2">2 (Final)</option>
                            <option value="4">4 (Semis)</option>
                            <option value="6">6 (Repechaje)</option>
                            <option value="8" selected>8 (Cuartos)</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:0; min-width: 180px;">
                        <label for="liguillaFecha">Fecha</label>
                        <input type="date" id="liguillaFecha">
                    </div>

                    <div class="form-group" style="margin-bottom:0; min-width: 180px;">
                        <label for="liguillaHora">Hora</label>
                        <select id="liguillaHora">
                            <option value="">Seleccionar</option>
                        </select>
                    </div>

                    <button class="btn-primary" type="button" data-action="generar-liguilla">🏁 Generar Liguilla</button>

                    <!-- Programar la ronda activa (por defecto: próximo domingo + hora siguiente) -->
                    <button class="btn-secondary" type="button" data-action="programar-ronda-liguilla" title="Programa la ronda activa con incrementos de +1h">
                        📅 Programar ronda activa
                    </button>

                    <div id="liguillaEstado" style="opacity:.75;"></div>
                </div>
                <?php endif; ?>

                <div id="liguillaWrap" class="liguilla-bracket-wrap">
                    <div class="empty-state">Selecciona un torneo para ver la liguilla.</div>
                </div>

            </div>
            
                        <!-- Estadísticas (solo lectura) -->
            <div id="estadisticas" class="section">
                <h2>Estadísticas del Torneo</h2>

                <div id="statsCampeonWrap" class="admin-card stats-champ-card"></div>

                <div class="admin-grid">
                    <div class="admin-card">
                        <h3>⚽ Top Goleadores</h3>
                        <div id="statsGoleadores" class="history-list"></div>
                    </div>

                    <div class="admin-card">
                        <h3>🟨 Tarjetas Amarillas</h3>
                        <div id="statsAmarillas" class="history-list"></div>
                    </div>

                    <div class="admin-card">
                        <h3>🟥 Tarjetas Rojas</h3>
                        <div id="statsRojas" class="history-list"></div>
                    </div>

                    <div class="admin-card">
                        <h3>🛡️ Mejor Defensa</h3>
                        <div id="statsMejorDefensa" class="history-list"></div>
                    </div>

                    <div class="admin-card">
                        <h3>🔥 Mejor Ataque</h3>
                        <div id="statsMejorAtaque" class="history-list"></div>
                    </div>
                </div>

                <div id="statsHint" class="empty-state" style="margin-top: 12px; display:none;"></div>
            </div>

<!-- Gestionar Equipos -->
            <?php if ($is_admin): ?>

            <div id="admin" class="section">
                <h2>Torneos</h2>

                <div class="admin-grid">
                    <div class="admin-card">
                        <h3>🏆 Torneos</h3>
                        <p>Crea un torneo nuevo o cambia el torneo activo desde el selector de arriba.</p>
                        <div class="admin-actions">
                            <button type="button" class="btn-primary" data-action="torneo-nuevo">+ Alta</button>
                            <button type="button" class="btn-secondary" id="btnEditarTorneo" data-action="torneo-editar" disabled>✏️ Editar nombre</button>
                            <button type="button" class="btn-delete" id="btnEliminarTorneo" data-action="torneo-eliminar" disabled>🗑️ Eliminar</button>
                        </div>
                    </div>

                    <div class="admin-card">
                        <h3>📌 Resumen del torneo</h3>
                        <p style="margin-top:-6px; opacity:.8;">Vista rápida del torneo seleccionado (sin duplicar estadísticas).</p>
                        <div id="adminResumenTorneo" class="summary-grid">
                            <div class="empty-state">Selecciona un torneo para ver el resumen.</div>
                        </div>
                    </div>

</div>              
            </div>

<div id="equipos" class="section">
                <h2>Agregar Equipo</h2>
                <form id="formEquipo">
                    <div class="form-group">
                        <label>Nombre del Equipo</label>
                        <input type="text" id="nombreEquipo" required placeholder="Ej: Real Madrid">
                    </div>
                    <button type="submit" class="btn-primary">Agregar Equipo</button>
                </form>
                
                <h2 style="margin-top: 30px;">Lista de Equipos</h2>
                <div id="listaEquipos"></div>
            </div>
            

<div id="jugadores" class="section">
                <h2>Jugadores</h2>

                <div class="torneo-bar" style="margin-bottom: 16px; display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
                    <div class="form-group" style="margin-bottom: 0; min-width: 260px; flex: 1;">
                        <label for="jugadorEquipoSelect">👕 Equipo</label>
                        <select id="jugadorEquipoSelect">
                            <option value="">Seleccionar equipo…</option>
                        </select>
                    </div>

                    <div class="admin-actions" style="margin:0; display:flex; gap:10px;">
                        <button type="button" class="btn-primary" id="btnEquipoNuevoQuick" data-action="equipo-nuevo">+ Equipo</button>
                        <button type="button" class="btn-secondary" id="btnEquipoAdminQuick" data-action="equipo-admin-sel" disabled>⚙️ Administrar</button>
                        <button type="button" class="btn-secondary" id="btnEquipoAjusteQuick" data-action="equipo-ajuste-open" disabled>🧾 Ajustar PJ</button>
                    </div>
                </div>

                <div id="jugadoresHintEquipo" class="empty-state">
                    Selecciona un equipo para registrar y administrar su plantilla.
                </div>

                <form id="formJugador" style="display:none;">
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Nombre del Jugador</label>
                            <input type="text" id="nombreJugador" required placeholder="Ej: Juan Pérez">
                        </div>
                        <div class="form-group">
                            <label>Dorsal (opcional)</label>
                            <input type="number" id="dorsalJugador" min="0" max="99" placeholder="Ej: 10">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Posición (opcional)</label>
                        <input type="text" id="posicionJugador" placeholder="Ej: Delantero, Medio, Defensa, Portero">
                    </div>

                    <button type="submit" class="btn-primary">Agregar Jugador</button>
                </form>

                <h2 style="margin-top: 30px;">Plantilla</h2>
                <div id="listaJugadores"></div>
            </div>


            <!-- Próximo Partido -->
            <div id="enfrentamiento" class="section">
                <h2>Programar Partido</h2>
                <form id="formEnfrentamiento">
                    <div class="match-cards">
                        <div class="match-cards-3">
                            <div class="field-card">
                                <div class="fc-head">
                                    <span class="fc-icon">🏠</span>
                                    <div>
                                        <label class="fc-label" for="enfrentamientoLocal">Equipo local</label>
                                        <div class="fc-help">El que juega “en casa”.</div>
                                    </div>
                                </div>
                                <div class="fc-body">
                                    <select id="enfrentamientoLocal" required>
                                        <option value="">Seleccionar</option>
                                    </select>
                                </div>
                            </div>

                            <div class="vs-pill" aria-hidden="true">VS</div>

                            <div class="field-card">
                                <div class="fc-head">
                                    <span class="fc-icon">🚩</span>
                                    <div>
                                        <label class="fc-label" for="enfrentamientoVisitante">Equipo visitante</label>
                                        <div class="fc-help">El que juega “de visita”.</div>
                                    </div>
                                </div>
                                <div class="fc-body">
                                    <select id="enfrentamientoVisitante" required>
                                        <option value="">Seleccionar</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="match-cards-2">
                            <div class="field-card">
                                <div class="fc-head">
                                    <span class="fc-icon">📅</span>
                                    <div>
                                        <label class="fc-label" for="fechaPartido">Fecha</label>
                                        <div class="fc-help">Día en el que se juega.</div>
                                    </div>
                                </div>
                                <div class="fc-body">
                                    <input type="date" id="fechaPartido" required>
                                </div>
                            </div>

                            <div class="field-card">
                                <div class="fc-head">
                                    <span class="fc-icon">🕒</span>
                                    <div>
                                        <label class="fc-label" for="horaPartido">Hora</label>
                                        <div class="fc-help">Hora de inicio.</div>
                                    </div>
                                </div>
                                <div class="fc-body">
                                   <select id="horaPartido" required>
                                        <option value="">Seleccionar</option>
                                    </select>

                                </div>
                            </div>
                        </div>


                        <div class="field-card">
                            <div class="fc-head">
                                <span class="fc-icon">🏷️</span>
                                <div>
                                    <label class="fc-label" for="tipoPartido">Tipo de partido</label>
                                    <div class="fc-help">Oficial cuenta para tabla y estadísticas. Amistoso NO afecta liga/liguilla.</div>
                                </div>
                            </div>
                            <div class="fc-body">
                                <select id="tipoPartido">
                                    <option value="OFICIAL" selected>Oficial</option>
                                    <option value="AMISTOSO">Amistoso</option>
                                </select>
                            </div>
                        </div>

                        <div class="field-card">
                            <div class="fc-head">
                                <span class="fc-icon">📝</span>
                                <div>
                                    <label class="fc-label" for="notasPartido">Notas (opcional)</label>
                                    <div class="fc-help">Ej: jornada, cancha, observaciones, etc.</div>
                                </div>
                            </div>
                            <div class="fc-body">
                                <textarea id="notasPartido" placeholder="Ej: Jornada 3, semifinal, partido de ida, etc." style="min-height: 90px;"></textarea>
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary">Programar Partido</button>
                </form>
                
               <div id="timelineMini" class="timeline-mini"></div>

            </div>
            
            <!-- Avisos -->
            <div id="avisos" class="section">
                <div class="avisos-header">
                    <div>
                        <h2 style="margin:0;">Gestionar Avisos</h2>
                        <div class="avisos-meta">
                            <span id="avisoEstadoBadge" class="badge badge-muted">—</span>
                            <span class="avisos-dot">•</span>
                            <span class="avisos-meta-line">Último: <strong id="avisoUltimoFecha">—</strong></span>
                        </div>
                    </div>

                    <div class="avisos-actions">
                        <button type="button" class="btn-secondary" id="btnAvisoLimpiar" data-action="aviso-limpiar" title="Desactiva el aviso actual (no borra el historial)">
                            Quitar aviso
                        </button>
                    </div>
                </div>

                <form id="formAviso">
                    <div class="form-group">
                        <label for="avisoInput">Aviso del Torneo</label>
                        <textarea id="avisoInput" placeholder="Escribe un aviso importante del torneo..." style="min-height: 120px;" maxlength="500"></textarea>
                        <div class="avisos-under">
                            <div class="avisos-hint">Tip: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para publicar.</div>
                            <div class="avisos-counter"><span id="avisoCounter">0</span>/500</div>
                        </div>
                    </div>

                    <div class="avisos-actions-row">
                        <button type="submit" class="btn-primary">Publicar Aviso</button>
                        <button type="button" class="btn-secondary btn-mini" data-action="aviso-recargar" title="Recarga el aviso activo desde la BD">Recargar</button>
                    </div>
                </form>

                <div class="avisos-grid">
                    <div class="avisos-preview-card">
                        <h3 class="avisos-subtitle">Vista previa (como lo ve el público)</h3>
                        <div class="avisos-preview-banner">
                            <strong class="avisos-preview-title">📢 Aviso del Torneo</strong>
                            <div id="vistaPrevia" class="avisos-preview-body">Sin avisos publicados</div>
                        </div>
                    </div>

                    <div class="avisos-history-card">
                        <div class="avisos-history-head">
                            <h3 class="avisos-subtitle" style="margin:0;">Historial</h3>
                            <button type="button" class="btn-secondary btn-mini" data-action="avisos-historial-refresh">Actualizar</button>
                        </div>
                        <div id="avisosHistorial" class="avisos-history-list">
                            <div class="empty-state">Cargando…</div>
                        </div>
                    </div>
                </div>
            </div>
	<?php endif; ?>
		</div>
		</div>
	</div>

		<!-- Panel Derecho (Patrocinadores) -->
		<aside id="publicSideRight" class="side-panel side-right" aria-label="Patrocinadores">
			<div class="side-panel-inner">
				<div class="side-card">
					<div class="side-card-title">💸 Patrocinadores</div>
					<div id="sidePromos" class="side-promos">
						<div class="empty-state">Cargando…</div>
					</div>
				</div>

				<?php if (!$is_admin): ?>
				<div class="side-card side-card-spotlight">
					<div class="side-card-title">🔥 Promo del día</div>
					<div id="sideSpotlight" class="promo-spotlight">
						<div class="empty-state">—</div>
					</div>
				</div>
				<?php endif; ?>
			</div>
		</aside>
	</div><!-- /page-grid -->

<!-- Modal para editar partido -->

   <div id="modalEditar" class="modal">
          <div class="modal-content modal-dialog">
            <div class="modal-header">
              <h3 id="tituloModal">Editar Partido</h3>
              <button class="btn-close" data-action="modal-editar-cerrar">&times;</button>
            </div>

            <form id="formEditarPartido" class="modal-form">
              <div class="modal-body">
                <div class="form-group">
                  <label>Partido</label>
                  <input type="text" id="editarPartidoTexto" readonly style="background: #f8f9fa;">
                </div>

                <div class="ubicacion-info">
                  📍 Ubicación:
                  <a href="https://maps.google.com/?q=19.263907491345563,-98.4449237589333" target="_blank" class="ubicacion-link">
                    Ver en Google Maps
                  </a>
                </div>

                <div id="camposFechaHora">
                  <div class="grid-2">
                    <div class="form-group">
                      <label>Nueva Fecha</label>
                      <input type="date" id="editarFecha">
                    </div>
                    <div class="form-group">
                      <label>Nueva Hora</label>
                      <input type="time" id="editarHora">
                    </div>
                  </div>
                </div>

                <div id="camposResultado" style="display: none;">
                  <div class="scorebox" style="background:#f8f9fa; border:1px solid #e9ecef; padding:12px; border-radius:12px;">
                    <div style="font-weight:900; margin-bottom:6px;">⚽ Marcador (eventos)</div>
                    <div id="marcadorTexto" style="font-size: 1.2em; font-weight: 900;">—</div>
                    <div id="marcadorSub" style="font-size:.9em; opacity:.75; margin-top:4px;"></div>
                    <div id="autosaveEstado" class="autosave-status" style="margin-top:8px;"></div>
                  </div>

                  <div class="form-group" style="margin-top: 12px;">
                    <label style="display:flex; gap:10px; align-items:center; font-weight:800;">
                      <input type="checkbox" id="editarFinalizado">
                      Partido finalizado (cuenta para tabla y reportes)
                    </label>
                    <div style="font-size:.9em; opacity:.75; margin-top:6px;">
                      Tip: si quieres editar sin afectar la tabla, deja <strong>desmarcado</strong> mientras ajustas eventos.
                    </div>
                  </div>

                  <div id="penalesWrap" style="display:none; margin-top: 12px; padding: 12px; border: 1px dashed #e9ecef; border-radius: 12px; background: #fffaf1;">
                    <div style="font-weight: 900; margin-bottom: 8px;">🥅 Penales (solo liguilla si hay empate)</div>
                    <div class="grid-2">
                      <div class="form-group">
                        <label>Penales Local</label>
                        <input type="number" id="editarPenalesLocal" min="0" step="1" placeholder="Ej: 4">
                      </div>
                      <div class="form-group">
                        <label>Penales Visitante</label>
                        <input type="number" id="editarPenalesVisitante" min="0" step="1" placeholder="Ej: 3">
                      </div>
                    </div>
                    <div id="penalesHint" style="font-size: .9em; opacity: .75;">Tip: deben ser diferentes (ej. 5-4).</div>
                  </div>

                </div>

                <div id="eventosWrap" style="display:none; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e9ecef;">
                  <div style="font-weight: 900; margin-bottom: 10px;">📌 Eventos del partido</div>

                  <div id="eventosHint" class="empty-state" style="display:none; margin-bottom: 10px;"></div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label>Equipo</label>
                      <select id="eventoEquipoSelect"></select>
                    </div>
                    <div class="form-group">
                      <label>Jugador (opcional)</label>
                      <select id="eventoJugadorSelect"></select>
                    </div>
                  </div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label>Tipo</label>
                      <select id="eventoTipoSelect"></select>
                    </div>
                  </div>

                  <div style="display:flex; gap:10px; align-items:center; margin-bottom: 10px;">
                    <button type="button" class="btn-primary" data-action="evento-agregar">+ Agregar evento</button>
                    <div style="font-size:.9em; opacity:.75;">Gol / Autogol / Amarilla / Roja</div>
                  </div>

                  <div id="eventosLista"></div>
                </div>

                <div class="form-group">
                  <label>Notas del Partido (Opcional)</label>
                  <textarea id="editarNotas" placeholder="Ej: Jornada 3, semifinal, partido de ida, etc." style="min-height: 80px;"></textarea>
                </div>
              </div>
            </form>

            <div class="modal-actions modal-footer">
              <button type="submit" form="formEditarPartido" class="btn-primary" style="flex:1;" id="btnGuardar">
                Guardar Cambios
              </button>
              <button type="button" class="btn-eliminar-enfrentamiento" data-action="modal-editar-cerrar" style="flex:1; margin:0;">
                Cancelar
              </button>
            </div>
          </div>
        </div>


    
    <!-- Modal: Administrar equipo -->
    <div id="modalEquipoAdmin" class="modal">
        <div class="modal-content" style="max-width: 420px;">
            <div class="modal-header">
                <h3 id="tituloModalEquipoAdmin">Equipo</h3>
                <button class="btn-close" data-action="equipo-admin-cerrar">&times;</button>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label for="equipoNombreAdmin">Nombre del equipo</label>
                <input type="text" id="equipoNombreAdmin" placeholder="Nombre del equipo" />
                <div style="font-size: 0.9em; color: #7f8c8d; margin-top: 6px;">
                     Al guardar, el nombre se refleja en la tabla y en los partidos sin modificar historial.
                </div>
            </div>

            <div id="equipoAdminConfirmDelete" style="display:none; border:1px solid #f5c6cb; background:#fff5f5; padding:12px; border-radius:12px; margin-bottom: 12px;">
                <div style="font-weight: 800; margin-bottom: 6px;">¿Desactivar este equipo?</div>
                <div style="font-size: 0.9em; color: #7f8c8d;">
                    No se eliminan partidos. Solo se desactiva para que ya no se pueda programar.
                </div>
                <div style="display:flex; gap:10px; margin-top: 10px;">
                    <button type="button" class="btn-secondary" data-action="equipo-admin-cancelar-eliminar" style="flex:1; margin:0;">Cancelar</button>
                    <button type="button" class="btn-delete" data-action="equipo-admin-confirmar-eliminar" style="flex:1; margin:0;">Desactivar</button>
                </div>
            </div>


            <div class="modal-actions" style="display:flex; gap:10px;">
                <button type="button" class="btn-delete" id="btnEquipoAdminDesactivar" data-action="equipo-admin-mostrar-eliminar" style="flex:1; margin:0;">Desactivar</button>
                <button type="button" class="btn-primary" data-action="equipo-admin-guardar" style="flex:1; margin:0;">Guardar</button>
            </div>
        </div>
    </div>


    

    <!-- Modal: Regularizar equipo (jornadas pagadas) -->
    <div id="modalEquipoAjuste" class="modal">
        <div class="modal-content" style="max-width: 520px;">
            <div class="modal-header">
                <h3 id="tituloModalEquipoAjuste">Regularizar equipo</h3>
                <button class="btn-close" data-action="equipo-ajuste-cerrar">&times;</button>
            </div>

            <div style="margin-bottom: 10px; font-weight: 600;">
                ⚽ <span id="equipoAjusteNombre">Equipo</span>
            </div>

            <div class="empty-state" style="margin: 0 0 12px 0;">
                Este ajuste <b>NO crea partidos</b> ni afecta el calendario. Solo suma PJ/PG/PTS (y GF/GC) para “alcanzar” la jornada.
                <div id="equipoAjusteHint" style="margin-top: 8px;"></div>
            </div>

            <div class="form-group">
                <label for="equipoAjusteJornadas">Jornadas pagadas (se cuentan como ganadas)</label>
                <input type="number" id="equipoAjusteJornadas" min="0" step="1" value="0" />
            </div>

            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <div class="form-group" style="flex:1; min-width: 180px;">
                    <label for="equipoAjusteGFPor">GF por juego</label>
                    <input type="number" id="equipoAjusteGFPor" min="0" step="1" value="3" />
                </div>
                <div class="form-group" style="flex:1; min-width: 180px;">
                    <label for="equipoAjusteGCPor">GC por juego</label>
                    <input type="number" id="equipoAjusteGCPor" min="0" step="1" value="0" />
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-top: 14px;">
                <button class="btn-primary" data-action="equipo-ajuste-guardar" style="flex:1; margin:0;">Guardar ajuste</button>
                <button class="btn-secondary" data-action="equipo-ajuste-quitar" style="margin:0;">🗑️ Quitar ajuste</button>
                <button class="btn-secondary" data-action="equipo-ajuste-cerrar" style="margin:0;">Cerrar</button>
            </div>
        </div>
    </div>

<!-- Modal: Administrar jugador -->
    <div id="modalJugadorAdmin" class="modal">
        <div class="modal-content" style="max-width: 520px;">
            <div class="modal-header">
                <h3 id="tituloModalJugadorAdmin">Jugador</h3>
                <button class="btn-close" data-action="jugador-admin-cerrar">&times;</button>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label for="jugadorNombreAdmin">Nombre</label>
                    <input type="text" id="jugadorNombreAdmin" placeholder="Nombre del jugador" />
                </div>
                <div class="form-group">
                    <label for="jugadorDorsalAdmin">Dorsal</label>
                    <input type="number" id="jugadorDorsalAdmin" min="0" max="99" placeholder="Ej: 10" />
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label for="jugadorPosicionAdmin">Posición</label>
                <input type="text" id="jugadorPosicionAdmin" placeholder="Ej: Delantero, Medio, Defensa, Portero" />
            </div>

            <div id="jugadorAdminConfirmDelete" style="display:none; border:1px solid #f5c6cb; background:#fff5f5; padding:12px; border-radius:12px; margin-bottom: 12px;">
                <div style="font-weight: 800; margin-bottom: 6px;">¿Desactivar este jugador?</div>
                <div style="font-size: 0.9em; color: #7f8c8d;">
                    No se borra historial; solo se oculta de la lista activa.
                </div>
                <div style="display:flex; gap:10px; margin-top: 10px;">
                    <button type="button" class="btn-secondary" data-action="jugador-admin-cancelar-eliminar" style="flex:1; margin:0;">Cancelar</button>
                    <button type="button" class="btn-delete" data-action="jugador-admin-confirmar-eliminar" style="flex:1; margin:0;">Desactivar</button>
                </div>
            </div>

            <div class="modal-actions" style="display:flex; gap:10px;">
                <button type="button" class="btn-delete" data-action="jugador-admin-mostrar-eliminar" style="flex:1; margin:0;">Desactivar</button>
                <button type="button" class="btn-primary" data-action="jugador-admin-guardar" style="flex:1; margin:0;">Guardar</button>
            </div>
        </div>
    </div>


<!-- Modal: Historial de equipo -->
    <div id="modalHistorialEquipo" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="tituloHistorialEquipo">Historial del equipo</h3>
                <button class="btn-close" data-action="historial-cerrar">&times;</button>
            </div>

            <div id="historialResumen" class="history-summary"></div>

            <div class="history-h3">Partidos</div>
            <div id="historialLista" class="history-list"></div>

            <div id="historialPendientesWrap" style="display:none;">
                <div class="history-sep"></div>
                <div class="history-h3">Pendientes</div>
                <div id="historialPendientes" class="history-list"></div>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn-secondary" data-action="historial-cerrar" style="flex: 1; margin: 0;">Cerrar</button>
            </div>
        </div>
    </div>


    <!-- Modal para crear torneo -->
    <div id="modalTorneo" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Nuevo Torneo</h3>
                <button class="btn-close" data-action="torneo-cerrar">&times;</button>
            </div>
            <form id="formTorneo">
                <div class="form-group">
                    <label>Nombre del Torneo</label>
                    <input type="text" id="nombreTorneo" required placeholder="Ej: Apertura 2026">
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn-primary" style="flex: 1;">Crear</button>
                    <button type="button" class="btn-eliminar-enfrentamiento" data-action="torneo-cerrar" style="flex: 1; margin: 0;">Cancelar</button>
                </div>
            </form>
        </div>
    </div>
    <div id="modalEditarTorneo" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar Torneo</h3>
                <button class="btn-close" data-action="torneo-editar-cerrar">&times;</button>
            </div>
            <form id="formEditarTorneo">
                <div class="form-group">
                    <label>Nombre del Torneo</label>
                    <input type="text" id="nombreTorneoEditar" required placeholder="Ej: Apertura 2026">
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn-primary" style="flex: 1;">Guardar</button>
                    <button type="button" class="btn-eliminar-enfrentamiento" data-action="torneo-editar-cerrar" style="flex: 1; margin: 0;">Cancelar</button>
                </div>
            </form>
        </div>
    </div>


    <!-- Mobile: Botón + Drawer (solo lectura) -->
    <button id="mobilePanelBtn" class="mobile-panel-btn" type="button" data-action="mobile-panel-open" aria-label="Abrir panel">
        ☰ Panel
    </button>

    <div id="mobilePanelOverlay" class="mobile-panel-overlay" data-action="mobile-panel-close" aria-hidden="true"></div>

    <div id="mobilePanelDrawer" class="mobile-panel-drawer" role="dialog" aria-modal="true" aria-label="Panel">
        <div class="mobile-panel-head">
            <div class="mobile-panel-title">Centro</div>
            <button class="mobile-panel-close" type="button" data-action="mobile-panel-close" aria-label="Cerrar">✕</button>
        </div>

        <div class="mobile-panel-tabs">
            <button class="mptab active" type="button" data-action="mobile-panel-tab" data-tab="resumen">Resumen</button>
            <button class="mptab" type="button" data-action="mobile-panel-tab" data-tab="patrocinadores">Patrocinadores</button>
            <button class="mptab" type="button" data-action="mobile-panel-tab" data-tab="promos">Promos</button>
            <button class="mptab" type="button" data-action="mobile-panel-tab" data-tab="banners">Banners</button>
        </div>

        <div class="mobile-panel-body">
            <div id="mobilePanelResumen" class="mp-section active">
                <div class="mp-block">
                    <div class="mp-block-head">✅ Últimos resultados</div>
                    <div id="mobileLastResults" class="side-list">
                        <div class="empty-state">Selecciona un torneo.</div>
                    </div>
                </div>
                <div class="side-divider"></div>
                <div class="mp-block">
                    <div class="mp-block-head">⚽ Goleadores</div>
                    <div id="mobileTopScorers" class="side-list"><div class="empty-state">—</div></div>
                </div>
                <div class="side-divider"></div>
                <div class="mp-block">
                    <div class="mp-block-head">🟨🟥 Disciplina</div>
                    <div id="mobileTopDiscipline" class="side-list"><div class="empty-state">—</div></div>
                </div>
            </div>

                        <div id="mobilePanelPatrocinadores" class="mp-section">
                <div id="adsSponsorsGrid" class="ads-grid ads-grid--mp">
                    <div class="empty-state">Cargando…</div>
                </div>
                <button id="adsMoreSponsors" class="btn-secondary ads-more" type="button" data-action="ads-more" data-tab="patrocinadores" style="width:100%; margin-top: 12px; display:none;">Cargar más</button>
            </div>

            <div id="mobilePanelPromos" class="mp-section">
                <div id="adsPromosGrid" class="ads-grid ads-grid--mp">
                    <div class="empty-state">Cargando…</div>
                </div>
                <button id="adsMorePromos" class="btn-secondary ads-more" type="button" data-action="ads-more" data-tab="promos" style="width:100%; margin-top: 12px; display:none;">Cargar más</button>
            </div>

            <div id="mobilePanelBanners" class="mp-section">
                <div id="adsBannersGrid" class="ads-grid ads-grid--mp">
                    <div class="empty-state">Cargando…</div>
                </div>
                <button id="adsMoreBanners" class="btn-secondary ads-more" type="button" data-action="ads-more" data-tab="banners" style="width:100%; margin-top: 12px; display:none;">Cargar más</button>
            </div>
        </div>
    </div>

    <?php if (!$is_admin): ?>
    <!-- Navegación inferior (móvil): más fácil de entender para todos -->
    <nav class="bottom-nav" aria-label="Menú">
        <button class="bn-item" type="button" data-action="tab" data-tab="tabla" aria-label="Tabla">
            <span class="bn-ico">🏆</span>
            <span class="bn-txt">Tabla</span>
        </button>
        <button class="bn-item" type="button" data-action="tab" data-tab="enfrentamientos" aria-label="Calendario">
            <span class="bn-ico">🗓️</span>
            <span class="bn-txt">Calendario</span>
        </button>
        <button class="bn-item" type="button" data-action="tab" data-tab="liguilla" aria-label="Liguilla">
            <span class="bn-ico">🏁</span>
            <span class="bn-txt">Liguilla</span>
        </button>
        <button class="bn-item" type="button" data-action="tab" data-tab="estadisticas" aria-label="Estadísticas">
            <span class="bn-ico">📊</span>
            <span class="bn-txt">Stats</span>
        </button>
    </nav>
    <?php endif; ?>

    <script type="module" src="assets/js/main.js?v=<?php echo $APP_VER; ?>"></script>
    <script type="module" src="assets/js/dashboard.js?v=<?php echo $APP_VER; ?>"></script>
</body>
</html>