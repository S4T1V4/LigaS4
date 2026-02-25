<?php
declare(strict_types=1);

/**
 * Versión para busting de caché dentro del módulo S4publicidad.
 */
function lf_app_version(string $moduleDir): int {
    $files = [
        $moduleDir . '/assets/css/s4publicidad.css',
        $moduleDir . '/assets/js/s4publicidad_admin.js',
    ];

    $ver = 0;
    foreach ($files as $f) {
        if (is_file($f)) {
            $ver = max($ver, (int)filemtime($f));
        }
    }
    return $ver ?: (int)time();
}
