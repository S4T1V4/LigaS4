S4PUBLICIDAD (módulo independiente)

- Todo vive dentro de /S4publicidad
  - /S4publicidad/assets     (css/js)
  - /S4publicidad/lib        (sesión/CSRF + Supabase server)
  - /S4publicidad/api        (endpoints)
  - /S4publicidad/config.php (tu config del módulo)

INSTALACIÓN
1) Copia /S4publicidad/config.sample.php -> /S4publicidad/config.php
2) Llena supabase_url y supabase_service_role_key (Settings -> API)
3) Define tu admin_password_hash

NOTA
- Por comodidad, si NO existe /S4publicidad/config.php, el módulo intentará leer el config.php del proyecto.
  Si quieres independencia 100%, crea el config.php dentro de esta carpeta.
