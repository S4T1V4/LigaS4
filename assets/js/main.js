// Entry point con versionado automático:
// - main.js se carga con ?v=...
// - se propaga el mismo query a los imports (evita cache viejo en móvil/tablet)

const qs = new URL(import.meta.url).search;

(async () => {
  const [core, events] = await Promise.all([
    import(`./core.js${qs}`),
    import(`./events.js${qs}`),
  ]);

  // Primero inicializa (carga torneos, promos, etc.)
  await core.initApp();

  // Luego enlaza eventos (recibe el módulo core ya versionado)
  events.bindEvents(core);
})();
