<?php
declare(strict_types=1);

/**
 * Calcula una versión (timestamp) basada en mtime de assets para busting de caché.
 */
function lf_app_version(string $rootDir): int {
    $files = [
        $rootDir . '/assets/css/app.css',
        $rootDir . '/assets/js/config.js',
        $rootDir . '/assets/js/core.js',
        $rootDir . '/assets/js/events.js',
        $rootDir . '/assets/js/main.js',
    ];

    $ver = 0;
    foreach ($files as $f) {
        if (is_file($f)) {
            $ver = max($ver, (int)filemtime($f));
        }
    }
    return $ver ?: (int)time();
}
