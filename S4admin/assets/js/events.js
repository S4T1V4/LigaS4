// Nota: para evitar cache viejo en móvil/tablet, este módulo NO importa core.js de forma estática.
// main.js carga core.js con ?v=... y lo inyecta a bindEvents(core).

function closeOnBackdropClick(modalId, closeFn) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeFn();
  });
}

export function bindEvents(core) {
  if (!core) throw new Error('bindEvents(core): falta el módulo core');

  const {
    promoPrev,
    promoNext,
    promoGo,
    showTab,
    filtrarPartidos,
    onTorneoChange,
    onFiltroEquipoChange,
    abrirModalTorneo,
    cerrarModalTorneo,
    abrirModalEditarTorneo,
    cerrarModalEditarTorneo,
    confirmarEliminarTorneo,
    agregarEquipo,
    configurarEnfrentamiento,
    guardarAviso,
    limpiarAvisoActual,
    activarAvisoPorId,
    copiarAvisoPorId,
    eliminarAvisoPorId,
    refrescarAvisosAdmin,
    onAvisoInputChange,
    cargarAvisosHistorial,
    guardarEdicion,
    cerrarModal,
    abrirModalEquipoAdmin,
    abrirModalEquipoNuevo,
    abrirModalEquipoSeleccionado,
    cerrarModalEquipoAdmin,
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

    // Eventos por partido
    onEventoEquipoChange,
    agregarEventoPartido,
    eliminarEventoPartido,
    onEquipoJugadoresChange,
    agregarJugador,
    abrirModalJugadorAdmin,
    cerrarModalJugadorAdmin,
    cancelarEliminarJugadorAdmin,
    confirmarEliminarJugadorAdmin,
    mostrarConfirmEliminarJugadorAdmin,
    guardarCambiosJugadorAdmin,

    // Liguilla
    generarLiguillaDesdeUI,
    programarRondaActivaLiguilla,

    // Panel lateral mobile
    openMobilePanel,
    closeMobilePanel,
    setMobilePanelTab,
    adsLoadMore,
  } = core;
  // Clicks (delegación)
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    switch (action) {
      // Promos
      case 'promo-prev':
        promoPrev();
        break;
      case 'promo-next':
        promoNext();
        break;
      case 'promo-go':
        promoGo(parseInt(el.dataset.index || '0', 10));
        break;

      // Tabs
      case 'tab':
        showTab(el.dataset.tab, el);
        break;

      // Avisos (admin)
      case 'aviso-limpiar':
        limpiarAvisoActual?.();
        break;
      case 'aviso-recargar':
        refrescarAvisosAdmin?.();
        break;
      case 'avisos-historial-refresh':
        cargarAvisosHistorial?.();
        break;
      case 'aviso-activar':
        activarAvisoPorId?.(el.dataset.id || '');
        break;
      case 'aviso-copiar':
        copiarAvisoPorId?.(el.dataset.id || '');
        break;
      case 'aviso-eliminar':
        eliminarAvisoPorId?.(el.dataset.id || '');
        break;

      // Liguilla (admin)
      case 'generar-liguilla':
        generarLiguillaDesdeUI();
        break;

      case 'programar-ronda-liguilla':
        programarRondaActivaLiguilla();
        break;

      // Click en tarjeta del bracket para editar el partido (admin)
      case 'liguilla-editar-partido':
        abrirModalEditarPorPartidoId(el.dataset.partidoId || '');
        break;

      // Panel lateral (móvil) - solo lectura
      case 'mobile-panel-open':
        openMobilePanel?.();
        break;
      case 'mobile-panel-close':
        closeMobilePanel?.();
        break;
      case 'mobile-panel-tab':
        setMobilePanelTab?.(el.dataset.tab || 'resumen');
        break;

      // Drawer anuncios (desktop/móvil)
      case 'ads-open':
        openMobilePanel?.();
        setMobilePanelTab?.(el.dataset.tab || 'patrocinadores');
        break;
      case 'ads-more':
        adsLoadMore?.(el.dataset.tab || 'patrocinadores');
        break;

      // Partidos / filtros
      case 'filtrar-partidos':
        filtrarPartidos(el.dataset.filtro);
        break;

      // Torneos
      case 'torneo-nuevo':
        abrirModalTorneo();
        break;
      case 'torneo-editar':
        abrirModalEditarTorneo();
        break;
      case 'torneo-cerrar':
        cerrarModalTorneo();
        break;
      case 'torneo-editar-cerrar':
        cerrarModalEditarTorneo();
        break;
      case 'torneo-eliminar':
        confirmarEliminarTorneo();
        break;

      // Modal editar resultado/partido
      case 'modal-editar-cerrar':
        cerrarModal();
        break;

      // Enfrentamientos dinámicos
      case 'enf-editar':
        abrirModalEditar(parseInt(el.dataset.index || '0', 10));
        break;
      case 'enf-eliminar':
        eliminarEnfrentamiento(parseInt(el.dataset.index || '0', 10));
        break;

      // Eventos del partido
      case 'evento-agregar':
        agregarEventoPartido();
        break;
      case 'evento-eliminar':
        eliminarEventoPartido(el.dataset.id || '');
        break;

      // Equipos admin
      case 'equipo-nuevo':
        abrirModalEquipoNuevo();
        break;
      case 'equipo-admin-sel':
        abrirModalEquipoSeleccionado();
        break;
      case 'equipo-admin-cerrar':
        cerrarModalEquipoAdmin();
        break;
      case 'equipo-admin-cancelar-eliminar':
        cancelarEliminarEquipoAdmin();
        break;
      case 'equipo-admin-mostrar-eliminar':
        mostrarConfirmEliminarEquipoAdmin();
        break;
      case 'equipo-admin-confirmar-eliminar':
        confirmarEliminarEquipoAdmin();
        break;
      case 'equipo-admin-guardar':
        guardarCambiosEquipoAdmin();
        break;

      // Historial
      case 'historial-abrir':
        abrirHistorialEquipo(el.dataset.team || '');
        break;
      case 'historial-cerrar':
        cerrarModalHistorialEquipo();
        break;

      // Botón Editar en lista de equipos (renderiza con data-id/data-nombre)
      // Si en tu HTML aparece como data-action, lo atrapamos aquí.
      case 'equipo-admin-open': {
        const id = el.dataset.id || '';
        const nombre = el.dataset.nombre || '';
        abrirModalEquipoAdmin(id, nombre);
        break;
      }

      // Regularizar equipo (jornadas pagadas)
      case 'equipo-ajuste-open': {
        const id = el.dataset.id || '';
        const nombre = el.dataset.nombre || '';
        core.abrirModalEquipoAjuste(id, nombre);
        break;
      }
      case 'equipo-ajuste-cerrar':
        core.cerrarModalEquipoAjuste();
        break;
      case 'equipo-ajuste-guardar':
        core.guardarAjusteEquipoPagado('set');
        break;
      case 'equipo-ajuste-quitar':
        core.guardarAjusteEquipoPagado('clear');
        break;



      // Jugadores admin
      case 'jugador-admin-cerrar':
        cerrarModalJugadorAdmin();
        break;
      case 'jugador-admin-cancelar-eliminar':
        cancelarEliminarJugadorAdmin();
        break;
      case 'jugador-admin-mostrar-eliminar':
        mostrarConfirmEliminarJugadorAdmin();
        break;
      case 'jugador-admin-confirmar-eliminar':
        confirmarEliminarJugadorAdmin();
        break;
      case 'jugador-admin-guardar':
        guardarCambiosJugadorAdmin();
        break;
      case 'jugador-admin-open': {
        const id = el.dataset.id || '';
        const nombre = el.dataset.nombre || '';
        const dorsal = el.dataset.dorsal || '';
        const posicion = el.dataset.posicion || '';
        abrirModalJugadorAdmin(id, nombre, dorsal, posicion);
        break;
      }

      default:
        // No-op
        break;
    }
  });

  // Cerrar drawer con ESC
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeMobilePanel?.();
    }
  });


  // Inputs (live)
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.id === 'avisoInput') {
      const val = (t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) ? t.value : '';
      onAvisoInputChange?.(val);
    }
  });
  // Changes
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.id === 'torneoSelect') {
      onTorneoChange(t.value);
    }
    if (t.id === 'filtroEquipoSelect') {
      onFiltroEquipoChange(t.value);
    }
    if (t.id === 'jugadorEquipoSelect') {
      onEquipoJugadoresChange(t.value);
    }

    if (t.id === 'eventoEquipoSelect') {
      onEventoEquipoChange(t.value);
    }
  });

  // Submits
  document.addEventListener('submit', (ev) => {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;

    switch (form.id) {
      case 'formEditarPartido':
        guardarEdicion(ev);
        break;
      case 'formTorneo':
        crearTorneo(ev);
        break;
      case 'formEditarTorneo':
        editarTorneo(ev);
        break;
      case 'formEquipo':
        agregarEquipo(ev);
        break;
      case 'formEnfrentamiento':
        configurarEnfrentamiento(ev);
        break;
      case 'formAviso':
        guardarAviso(ev);
        break;
      case 'formJugador':
        agregarJugador(ev);
        break;
      default:
        break;
    }
  });


  // Atajo: Ctrl+Enter publica aviso
  document.addEventListener('keydown', (ev) => {
    if (!((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter')) return;

    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id !== 'avisoInput') return;

    ev.preventDefault();
    const form = document.getElementById('formAviso');
    if (form && form instanceof HTMLFormElement && form.requestSubmit) {
      form.requestSubmit();
    }
  });
  // Escape cierra modales (sin pelearse con el teclado)
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;

    // Cierra solo si están abiertos
    const m1 = document.getElementById('modalEquipoAdmin');
    if (m1 && m1.classList.contains('show')) cerrarModalEquipoAdmin();

    const m2 = document.getElementById('modalHistorialEquipo');
    if (m2 && m2.classList.contains('show')) cerrarModalHistorialEquipo();

    const m3 = document.getElementById('modalEditar');
    if (m3 && m3.classList.contains('show')) cerrarModal();

    const m4 = document.getElementById('modalTorneo');
    if (m4 && m4.classList.contains('show')) cerrarModalTorneo();

    const m5 = document.getElementById('modalEditarTorneo');
    if (m5 && m5.classList.contains('show')) cerrarModalEditarTorneo();

    const m6 = document.getElementById('modalJugadorAdmin');
    if (m6 && m6.classList.contains('show')) cerrarModalJugadorAdmin();
  });

  // Click fuera (backdrop) cierra modales
  closeOnBackdropClick('modalEquipoAdmin', cerrarModalEquipoAdmin);
  closeOnBackdropClick('modalEquipoAjuste', () => core.cerrarModalEquipoAjuste());
  closeOnBackdropClick('modalHistorialEquipo', cerrarModalHistorialEquipo);
  closeOnBackdropClick('modalEditar', cerrarModal);
  closeOnBackdropClick('modalTorneo', cerrarModalTorneo);
  closeOnBackdropClick('modalEditarTorneo', cerrarModalEditarTorneo);
  closeOnBackdropClick('modalJugadorAdmin', cerrarModalJugadorAdmin);
}
