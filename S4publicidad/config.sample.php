<?php
declare(strict_types=1);

/**
 * CONFIG S4publicidad (muestra)
 * - Copia a: /S4publicidad/config.php
 * - Tip: genera un hash con:
 *   php -r "echo password_hash('TU_PASS_AQUI', PASSWORD_DEFAULT);"
 *  Para ejecutarlo en Docker [*] docker exec -it web php -r "echo password_hash('CONTRASEÑA NUEVA', PASSWORD_DEFAULT);"
 *
 * Nota:
 * - Si NO configuras aquí supabase_url/service_role, se intentará tomar del config raíz.
 * - Si NO configuras aquí admin_password_hash, se intentará reutilizar el del admin principal.
 */
return [
    // Puedes poner un hash distinto SOLO para S4publicidad (opcional)
    'admin_password_hash' => '$2y$10$K5m5UI0xf6na9giuIWFRzOBP6Pky06bda0XODNpBJV7r9Shi0Fe.q',

    // Nombre de sesión independiente del /admin principal
    'session_name' => 's4publicidad_admin',

    // =====================================================
    // Supabase (SERVER-SIDE)
    // =====================================================
    'supabase_url' => 'https://mwwhwmbnkgltmzldvknu.supabase.co',
    'supabase_service_role_key' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13d2h3bWJua2dsdG16bGR2a251Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk0ODY3NiwiZXhwIjoyMDg2NTI0Njc2fQ.vUj7eqq1MaPOKzZ_Xp9nqDN0onsYo_ExIImCB9ayjg0',

    // Bucket de Storage donde se guardan imágenes de publicidad
    'supabase_publicidad_bucket' => 'media',

    // Tabla Postgres (schema public)
    'supabase_publicidad_table' => 'publicidad',
];
