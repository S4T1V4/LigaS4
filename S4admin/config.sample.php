<?php
declare(strict_types=1);

/**
 * CONFIG (muestra)
 * - Copia este archivo a /public_html/admin/config.php (o al root de este proyecto) y cambia la contraseña.
 * - Tip: genera un hash con:
 *   php -r "echo password_hash('TU_PASS', PASSWORD_DEFAULT);"
 * 
 * - Para ejecutarlo en Docker [*] docker exec -it web php -r "echo password_hash('##GUTY_2026', PASSWORD_DEFAULT);"
 */
return [
    // Contraseña por defecto: Admin_2026!
    // ¡Cámbiala en producción!
    'admin_password_hash' => '$2y$10$K5m5UI0xf6na9giuIWFRzOBP6Pky06bda0XODNpBJV7r9Shi0Fe.q',

    // Nombre de sesión (evita colisiones si tienes otros sitios)
    'session_name' => 'liga_guty_admin',

    // Ruta base del panel admin (URL)
    // Si lo subes a una carpeta /admin, déjalo así.
    // Si lo subes a un subdominio, puedes usar '/'.
    'admin_base_path' => '/S4admin',

    // =====================================================
    // Supabase (SERVER-SIDE)
    // - Para el módulo /S4publicidad se usa service_role.
    // - NO pongas la service_role en JS.
    // =====================================================
        
    'supabase_url' => 'https://mwwhwmbnkgltmzldvknu.supabase.co',
    'supabase_service_role_key' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b29rZHZiemNsZWJyZWtsaXViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwNDg2MywiZXhwIjoyMDg0MDgwODYzfQ.n3rVV8BxajN-CWHldwmGJmxe3yrDpEBssho8KL1q0YM',

    // Bucket de Storage donde se guardan imágenes de publicidad
    'supabase_publicidad_bucket' => 'media',

    // Tabla Postgres (schema public)
    'supabase_publicidad_table' => 'publicidad',
];
