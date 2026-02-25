<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

lf_logout();
lf_redirect(lf_admin_base() . '/login.php');
