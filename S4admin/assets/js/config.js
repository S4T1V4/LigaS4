// Configuración central (front)
// Nota: SUPABASE_KEY debe ser una key pública (publishable/anon). No pongas service_role aquí.

export const SUPABASE_URL = 'https://mwwhwmbnkgltmzldvknu.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_yZUEmu9f2FOqTH7wJN7Fwg_qvAkOMSI';

/**
 * Comerciales / Publicidad (un solo arreglo).
 * Usa "placement" para decidir DÓNDE se muestra cada comercial:
 *  - "patrocinador"   => Hero "Presentado por" (arriba)
 *  - "banner"         => Banner debajo del aviso
 *  - "patrocinadores" => Lista del panel derecho
 *  - "promos"         => "Promo del día" (spotlight)
 */
export const PROMOS = [
    // HERO (Patrocinador principal)
    {
        placement: 'patrocinador',
        title: 'Taquería El Crack 🌮',
        desc: 'Presentado por: 10% mostrando la app (solo domingos).',
        img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=60',
        cta: 'Ver promo',
        href: '#',
        badge: 'Principal'
    },
    {
        placement: 'patrocinador',
        title: 'Chalanes Gym 🏋️',
        desc: 'Presentado por: inscripción gratis para jugadores.',
        img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=60',
        cta: 'Contactar',
        href: '#',
        badge: 'Principal'
    },

    // BANNER (debajo del aviso)
    {
        placement: 'banner',
        title: 'Lavado premium 🚗✨',
        desc: '2x1 en lavado exterior (jugadores y familia).',
        img: 'https://images.unsplash.com/photo-1520342868574-5fa3804e551c?auto=format&fit=crop&w=900&q=60',
        cta: 'Quiero el 2x1',
        href: '#',
        badge: 'Banner'
    },

    // LISTA (panel derecho)
    {
        placement: 'patrocinadores',
        title: 'Barbería La Banda 💈',
        desc: 'Corte + barba a precio de compa (con tu equipo).',
        img: 'https://images.unsplash.com/photo-1520975958221-620d7135f5bd?auto=format&fit=crop&w=900&q=60',
        cta: 'Agendar',
        href: '#',
        badge: 'Sponsor'
    },
    {
        placement: 'patrocinadores',
        title: 'Uniformes “La 10” 👕',
        desc: 'Descuento en kits para equipos (mín. 10 piezas).',
        img: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=60',
        cta: 'Cotizar',
        href: '#',
        badge: 'Sponsor'
    },

    // SPOTLIGHT (promo del día)
    {
        placement: 'promos',
        title: 'Tacos + Refresco 🥤',
        desc: 'Combo jugador: 5 tacos + refresco con precio especial.',
        img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=60',
        cta: 'Ver combo',
        href: '#',
        badge: 'Promo del día'
    }
];
// Publicidad desde BD (tabla + bucket)
export const ADS_USE_DB = true;
export const ADS_TABLE = 'publicidad';
export const ADS_BUCKET = 'media';

