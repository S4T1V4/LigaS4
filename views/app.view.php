<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#f6f7f9">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>Liga Guty · Tabla y Calendario</title>

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
    <link rel="icon" type="image/x-icon" href="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/img/favicon.ico?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="apple-touch-icon" href="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/img/favicon.ico?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="stylesheet" href="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/css/app.css?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>">
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
                    <div id="sideUpdatedAt" class="side-updated" aria-live="polite">—</div>

                    <div class="side-block">
                        <div class="side-block-head">⚽ Goleadores (Top 3)</div>
                        <div id="sideTopScorers" class="side-list">
                            <div class="empty-state">—</div>
                        </div>
                    </div>

                    <div class="side-divider"></div>

                    <div class="side-block">
                        <div class="side-block-head">🔥 Mejor ofensiva</div>
                        <div id="sideBestOffense" class="side-list">
                            <div class="empty-state">—</div>
                        </div>
                    </div>
                    <div class="side-divider"></div>

                    <div class="side-block">
                        <div class="side-block-head">🛡️ Mejor defensiva</div>
                        <div id="sideBestDefense" class="side-list">
                            <div class="empty-state">—</div>
                        </div>
                    <div class="side-divider"></div>

                    <button type="button" class="side-cta" data-action="open-disciplina" aria-haspopup="dialog">
                        <div class="side-cta-title">🟨🟥 Disciplina</div>
                        <div class="side-cta-sub">Ver amonestados y expulsados</div>
                    </button>

                    </div>

                </div>
            </div>
        </aside>

        <!-- Centro -->
        <div class="container">
        <header class="app-header" id="appHeader">

<?php if (!$is_admin): ?>
            <!-- Hero superior (modo espectador) -->
            <div class="brand-hero" aria-hidden="true">
                <picture>
                    <source type="image/webp" srcset="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/img/liga-guty-hero.webp?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>">
                    <img
                        class="brand-hero-img"
                        src="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/img/liga-guty-hero.png?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>"
                        alt=""
                        width="944"
                        height="289"
                        loading="eager"
                        decoding="async"
                    />
                </picture>
            </div>
            <div class="brand-meta">
                <h1 class="app-title sr-only">Liga Guty</h1>
                <p class="subtitle">Competir para ser Mejor</p>
            </div>
<?php else: ?>
            <h1 class="app-title">🔧 Admin · Liga Guty</h1>
            <p class="subtitle">Competir para ser Mejor</p>
<?php endif; ?>

<?php if ($is_admin): ?>
        <div class="admin-bar">
            <div class="admin-badge">🔐 <strong>Admin</strong> <span>Activo</span></div>
            <form class="admin-form" method="post" action="<?php echo htmlspecialchars(lf_admin_base() . '/logout.php', ENT_QUOTES, 'UTF-8'); ?>">
                <span class="hint">Listo para gestionar torneos.</span>
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars((string)($csrf_token ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                <button type="submit" class="btn-secondary">Cerrar sesión</button>
            </form>
        </div>
<?php endif; ?>
</header>

        <div id="configWarning" class="config-warning" style="display: none;">
            <strong>⚠️ Configuración Requerida</strong>
            <p>Por favor, configura tus credenciales de Supabase en el archivo HTML:</p>
            <p>
                <code>SUPABASE_URL</code> y <code>SUPABASE_KEY</code>
            </p>
        </div>


<?php if ($is_admin): ?>
        <div class="banner-avisos" id="bannerAvisos" style="display: none;">
            <h3>📢 Aviso del Torneo</h3>
            <div id="avisoDisplay" class="aviso-display"></div>
        </div>
<?php endif; ?>

<?php if (!$is_admin): ?>
<!-- Modal de aviso (modo espectador). Se muestra automáticamente si hay aviso activo -->
<div id="modalAvisoLiga" class="modal" aria-hidden="true">
    <div class="modal-content aviso-modal" role="dialog" aria-modal="true" aria-label="Aviso del Torneo">
        <div class="modal-header">
            
            <button type="button" class="btn-close" id="avisoModalClose" aria-label="Cerrar">×</button>
        </div>

        <div class="aviso-modal-body">
            <div class="aviso-megafono" aria-hidden="true">📣</div>
            <div id="avisoModalBody" class="aviso-modal-text"></div>
        </div>

        <div class="modal-actions">
            <button type="button" class="btn-primary" id="avisoModalOk">Entendido</button>
        </div>
    </div>
</div>
<?php endif; ?>


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

                <?php if (!$is_admin): ?>
                    <button
                        type="button"
                        id="btnMostrarAviso"
                        class="btn-aviso-icon"
                        title="Mostrar aviso"
                        aria-label="Mostrar aviso">
                        📢
                    </button>
                <?php endif; ?>
            </div>

<div id="noTorneo" class="content" style="display: none;">
            <h2>Selecciona un torneo</h2>
            <div class="empty-state">Elige un torneo arriba para ver la tabla, equipos y partidos. Si no hay torneos, créalo desde <strong>Torneos</strong>.</div>
        </div>

        <div id="appMain" style="display: none;">
        <div class="tabs" role="tablist" aria-label="Secciones del torneo">
            <button class="tab active" role="tab" id="tab-tabla" aria-controls="tabla" aria-selected="true" tabindex="0" data-action="tab" data-tab="tabla">Tabla</button>

            <!-- ✅ Calendario -->
            <button class="tab" role="tab" id="tab-enfrentamientos" aria-controls="enfrentamientos" aria-selected="false" tabindex="-1" data-action="tab" data-tab="enfrentamientos">Calendario</button>

            <!-- ✅ Liguilla (solo lectura) -->
            <button class="tab" role="tab" id="tab-liguilla" aria-controls="liguilla" aria-selected="false" tabindex="-1" data-action="tab" data-tab="liguilla">Liguilla</button>
<?php if ($is_admin): ?>
            <button class="tab" role="tab" id="tab-jugadores" aria-controls="jugadores" aria-selected="false" tabindex="-1" data-action="tab" data-tab="jugadores">Equipos</button>
            <button class="tab" role="tab" id="tab-enfrentamiento" aria-controls="enfrentamiento" aria-selected="false" tabindex="-1" data-action="tab" data-tab="enfrentamiento">Programar Partido</button>
            <button class="tab" role="tab" id="tab-avisos" aria-controls="avisos" aria-selected="false" tabindex="-1" data-action="tab" data-tab="avisos">Avisos</button>
            <button class="tab" role="tab" id="tab-admin" aria-controls="admin" aria-selected="false" tabindex="-1" data-action="tab" data-tab="admin">Torneos</button>
            <?php endif; ?>
        </div>

        

        <div class="content">
            <!-- Tabla de Posiciones -->
            <div id="tabla" class="section active" role="tabpanel" aria-labelledby="tab-tabla" tabindex="0">
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
            <div id="enfrentamientos" class="section" role="tabpanel" aria-labelledby="tab-enfrentamientos" tabindex="0" hidden>
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
            <div id="liguilla" class="section" role="tabpanel" aria-labelledby="tab-liguilla" tabindex="0" hidden>
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
            


<!-- Gestionar Equipos -->
            <?php if ($is_admin): ?>

            <div id="admin" class="section" role="tabpanel" aria-labelledby="tab-admin" tabindex="0" hidden>
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

<div id="equipos" class="section" role="tabpanel" aria-labelledby="tab-jugadores" tabindex="0" hidden>
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
            

<div id="jugadores" class="section" role="tabpanel" aria-labelledby="tab-jugadores" tabindex="0" hidden>
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
            <div id="enfrentamiento" class="section" role="tabpanel" aria-labelledby="tab-enfrentamiento" tabindex="0" hidden>
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
            <div id="avisos" class="section" role="tabpanel" aria-labelledby="tab-avisos" tabindex="0" hidden>
                <h2>Gestionar Avisos</h2>
                <form id="formAviso">
                    <div class="form-group">
                        <label>Aviso del Torneo</label>
                        <textarea id="avisoInput" placeholder="Escribe un aviso importante del torneo..." style="min-height: 120px;"></textarea>
                    </div>
                    <button type="submit" class="btn-primary">Publicar Aviso</button>
                </form>
                
                <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <h3 style="font-size: 1em; margin-bottom: 10px; color: #7f8c8d;">Vista Previa del Banner</h3>
                    <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 20px; border-radius: 8px;">
                        <strong style="display: block; margin-bottom: 8px;">📢 Aviso del Torneo</strong>
                        <div id="vistaPrevia" style="color: rgba(255,255,255,0.9); font-size: 0.95em;">
                            Sin avisos publicados
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
            <div class="mobile-panel-title">Panel</div>
            <button class="mobile-panel-close" type="button" data-action="mobile-panel-close" aria-label="Cerrar">✕</button>
        </div>

        <div class="mobile-panel-tabs">
            <button class="mptab active" type="button" data-action="mobile-panel-tab" data-tab="resumen">Resumen</button>
            <button class="mptab" type="button" data-action="mobile-panel-tab" data-tab="promos">Patrocinadores</button>
        </div>

        <div class="mobile-panel-body">
            <div id="mobilePanelResumen" class="mp-section active">

                <div id="mobileUpdatedAt" class="side-updated" aria-live="polite">—</div>

                <div class="mp-block">
                    <div class="mp-block-head">⚽ Goleadores (Top 3)</div>
                    <div id="mobileTopScorers" class="side-list"><div class="empty-state">—</div></div>
                </div>
                <div class="side-divider"></div>
                <div class="mp-block">
                    <div class="mp-block-head">🔥 Mejor ofensiva</div>
                    <div id="mobileBestOffense" class="side-list"><div class="empty-state">—</div></div>
                </div>
                <div class="side-divider"></div>
                <div class="mp-block">
                    <div class="mp-block-head">🛡️ Mejor defensiva</div>
                    <div id="mobileBestDefense" class="side-list"><div class="empty-state">—</div></div>
                <div class="side-divider"></div>

                <button type="button" class="side-cta" data-action="open-disciplina" aria-haspopup="dialog">
                    <div class="side-cta-title">🟨🟥 Disciplina</div>
                    <div class="side-cta-sub">Ver amonestados y expulsados</div>
                </button>

                </div>

            </div>

            <div id="mobilePanelPromos" class="mp-section">
                <div id="mobilePromos" class="side-promos">
                    <div class="empty-state">Cargando…</div>
                </div>
            </div>
        </div>
    </div>

    <?php if ($is_admin): ?>
<script>
  window.__LF_API_BASE = <?php echo json_encode((string)($BASE_PATH ?? '')); ?>;
  window.__LF_CSRF = <?php echo json_encode((string)($csrf_token ?? '')); ?>;
</script>
<script src="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/js/admin_proxy.js?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>" defer></script>
<?php endif; ?>
<script type="module" src="<?php echo htmlspecialchars((string)($BASE_PATH ?? '') . '/assets/js/main.js?v=' . (string)$APP_VER, ENT_QUOTES, 'UTF-8'); ?>"></script>

<!-- Modal Disciplina (Top 3) -->
<div id="modalDisciplina" class="modal" aria-hidden="true">
    <div class="modal-content disciplina-modal" role="dialog" aria-modal="true" aria-label="Disciplina">
        <div class="modal-header">
            <div class="modal-title">🟨🟥 Disciplina</div>
            <button type="button" class="btn-close" data-action="close-disciplina" aria-label="Cerrar">×</button>
        </div>

        <div class="modal-body">
            <div class="admin-grid disciplina-grid">
                <div class="admin-card">
                    <h3>🟨 Más amonestados (Top 3)</h3>
                    <div id="disciplinaAmarillas" class="history-list"></div>
                </div>

                <div class="admin-card">
                    <h3>🟥 Más expulsados (Top 3)</h3>
                    <div id="disciplinaRojas" class="history-list"></div>
                </div>
            </div>
        </div>

        <div class="modal-actions">
            <button type="button" class="btn-secondary" data-action="close-disciplina">Cerrar</button>
        </div>
    </div>
</div>

</body>
</html>