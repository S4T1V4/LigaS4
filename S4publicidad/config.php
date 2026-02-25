<?php
declare(strict_types=1);

/**
 * CONFIG
 * - En producción deja SOLO config.php.
 * - Tip: genera un hash con:
 *   php -r "echo password_hash('TU_PASS', PASSWORD_DEFAULT);"
 */
return [
    'admin_password_hash' => '$2y$10$K5m5UI0xf6na9giuIWFRzOBP6Pky06bda0XODNpBJV7r9Shi0Fe.q',
    'session_name' => 'liga_guty_admin',
    'admin_base_path' => '/S4publicidad',

    // Supabase (SERVER-SIDE)
    'supabase_url' => 'https://mwwhwmbnkgltmzldvknu.supabase.co',
    'supabase_service_role_key' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13d2h3bWJua2dsdG16bGR2a251Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk0ODY3NiwiZXhwIjoyMDg2NTI0Njc2fQ.vUj7eqq1MaPOKzZ_Xp9nqDN0onsYo_ExIImCB9ayjg0',
    'supabase_publicidad_bucket' => 'media',

    'supabase_publicidad_table' => 'publicidad',
];
