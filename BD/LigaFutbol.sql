-- ============================================
-- LIGA FUTBOL - SCRIPT ORDENADO
-- Orden: tablas -> PK/FK -> indices -> vistas -> funciones/RPC -> triggers
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1) TABLAS (sin PK/FK)
-- ============================================

-- WARNING: BASE DATOS LIGA

CREATE TABLE public.torneos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  fase_actual text DEFAULT 'LIGA'::text,
  cupos_liguilla integer,
  campeon_id uuid,
  subcampeon_id uuid
);

CREATE TABLE public.equipos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL,
  nombre text NOT NULL,
  pj integer NOT NULL DEFAULT 0 CHECK (pj >= 0),
  pg integer NOT NULL DEFAULT 0 CHECK (pg >= 0),
  pe integer NOT NULL DEFAULT 0 CHECK (pe >= 0),
  pp integer NOT NULL DEFAULT 0 CHECK (pp >= 0),
  gf integer NOT NULL DEFAULT 0 CHECK (gf >= 0),
  gc integer NOT NULL DEFAULT 0 CHECK (gc >= 0),
  pts integer NOT NULL DEFAULT 0 CHECK (pts >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.jugadores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  nombre text NOT NULL,
  dorsal integer CHECK (dorsal IS NULL OR dorsal >= 0 AND dorsal <= 99),
  posicion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.partidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL,
  local text,
  visitante text,
  fecha date NOT NULL,
  hora time without time zone NOT NULL,
  fecha_hora timestamp with time zone NOT NULL,
  notas text,
  ubicacion_lat double precision NOT NULL DEFAULT 19.263907491345563,
  ubicacion_lng double precision NOT NULL DEFAULT '-98.4449237589333'::numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid NOT NULL,
  visitante_id uuid NOT NULL,
  finalizado boolean NOT NULL DEFAULT false,
  finalizado_at timestamp with time zone,
  fase text DEFAULT 'LIGA'::text,
  ronda integer,
  llave integer,
  etapa text,
  tipo_partido text NOT NULL DEFAULT 'OFICIAL'::text CHECK (tipo_partido = ANY (ARRAY['OFICIAL'::text, 'AMISTOSO'::text]))
);

CREATE TABLE public.avisos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL,
  texto text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.estadistica_jugador (
  torneo_id uuid NOT NULL,
  jugador_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  goles integer NOT NULL DEFAULT 0,
  autogoles integer NOT NULL DEFAULT 0,
  amarillas integer NOT NULL DEFAULT 0,
  rojas integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.eventos_partido (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL,
  partido_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  jugador_id uuid,
  tipo_evento text NOT NULL CHECK (tipo_evento = ANY (ARRAY['GOL'::text, 'AUTOGOL'::text, 'AMARILLA'::text, 'ROJA'::text])),
  minuto integer CHECK (minuto IS NULL OR minuto >= 0 AND minuto <= 130),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.liguilla_clasificados (
  torneo_id uuid NOT NULL,
  seed integer NOT NULL,
  equipo_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.liguilla_seed (
  torneo_id uuid NOT NULL,
  seed integer NOT NULL,
  equipo_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.marcadores_partido (
  partido_id uuid NOT NULL,
  torneo_id uuid NOT NULL,
  goles_local integer NOT NULL DEFAULT 0,
  goles_visitante integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  penales_local integer DEFAULT 0,
  penales_visitante integer DEFAULT 0
);

CREATE TABLE public.posiciones (
  torneo_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  pj integer NOT NULL DEFAULT 0,
  pg integer NOT NULL DEFAULT 0,
  pe integer NOT NULL DEFAULT 0,
  pp integer NOT NULL DEFAULT 0,
  gf integer NOT NULL DEFAULT 0,
  gc integer NOT NULL DEFAULT 0,
  dif integer NOT NULL DEFAULT 0,
  pts integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);


CREATE TABLE public.posiciones_ajustes (
  torneo_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  aj_pj integer NOT NULL DEFAULT 0,
  aj_pg integer NOT NULL DEFAULT 0,
  aj_pe integer NOT NULL DEFAULT 0,
  aj_pp integer NOT NULL DEFAULT 0,
  aj_gf integer NOT NULL DEFAULT 0,
  aj_gc integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.publicidad (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  cta_text text,
  cta_url text,
  image_path text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  colocacion text NOT NULL DEFAULT 'patrocinadores'::text CHECK (colocacion = ANY (ARRAY['patrocinador'::text, 'banner'::text, 'patrocinadores'::text, 'promos'::text]))
);

-- ============================================
-- 2) PRIMARY KEYS
-- ============================================

ALTER TABLE ONLY public.torneos ADD CONSTRAINT torneos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.equipos ADD CONSTRAINT equipos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.jugadores ADD CONSTRAINT jugadores_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partidos ADD CONSTRAINT partidos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.avisos ADD CONSTRAINT avisos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT estadistica_jugador_pkey PRIMARY KEY (torneo_id, jugador_id);
ALTER TABLE ONLY public.eventos_partido ADD CONSTRAINT eventos_partido_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.liguilla_clasificados ADD CONSTRAINT liguilla_clasificados_pkey PRIMARY KEY (torneo_id, seed);
ALTER TABLE ONLY public.liguilla_seed ADD CONSTRAINT liguilla_seed_pkey PRIMARY KEY (torneo_id, seed);
ALTER TABLE ONLY public.marcadores_partido ADD CONSTRAINT marcadores_partido_pkey PRIMARY KEY (partido_id);
ALTER TABLE ONLY public.posiciones ADD CONSTRAINT posiciones_pkey PRIMARY KEY (torneo_id, equipo_id);
ALTER TABLE ONLY public.posiciones_ajustes ADD CONSTRAINT posiciones_ajustes_pkey PRIMARY KEY (torneo_id, equipo_id);
ALTER TABLE ONLY public.publicidad ADD CONSTRAINT publicidad_pkey PRIMARY KEY (id);

-- ============================================
-- 3) FOREIGN KEYS
-- ============================================

ALTER TABLE ONLY public.equipos ADD CONSTRAINT equipos_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.jugadores ADD CONSTRAINT jugadores_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.jugadores ADD CONSTRAINT jugadores_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.partidos ADD CONSTRAINT partidos_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.partidos ADD CONSTRAINT partidos_local_fk FOREIGN KEY (local_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.partidos ADD CONSTRAINT partidos_visitante_fk FOREIGN KEY (visitante_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.avisos ADD CONSTRAINT avisos_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT stats_jugador_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT stats_jugador_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugadores(id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT stats_jugador_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT estadistica_jugador_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT estadistica_jugador_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugadores(id);
ALTER TABLE ONLY public.estadistica_jugador ADD CONSTRAINT estadistica_jugador_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.eventos_partido ADD CONSTRAINT eventos_partido_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.eventos_partido ADD CONSTRAINT eventos_partido_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES public.partidos(id);
ALTER TABLE ONLY public.eventos_partido ADD CONSTRAINT eventos_partido_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.eventos_partido ADD CONSTRAINT eventos_partido_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugadores(id);
ALTER TABLE ONLY public.marcadores_partido ADD CONSTRAINT marcadores_partido_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.marcadores_partido ADD CONSTRAINT marcadores_partido_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES public.partidos(id);
ALTER TABLE ONLY public.posiciones ADD CONSTRAINT posiciones_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.posiciones ADD CONSTRAINT posiciones_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);
ALTER TABLE ONLY public.posiciones_ajustes ADD CONSTRAINT posiciones_ajustes_torneo_id_fkey FOREIGN KEY (torneo_id) REFERENCES public.torneos(id);
ALTER TABLE ONLY public.posiciones_ajustes ADD CONSTRAINT posiciones_ajustes_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);

-- ============================================
-- 4) INDICES
-- ============================================

-- Indices para velocidad
create index if not exists idx_equipos_torneo on public.equipos(torneo_id);
create index if not exists idx_partidos_torneo_fecha on public.partidos(torneo_id, fecha_hora);
create index if not exists idx_avisos_torneo_activo on public.avisos(torneo_id, activo, created_at desc);
create index if not exists idx_posiciones_torneo on public.posiciones(torneo_id);
create index if not exists idx_posiciones_ajustes_torneo on public.posiciones_ajustes(torneo_id);
create index if not exists idx_marcadores_torneo_partido on public.marcadores_partido(torneo_id, partido_id);
create index if not exists idx_stats_torneo on public.estadistica_jugador(torneo_id);
create index if not exists idx_eventos_torneo_partido on public.eventos_partido(torneo_id, partido_id, created_at);

-- ============================================
-- 5) VISTAS
-- ============================================

-- ============================================
-- VISTA 1: v_estadistica_jugador_torneo
-- ============================================
CREATE OR REPLACE VIEW public.v_estadistica_jugador_torneo AS
SELECT 
    s.torneo_id,
    s.jugador_id,
    s.equipo_id,
    e.nombre AS equipo_nombre,
    j.nombre AS jugador_nombre,
    j.dorsal,
    j.posicion,
    j.activo,
    s.goles,
    s.autogoles,
    s.amarillas,
    s.rojas,
    s.updated_at
FROM 
    estadistica_jugador s
    JOIN jugadores j ON j.id = s.jugador_id
    JOIN equipos e ON e.id = s.equipo_id;
-- ============================================
-- VISTA 2: v_liguilla_partidos
-- ============================================
CREATE OR REPLACE VIEW public.v_liguilla_partidos AS
SELECT 
    p.id AS partido_id,
    p.torneo_id,
    p.fase,
    p.etapa,
    p.ronda,
    p.llave,
    p.fecha,
    p.hora,
    p.fecha_hora,
    p.finalizado,
    p.finalizado_at,
    p.local_id,
    el.nombre AS local_nombre,
    p.visitante_id,
    ev.nombre AS visitante_nombre,
    COALESCE(mp.goles_local, 0) AS goles_local,
    COALESCE(mp.goles_visitante, 0) AS goles_visitante,
    COALESCE(mp.penales_local, 0) AS penales_local,
    COALESCE(mp.penales_visitante, 0) AS penales_visitante
FROM 
    partidos p
    JOIN equipos el ON el.id = p.local_id
    JOIN equipos ev ON ev.id = p.visitante_id
    LEFT JOIN marcadores_partido mp ON mp.torneo_id = p.torneo_id AND mp.partido_id = p.id
WHERE 
    p.fase = 'LIGUILLA';
-- ============================================
-- VISTA 3: v_marcadores_partido
-- ============================================
CREATE OR REPLACE VIEW public.v_marcadores_partido AS
SELECT 
    p.id AS partido_id,
    p.torneo_id,
    p.fecha,
    p.hora,
    p.fecha_hora,
    p.notas,
    p.ubicacion_lat,
    p.ubicacion_lng,
    p.finalizado,
    p.finalizado_at,
    p.local_id,
    el.nombre AS local_nombre,
    p.visitante_id,
    ev.nombre AS visitante_nombre,
    COALESCE(mp.goles_local, 0) AS goles_local,
    COALESCE(mp.goles_visitante, 0) AS goles_visitante,
    COALESCE(mp.updated_at, p.updated_at) AS marcador_updated_at
FROM 
    partidos p
    LEFT JOIN marcadores_partido mp ON mp.partido_id = p.id
    JOIN equipos el ON el.id = p.local_id
    JOIN equipos ev ON ev.id = p.visitante_id;
-- ============================================
-- VISTA 4: v_posiciones_torneo
-- ============================================
create or replace view public.v_posiciones_torneo as
select
  e.torneo_id,
  e.id as equipo_id,
  e.nombre as equipo_nombre,

  coalesce(p.pj, 0)  as pj,
  coalesce(p.pg, 0)  as pg,
  coalesce(p.pe, 0)  as pe,
  coalesce(p.pp, 0)  as pp,
  coalesce(p.gf, 0)  as gf,
  coalesce(p.gc, 0)  as gc,
  coalesce(p.dif, 0) as dif,
  coalesce(p.pts, 0) as pts,

  p.updated_at as updated_at
from public.equipos e
left join public.posiciones p
  on p.torneo_id = e.torneo_id
 and p.equipo_id = e.id;

-- ============================================
-- 6) COMENTARIOS DE VISTAS
-- ============================================

-- Comentario para la vista
COMMENT ON VIEW public.v_estadistica_jugador_torneo IS 'Vista de estadísticas de jugadores por torneo con nombres de equipo y jugador';
-- Comentario para la vista
COMMENT ON VIEW public.v_liguilla_partidos IS 'Vista de partidos de liguilla con nombres de equipos y marcadores';
-- Comentario para la vista
COMMENT ON VIEW public.v_marcadores_partido IS 'Vista completa de partidos con marcadores y nombres de equipos';
-- Comentario para la vista
COMMENT ON VIEW public.v_posiciones_torneo IS 'Vista de posiciones de torneo con nombres de equipos';

-- ============================================
-- 7) FUNCIONES / RPC
-- ============================================

-- ============================================
-- FUNCIÓN: fn_avanzar_liguilla_si_corresponde
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_avanzar_liguilla_si_corresponde(p_torneo_id uuid, p_ronda integer)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  cupos int;
  ganadores uuid[];
  total int;
  next_ronda int;
  etapa_next text;

  seed1 uuid;
  seed2 uuid;

  final_match uuid;
  l_final uuid;
  v_final uuid;
  campeon uuid;
  subcampeon uuid;

  i int;
  partido_id uuid;

  prev_fecha date;
  prev_hora time;
  next_fecha date;
  scheduled_ts timestamp;
  scheduled_hora time;
  scheduled_fecha date;
  llave_int int;
BEGIN
  SELECT cupos_liguilla INTO cupos
  FROM public.torneos
  WHERE id = p_torneo_id;

  IF cupos IS NULL THEN RETURN; END IF;

  -- Si aún hay partidos sin finalizar en esa ronda -> no hacer nada
  IF EXISTS (
    SELECT 1
    FROM public.partidos
    WHERE torneo_id = p_torneo_id
      AND fase = 'LIGUILLA'
      AND ronda = p_ronda
      AND finalizado = false
  ) THEN
    RETURN;
  END IF;

  next_ronda := p_ronda + 1;

  -- Si ya existe la siguiente ronda -> no hacer nada
  IF EXISTS (
    SELECT 1
    FROM public.partidos
    WHERE torneo_id = p_torneo_id
      AND fase = 'LIGUILLA'
      AND ronda = next_ronda
  ) THEN
    RETURN;
  END IF;

  -- Ganadores de ronda actual ordenados por llave
  SELECT array_agg(public.fn_ganador_partido(id) ORDER BY llave)
  INTO ganadores
  FROM public.partidos
  WHERE torneo_id = p_torneo_id
    AND fase = 'LIGUILLA'
    AND ronda = p_ronda;

  IF ganadores IS NULL OR ganadores @> ARRAY[NULL::uuid] THEN
    RAISE EXCEPTION 'Hay partidos sin ganador válido (faltan penales o marcador).';
  END IF;

  total := array_length(ganadores, 1);

  -- 🏆 Si total=1 -> FINAL terminada => declarar campeón
  IF total = 1 THEN
    SELECT id, local_id, visitante_id
    INTO final_match, l_final, v_final
    FROM public.partidos
    WHERE torneo_id = p_torneo_id
      AND fase = 'LIGUILLA'
      AND ronda = p_ronda
    LIMIT 1;

    campeon := public.fn_ganador_partido(final_match);

    IF campeon = l_final THEN subcampeon := v_final;
    ELSE subcampeon := l_final;
    END IF;

    UPDATE public.torneos
    SET fase_actual = 'TERMINADO',
        campeon_id = campeon,
        subcampeon_id = subcampeon
    WHERE id = p_torneo_id;

    RETURN;
  END IF;

  -- Etapa siguiente
  IF cupos = 8 AND next_ronda = 2 THEN etapa_next := 'SEMIS';
  ELSIF cupos = 8 AND next_ronda = 3 THEN etapa_next := 'FINAL';
  ELSIF cupos = 6 AND next_ronda = 2 THEN etapa_next := 'SEMIS';
  ELSIF cupos = 6 AND next_ronda = 3 THEN etapa_next := 'FINAL';
  ELSIF cupos = 4 AND next_ronda = 2 THEN etapa_next := 'FINAL';
  ELSE etapa_next := 'FINAL';
  END IF;

  -- ✅ Base de programación = fecha/hora de la ronda actual (match 1)
  SELECT max(fecha) INTO prev_fecha
  FROM public.partidos
  WHERE torneo_id = p_torneo_id AND fase = 'LIGUILLA' AND ronda = p_ronda;

  SELECT min(hora) INTO prev_hora
  FROM public.partidos
  WHERE torneo_id = p_torneo_id AND fase = 'LIGUILLA' AND ronda = p_ronda;

  IF prev_fecha IS NULL THEN prev_fecha := current_date; END IF;
  IF prev_hora  IS NULL THEN prev_hora  := (date_trunc('hour', now()) + interval '1 hour')::time; END IF;

  -- ✅ Próximo DOMINGO (si ya era domingo, se va al siguiente)
  next_fecha := prev_fecha + (7 - EXTRACT(DOW FROM prev_fecha)::int);

  -- Caso especial: cupos=6 (Repechaje -> Semis con BYE)
  IF cupos = 6 AND p_ronda = 1 THEN
    SELECT equipo_id INTO seed1 FROM public.liguilla_clasificados WHERE torneo_id = p_torneo_id AND seed = 1;
    SELECT equipo_id INTO seed2 FROM public.liguilla_clasificados WHERE torneo_id = p_torneo_id AND seed = 2;

    -- Semi 1: seed1 vs ganador llave2 (llave=1)
    llave_int := 1;
    scheduled_ts := (next_fecha::timestamp + prev_hora + interval '1 hour' * (llave_int - 1));
    scheduled_fecha := scheduled_ts::date;
    scheduled_hora  := scheduled_ts::time;

    INSERT INTO public.partidos
      (torneo_id, local_id, visitante_id, fase, ronda, llave, etapa, finalizado,
       fecha, hora, fecha_hora)
    VALUES
      (p_torneo_id, seed1, ganadores[2], 'LIGUILLA', next_ronda, llave_int, etapa_next, false,
       scheduled_fecha, scheduled_hora, (scheduled_ts AT TIME ZONE 'America/Mexico_City'))
    RETURNING id INTO partido_id;

    PERFORM public.fn_ensure_marcador(p_torneo_id, partido_id);

    -- Semi 2: seed2 vs ganador llave1 (llave=2)
    llave_int := 2;
    scheduled_ts := (next_fecha::timestamp + prev_hora + interval '1 hour' * (llave_int - 1));
    scheduled_fecha := scheduled_ts::date;
    scheduled_hora  := scheduled_ts::time;

    INSERT INTO public.partidos
      (torneo_id, local_id, visitante_id, fase, ronda, llave, etapa, finalizado,
       fecha, hora, fecha_hora)
    VALUES
      (p_torneo_id, seed2, ganadores[1], 'LIGUILLA', next_ronda, llave_int, etapa_next, false,
       scheduled_fecha, scheduled_hora, (scheduled_ts AT TIME ZONE 'America/Mexico_City'))
    RETURNING id INTO partido_id;

    PERFORM public.fn_ensure_marcador(p_torneo_id, partido_id);

    RETURN;
  END IF;

  -- Normal: emparejar ganadores consecutivos
  i := 1;
  WHILE i <= total LOOP
    llave_int := ((i + 1) / 2);

    scheduled_ts := (next_fecha::timestamp + prev_hora + interval '1 hour' * (llave_int - 1));
    scheduled_fecha := scheduled_ts::date;
    scheduled_hora  := scheduled_ts::time;

    INSERT INTO public.partidos
      (torneo_id, local_id, visitante_id, fase, ronda, llave, etapa, finalizado,
       fecha, hora, fecha_hora)
    VALUES
      (p_torneo_id, ganadores[i], ganadores[i+1], 'LIGUILLA', next_ronda, llave_int, etapa_next, false,
       scheduled_fecha, scheduled_hora, (scheduled_ts AT TIME ZONE 'America/Mexico_City'))
    RETURNING id INTO partido_id;

    PERFORM public.fn_ensure_marcador(p_torneo_id, partido_id);

    i := i + 2;
  END LOOP;

END;
$function$;
-- ============================================
-- FUNCIÓN: fn_ensure_marcador
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_ensure_marcador(p_torneo_id uuid, p_partido_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.marcadores_partido
    WHERE torneo_id = p_torneo_id
      AND partido_id = p_partido_id
  ) THEN
    INSERT INTO public.marcadores_partido (
      torneo_id, partido_id, goles_local, goles_visitante, penales_local, penales_visitante
    )
    VALUES (
      p_torneo_id, p_partido_id, 0, 0, 0, 0
    );
  END IF;
END;
$function$;
-- ============================================
-- FUNCIÓN: fn_ganador_partido
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_ganador_partido(p_partido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  gl int; gv int; pl int; pv int;
  l_id uuid; v_id uuid;
BEGIN
  SELECT p.local_id, p.visitante_id
  INTO l_id, v_id
  FROM public.partidos p
  WHERE p.id = p_partido_id;

  SELECT mp.goles_local, mp.goles_visitante, mp.penales_local, mp.penales_visitante
  INTO gl, gv, pl, pv
  FROM public.marcadores_partido mp
  WHERE mp.partido_id = p_partido_id;

  IF gl IS NULL OR gv IS NULL THEN RETURN NULL; END IF;

  IF gl > gv THEN RETURN l_id; END IF;
  IF gv > gl THEN RETURN v_id; END IF;

  -- Empate => penales obligatorios
  IF pl IS NULL OR pv IS NULL THEN RETURN NULL; END IF;
  IF pl > pv THEN RETURN l_id; END IF;
  IF pv > pl THEN RETURN v_id; END IF;

  RETURN NULL;
END;
$function$;
-- ============================================
-- FUNCIÓN: fn_trg_auto_avanzar_liguilla
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_trg_auto_avanzar_liguilla()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.finalizado = true
     AND COALESCE(OLD.finalizado,false) = false
     AND NEW.fase = 'LIGUILLA' THEN

    PERFORM public.fn_avanzar_liguilla_si_corresponde(NEW.torneo_id, NEW.ronda);
  END IF;

  RETURN NEW;
END;
$function$;
-- ============================================
-- FUNCIÓN: fn_validar_penales_finalizacion
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_validar_penales_finalizacion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  gl int; gv int; pl int; pv int;
BEGIN
  IF NEW.finalizado = true AND COALESCE(OLD.finalizado,false) = false THEN

    IF COALESCE(NEW.fase,'LIGA') = 'LIGUILLA' THEN
      PERFORM public.fn_ensure_marcador(NEW.torneo_id, NEW.id);

      SELECT mp.goles_local, mp.goles_visitante, mp.penales_local, mp.penales_visitante
      INTO gl, gv, pl, pv
      FROM public.marcadores_partido mp
      WHERE mp.torneo_id = NEW.torneo_id
        AND mp.partido_id = NEW.id;

      IF gl = gv THEN
        IF pl IS NULL OR pv IS NULL THEN
          RAISE EXCEPTION 'Empate en liguilla requiere penales en partido %', NEW.id;
        END IF;
        IF pl = pv THEN
          RAISE EXCEPTION 'Penales NO pueden empatar en partido %', NEW.id;
        END IF;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;
-- ============================================
-- FUNCIÓN: generar_liguilla
-- ============================================
CREATE OR REPLACE FUNCTION public.generar_liguilla(p_torneo_id uuid, p_cupos integer)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  equipos uuid[];
  a int[];
  b int[];
  i int;
  local_team uuid;
  visitante_team uuid;
  etapa1 text;
  partido_id uuid;
BEGIN
  IF p_cupos NOT IN (2,4,6,8) THEN
    RAISE EXCEPTION 'Cupos inválidos. Usa 2,4,6 u 8.';
  END IF;

  -- Liga regular debe estar terminada
  IF EXISTS (
    SELECT 1
    FROM public.partidos
    WHERE torneo_id = p_torneo_id
      AND COALESCE(fase,'LIGA') = 'LIGA'
      AND finalizado = false
  ) THEN
    RAISE EXCEPTION 'Aún hay partidos de LIGA sin finalizar.';
  END IF;

  -- No duplicar liguilla
  IF EXISTS (
    SELECT 1
    FROM public.partidos
    WHERE torneo_id = p_torneo_id
      AND fase = 'LIGUILLA'
  ) THEN
    RAISE EXCEPTION 'La liguilla ya fue generada para este torneo.';
  END IF;

  -- Top N equipos por posiciones
  SELECT array_agg(x.equipo_id)
  INTO equipos
  FROM (
    SELECT p.equipo_id
    FROM public.posiciones p
    WHERE p.torneo_id = p_torneo_id
    ORDER BY p.pts DESC, p.dif DESC, p.gf DESC
    LIMIT p_cupos
  ) x;

  IF array_length(equipos, 1) IS NULL OR array_length(equipos, 1) < p_cupos THEN
    RAISE EXCEPTION 'No hay suficientes equipos en posiciones.';
  END IF;

  -- ✅ Guardar clasificados (seed 1..N)
  DELETE FROM public.liguilla_clasificados WHERE torneo_id = p_torneo_id;

  FOR i IN 1..p_cupos LOOP
    INSERT INTO public.liguilla_clasificados (torneo_id, seed, equipo_id)
    VALUES (p_torneo_id, i, equipos[i]);
  END LOOP;

  -- Etapa inicial según cupos
  IF p_cupos = 2 THEN etapa1 := 'FINAL';
  ELSIF p_cupos = 4 THEN etapa1 := 'SEMIS';
  ELSIF p_cupos = 6 THEN etapa1 := 'REPECHAJE';
  ELSE etapa1 := 'CUARTOS';
  END IF;

  -- Bracket estable
  IF p_cupos = 2 THEN
    a := ARRAY[1]; b := ARRAY[2];

  ELSIF p_cupos = 4 THEN
    a := ARRAY[1,2]; b := ARRAY[4,3]; -- 1v4, 2v3

  ELSIF p_cupos = 6 THEN
    a := ARRAY[3,4]; b := ARRAY[6,5]; -- Repechaje: 3v6, 4v5 (1 y 2 BYE)

  ELSE
    a := ARRAY[1,4,2,3]; b := ARRAY[8,5,7,6]; -- Cuartos: 1v8, 4v5, 2v7, 3v6
  END IF;

  -- Crear partidos ronda 1 (placeholder de fecha/hora)
  FOR i IN 1..array_length(a,1) LOOP
    local_team := equipos[a[i]];
    visitante_team := equipos[b[i]];

    INSERT INTO public.partidos
      (torneo_id, local_id, visitante_id, fase, ronda, llave, etapa, finalizado,
       fecha, hora, fecha_hora)
    VALUES
      (p_torneo_id, local_team, visitante_team, 'LIGUILLA', 1, i, etapa1, false,
       current_date, now()::time, now())
    RETURNING id INTO partido_id;

    PERFORM public.fn_ensure_marcador(p_torneo_id, partido_id);
  END LOOP;

  UPDATE public.torneos
  SET fase_actual = 'LIGUILLA',
      cupos_liguilla = p_cupos,
      campeon_id = NULL,
      subcampeon_id = NULL
  WHERE id = p_torneo_id;
END;
$function$;
-- ============================================
-- FUNCIÓN: recalcular_estadistica_jugador
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_estadistica_jugador(p_torneo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_torneo IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.torneos WHERE id = p_torneo) THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('estadistica_jugador:' || p_torneo::text));

  DELETE FROM public.estadistica_jugador WHERE torneo_id = p_torneo;

  INSERT INTO public.estadistica_jugador (torneo_id, jugador_id, equipo_id, goles, autogoles, amarillas, rojas, updated_at)
  SELECT
    j.torneo_id,
    j.id AS jugador_id,
    j.equipo_id,
    COALESCE(SUM(CASE WHEN p.id IS NOT NULL AND ep.tipo_evento = 'GOL' THEN 1 ELSE 0 END), 0) AS goles,
    COALESCE(SUM(CASE WHEN p.id IS NOT NULL AND ep.tipo_evento = 'AUTOGOL' THEN 1 ELSE 0 END), 0) AS autogoles,
    COALESCE(SUM(CASE WHEN p.id IS NOT NULL AND ep.tipo_evento = 'AMARILLA' THEN 1 ELSE 0 END), 0) AS amarillas,
    COALESCE(SUM(CASE WHEN p.id IS NOT NULL AND ep.tipo_evento = 'ROJA' THEN 1 ELSE 0 END), 0) AS rojas,
    now()
  FROM public.jugadores j
  LEFT JOIN public.eventos_partido ep
    ON ep.jugador_id = j.id
   AND ep.torneo_id = j.torneo_id
  LEFT JOIN public.partidos p
    ON p.id = ep.partido_id
   AND p.finalizado = true
   AND COALESCE(p.tipo_partido,'OFICIAL') = 'OFICIAL'
  WHERE j.torneo_id = p_torneo
  GROUP BY j.torneo_id, j.id, j.equipo_id;

END;
$function$;
-- ============================================
-- FUNCIÓN: recalcular_marcador_partido
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_marcador_partido(p_partido uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_torneo uuid;
  v_local uuid;
  v_visitante uuid;
  gl int;
  gv int;
BEGIN
  SELECT torneo_id, local_id, visitante_id
    INTO v_torneo, v_local, v_visitante
  FROM partidos
  WHERE id = p_partido;

  IF v_torneo IS NULL THEN
    RETURN;
  END IF;

  -- AUTOGOL (opción A):
  -- - AUTOGOL con equipo_id = visitante => suma al local
  -- - AUTOGOL con equipo_id = local => suma al visitante
  SELECT
    COALESCE(SUM(CASE
      WHEN ep.tipo_evento = 'GOL' AND ep.equipo_id = v_local THEN 1
      WHEN ep.tipo_evento = 'AUTOGOL' AND ep.equipo_id = v_visitante THEN 1
      ELSE 0
    END), 0),
    COALESCE(SUM(CASE
      WHEN ep.tipo_evento = 'GOL' AND ep.equipo_id = v_visitante THEN 1
      WHEN ep.tipo_evento = 'AUTOGOL' AND ep.equipo_id = v_local THEN 1
      ELSE 0
    END), 0)
  INTO gl, gv
  FROM eventos_partido ep
  WHERE ep.partido_id = p_partido
    AND ep.tipo_evento IN ('GOL','AUTOGOL');

  INSERT INTO marcadores_partido(partido_id, torneo_id, goles_local, goles_visitante, updated_at)
  VALUES (p_partido, v_torneo, gl, gv, now())
  ON CONFLICT (partido_id)
  DO UPDATE SET
    goles_local = EXCLUDED.goles_local,
    goles_visitante = EXCLUDED.goles_visitante,
    updated_at = now();
END;
$function$;
-- ============================================
-- FUNCIÓN: recalcular_posiciones
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_posiciones(p_torneo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_torneo IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.torneos WHERE id = p_torneo) THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('posiciones:' || p_torneo::text));

  DELETE FROM public.posiciones WHERE torneo_id = p_torneo;

  WITH m AS (
    SELECT p.id, p.torneo_id, p.local_id, p.visitante_id, mp.goles_local, mp.goles_visitante
    FROM public.partidos p
    LEFT JOIN public.marcadores_partido mp ON mp.partido_id = p.id
    WHERE p.torneo_id = p_torneo
      AND p.finalizado = true
      AND COALESCE(p.tipo_partido,'OFICIAL') = 'OFICIAL'
      AND COALESCE(p.fase,'LIGA') = 'LIGA'
  ),
  per_team AS (
    SELECT
      local_id AS equipo_id,
      1 AS pj,
      CASE WHEN COALESCE(goles_local,0) > COALESCE(goles_visitante,0) THEN 1 ELSE 0 END AS pg,
      CASE WHEN COALESCE(goles_local,0) = COALESCE(goles_visitante,0) THEN 1 ELSE 0 END AS pe,
      CASE WHEN COALESCE(goles_local,0) < COALESCE(goles_visitante,0) THEN 1 ELSE 0 END AS pp,
      COALESCE(goles_local,0) AS gf,
      COALESCE(goles_visitante,0) AS gc
    FROM m
    UNION ALL
    SELECT
      visitante_id AS equipo_id,
      1 AS pj,
      CASE WHEN COALESCE(goles_visitante,0) > COALESCE(goles_local,0) THEN 1 ELSE 0 END AS pg,
      CASE WHEN COALESCE(goles_visitante,0) = COALESCE(goles_local,0) THEN 1 ELSE 0 END AS pe,
      CASE WHEN COALESCE(goles_visitante,0) < COALESCE(goles_local,0) THEN 1 ELSE 0 END AS pp,
      COALESCE(goles_visitante,0) AS gf,
      COALESCE(goles_local,0) AS gc
    FROM m
  ),
  agg AS (
    SELECT
      equipo_id,
      COALESCE(SUM(pj),0) pj,
      COALESCE(SUM(pg),0) pg,
      COALESCE(SUM(pe),0) pe,
      COALESCE(SUM(pp),0) pp,
      COALESCE(SUM(gf),0) gf,
      COALESCE(SUM(gc),0) gc
    FROM per_team
    GROUP BY equipo_id
  )
  INSERT INTO public.posiciones (torneo_id, equipo_id, pj, pg, pe, pp, gf, gc, dif, pts, updated_at)
  SELECT
    p_torneo,
    e.id,

    -- Base (partidos jugados) + Ajuste (pagados)
    COALESCE(a.pj,0) + COALESCE(adj.aj_pj,0) AS pj,
    COALESCE(a.pg,0) + COALESCE(adj.aj_pg,0) AS pg,
    COALESCE(a.pe,0) + COALESCE(adj.aj_pe,0) AS pe,
    COALESCE(a.pp,0) + COALESCE(adj.aj_pp,0) AS pp,

    COALESCE(a.gf,0) + COALESCE(adj.aj_gf,0) AS gf,
    COALESCE(a.gc,0) + COALESCE(adj.aj_gc,0) AS gc,

    (COALESCE(a.gf,0) + COALESCE(adj.aj_gf,0)) - (COALESCE(a.gc,0) + COALESCE(adj.aj_gc,0)) AS dif,
    ((COALESCE(a.pg,0) + COALESCE(adj.aj_pg,0)) * 3) + (COALESCE(a.pe,0) + COALESCE(adj.aj_pe,0)) AS pts,

    now()
  FROM public.equipos e
  LEFT JOIN agg a ON a.equipo_id = e.id
  LEFT JOIN public.posiciones_ajustes adj
    ON adj.torneo_id = p_torneo
   AND adj.equipo_id = e.id
  WHERE e.torneo_id = p_torneo;

END;
$function$;

-- ============================================
-- RPC: aplicar_equipo_pagado (jornadas pagadas)
-- ============================================
CREATE OR REPLACE FUNCTION public.aplicar_equipo_pagado(
  p_torneo uuid,
  p_equipo uuid,
  p_jornadas integer,
  p_gf_por integer DEFAULT 3,
  p_gc_por integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_j integer;
  v_gf_por integer;
  v_gc_por integer;
BEGIN
  IF p_torneo IS NULL OR p_equipo IS NULL THEN
    RETURN;
  END IF;

  v_j := COALESCE(p_jornadas, 0);
  IF v_j < 0 THEN v_j := 0; END IF;

  v_gf_por := COALESCE(p_gf_por, 3);
  IF v_gf_por < 0 THEN v_gf_por := 0; END IF;

  v_gc_por := COALESCE(p_gc_por, 0);
  IF v_gc_por < 0 THEN v_gc_por := 0; END IF;

  IF v_j = 0 THEN
    DELETE FROM public.posiciones_ajustes
    WHERE torneo_id = p_torneo AND equipo_id = p_equipo;
  ELSE
    INSERT INTO public.posiciones_ajustes (torneo_id, equipo_id, aj_pj, aj_pg, aj_pe, aj_pp, aj_gf, aj_gc, updated_at)
    VALUES (p_torneo, p_equipo, v_j, v_j, 0, 0, (v_j * v_gf_por), (v_j * v_gc_por), now())
    ON CONFLICT (torneo_id, equipo_id) DO UPDATE SET
      aj_pj = EXCLUDED.aj_pj,
      aj_pg = EXCLUDED.aj_pg,
      aj_pe = EXCLUDED.aj_pe,
      aj_pp = EXCLUDED.aj_pp,
      aj_gf = EXCLUDED.aj_gf,
      aj_gc = EXCLUDED.aj_gc,
      updated_at = now();
  END IF;

  PERFORM public.recalcular_posiciones(p_torneo);
END;
$function$;

-- ============================================
-- FUNCIÓN: recalcular_stats_jugador
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_stats_jugador(p_torneo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('stats_jugador:' || p_torneo::text));

  DELETE FROM stats_jugador WHERE torneo_id = p_torneo;

  INSERT INTO stats_jugador (torneo_id, jugador_id, equipo_id, goles, autogoles, amarillas, rojas, updated_at)
  SELECT
    j.torneo_id,
    j.id AS jugador_id,
    j.equipo_id,
    COALESCE(SUM(CASE WHEN ep.tipo_evento='GOL' THEN 1 ELSE 0 END), 0) AS goles,
    COALESCE(SUM(CASE WHEN ep.tipo_evento='AUTOGOL' THEN 1 ELSE 0 END), 0) AS autogoles,
    COALESCE(SUM(CASE WHEN ep.tipo_evento='AMARILLA' THEN 1 ELSE 0 END), 0) AS amarillas,
    COALESCE(SUM(CASE WHEN ep.tipo_evento='ROJA' THEN 1 ELSE 0 END), 0) AS rojas,
    now()
  FROM jugadores j
  LEFT JOIN eventos_partido ep
    ON ep.jugador_id = j.id
   AND ep.torneo_id = j.torneo_id
  LEFT JOIN partidos p
    ON p.id = ep.partido_id
   AND p.finalizado = true
  WHERE j.torneo_id = p_torneo
  GROUP BY j.torneo_id, j.id, j.equipo_id;
END;
$function$;
-- ============================================
-- FUNCIÓN: recalcular_torneo
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_torneo(p_torneo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('recalcular_torneo:' || p_torneo::text));

  FOR r IN SELECT id FROM partidos WHERE torneo_id = p_torneo LOOP
    PERFORM recalcular_marcador_partido(r.id);
  END LOOP;

  PERFORM recalcular_posiciones(p_torneo);
  PERFORM recalcular_stats_jugador(p_torneo);
END;
$function$;
-- ============================================
-- FUNCIÓN: set_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================
-- TRIGGER FN: insertar posición al crear equipo
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_equipos_insert_posicion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.posiciones (torneo_id, equipo_id, pj, pg, pe, pp, gf, gc, dif, pts, updated_at)
  VALUES (NEW.torneo_id, NEW.id, 0, 0, 0, 0, 0, 0, 0, 0, now())
  ON CONFLICT (torneo_id, equipo_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ============================================
-- FUNCIÓN: tg_eventos_partido_recalc
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_eventos_partido_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partido uuid;
  v_torneo uuid;
  v_finalizado boolean;
BEGIN
  v_partido := COALESCE(NEW.partido_id, OLD.partido_id);
  v_torneo := COALESCE(NEW.torneo_id, OLD.torneo_id);

  IF v_partido IS NULL OR v_torneo IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT finalizado INTO v_finalizado
  FROM partidos
  WHERE id = v_partido;

  PERFORM recalcular_marcador_partido(v_partido);

  IF COALESCE(v_finalizado, false) = true THEN
    PERFORM recalcular_posiciones(v_torneo);
    PERFORM recalcular_estadistica_jugador(v_torneo);
  END IF;

  RETURN NULL;
END;
$function$;
-- ============================================
-- FUNCIÓN: tg_partidos_recalc
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_partidos_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t_old uuid;
  t_new uuid;
BEGIN
  t_old := COALESCE(OLD.torneo_id, NULL);
  t_new := COALESCE(NEW.torneo_id, NULL);

  IF TG_OP = 'DELETE' THEN
    IF t_old IS NOT NULL AND EXISTS (SELECT 1 FROM public.torneos WHERE id = t_old) THEN
      PERFORM public.recalcular_posiciones(t_old);
      PERFORM public.recalcular_estadistica_jugador(t_old);
    END IF;
    RETURN NULL;
  END IF;

  PERFORM public.recalcular_marcador_partido(NEW.id);

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.finalizado, false) = true
       AND t_new IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.torneos WHERE id = t_new) THEN
      PERFORM public.recalcular_posiciones(t_new);
      PERFORM public.recalcular_estadistica_jugador(t_new);
    END IF;
    RETURN NULL;
  END IF;

  IF (OLD.finalizado IS DISTINCT FROM NEW.finalizado)
     OR (OLD.local_id IS DISTINCT FROM NEW.local_id)
     OR (OLD.visitante_id IS DISTINCT FROM NEW.visitante_id) THEN
    IF t_new IS NOT NULL AND EXISTS (SELECT 1 FROM public.torneos WHERE id = t_new) THEN
      PERFORM public.recalcular_posiciones(t_new);
      PERFORM public.recalcular_estadistica_jugador(t_new);
    END IF;
  END IF;

  RETURN NULL;
END;
$function$;
create or replace function public.fn_torneo_snapshot(p_torneo_id uuid)
returns jsonb
language sql
stable
as $$
select jsonb_build_object(
  'generated_at', now(),

  'torneo', (
    select to_jsonb(t)
    from public.torneos t
    where t.id = p_torneo_id
  ),

  'equipos', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'torneo_id', e.torneo_id,
        'nombre', e.nombre,
        'activo', e.activo
      )
      order by e.nombre asc
    )
    from public.equipos e
    where e.torneo_id = p_torneo_id
  ), '[]'::jsonb),

  -- 👇 posiciones con JOIN a equipos (ya lo tienes en la VIEW)
  'posiciones', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.pts desc, p.dif desc, p.gf desc)
    from public.v_posiciones_torneo p
    where p.torneo_id = p_torneo_id
  ), '[]'::jsonb),

  -- 👇 partidos + marcadores (incluye penales; tu v_marcadores_partido no los trae)
  'partidos', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'localId', p.local_id,
        'visitanteId', p.visitante_id,
        'local', el.nombre,
        'visitante', ev.nombre,
        'fecha', p.fecha,
        'hora', p.hora,
        'fechaHora', p.fecha_hora,
        'notas', p.notas,
        'ubicacion', jsonb_build_object('lat', p.ubicacion_lat, 'lng', p.ubicacion_lng),
        'finalizado', p.finalizado,
        'fase', coalesce(p.fase, 'LIGA'),
        'tipoPartido', coalesce(p.tipo_partido, 'OFICIAL'),
        'resultado',
          case
            when coalesce(p.finalizado,false) = true then
              jsonb_build_object(
                'golesLocal', coalesce(mp.goles_local, 0),
                'golesVisitante', coalesce(mp.goles_visitante, 0),
                'penalesLocal', coalesce(mp.penales_local, 0),
                'penalesVisitante', coalesce(mp.penales_visitante, 0)
              )
            else null
          end
      )
      order by p.fecha_hora asc
    )
    from public.partidos p
    join public.equipos el on el.id = p.local_id
    join public.equipos ev on ev.id = p.visitante_id
    left join public.marcadores_partido mp
      on mp.partido_id = p.id and mp.torneo_id = p.torneo_id
    where p.torneo_id = p_torneo_id
  ), '[]'::jsonb),

  'aviso', (
    select a.texto
    from public.avisos a
    where a.torneo_id = p_torneo_id and a.activo = true
    order by a.created_at desc
    limit 1
  ),

  'liguilla', coalesce((
  select jsonb_agg(to_jsonb(l) order by l.ronda asc, l.llave asc)
  from public.v_liguilla_partidos l
  where l.torneo_id = p_torneo_id
), '[]'::jsonb),

'top_goleadores', coalesce((
  select jsonb_agg(to_jsonb(s) order by s.goles desc, s.amarillas asc, s.rojas asc)
  from (
    select *
    from public.v_estadistica_jugador_torneo
    where torneo_id = p_torneo_id
    order by goles desc, amarillas asc, rojas asc
    limit 3
  ) s
), '[]'::jsonb),

'top_amarillas', coalesce((
  select jsonb_agg(to_jsonb(s) order by s.amarillas desc, s.goles desc)
  from (
    select *
    from public.v_estadistica_jugador_torneo
    where torneo_id = p_torneo_id
    order by amarillas desc, goles desc
    limit 3
  ) s
), '[]'::jsonb),

  'top_rojas', coalesce((
  select jsonb_agg(to_jsonb(s) order by s.rojas desc, s.amarillas desc)
  from (
    select *
    from public.v_estadistica_jugador_torneo
    where torneo_id = p_torneo_id
    order by rojas desc, amarillas desc
    limit 3
  ) s
), '[]'::jsonb)
);
$$;
-- ============================================
-- 8) GRANTS (permisos)
-- ============================================

-- Permisos para usarlo desde el navegador con la key pública
grant execute on function public.fn_torneo_snapshot(uuid) to anon, authenticated;

-- ============================================
-- 9) TRIGGERS (DROP -> CREATE)
-- ============================================

-- ============================================
-- TRIGGERS para el esquema 'public'
-- ============================================

-- 1. Trigger para avisos
DROP TRIGGER IF EXISTS trg_avisos_updated_at ON public.avisos;
-- 2. Trigger para equipos
DROP TRIGGER IF EXISTS trg_equipos_updated_at ON public.equipos;
-- 2b. Trigger para equipos - insertar posición (0) al crear
DROP TRIGGER IF EXISTS trg_equipos_insert_posicion ON public.equipos;
-- 3. Trigger para eventos_partido
DROP TRIGGER IF EXISTS tr_eventos_partido_recalc ON public.eventos_partido;
-- 4. Trigger para partidos - recalcular
DROP TRIGGER IF EXISTS tr_partidos_recalc ON public.partidos;
-- 5. Trigger para partidos - avanzar liguilla automáticamente
DROP TRIGGER IF EXISTS trg_auto_avanzar_liguilla ON public.partidos;
-- 6. Trigger para partidos - updated_at
DROP TRIGGER IF EXISTS trg_partidos_updated_at ON public.partidos;
-- 7. Trigger para partidos - validar penales en finalización
DROP TRIGGER IF EXISTS trg_validar_penales_finalizacion ON public.partidos;
-- 8. Trigger para publicidad
DROP TRIGGER IF EXISTS trg_publicidad_updated_at ON public.publicidad;
-- 9. Trigger para publicidad
-- 10. Trigger para torneos
DROP TRIGGER IF EXISTS trg_torneos_updated_at ON public.torneos;

CREATE TRIGGER trg_avisos_updated_at 
BEFORE UPDATE ON public.avisos 
FOR EACH ROW 
EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_equipos_updated_at 
BEFORE UPDATE ON public.equipos 
FOR EACH ROW 
EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_equipos_insert_posicion 
AFTER INSERT ON public.equipos 
FOR EACH ROW 
EXECUTE FUNCTION public.tg_equipos_insert_posicion();
CREATE TRIGGER tr_eventos_partido_recalc 
AFTER INSERT OR DELETE OR UPDATE ON public.eventos_partido 
FOR EACH ROW 
EXECUTE FUNCTION public.tg_eventos_partido_recalc();
CREATE TRIGGER tr_partidos_recalc 
AFTER INSERT OR DELETE OR UPDATE ON public.partidos 
FOR EACH ROW 
EXECUTE FUNCTION public.tg_partidos_recalc();
CREATE TRIGGER trg_auto_avanzar_liguilla 
AFTER UPDATE OF finalizado ON public.partidos 
FOR EACH ROW 
EXECUTE FUNCTION public.fn_trg_auto_avanzar_liguilla();
CREATE TRIGGER trg_partidos_updated_at 
BEFORE UPDATE ON public.partidos 
FOR EACH ROW 
EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_validar_penales_finalizacion 
BEFORE UPDATE OF finalizado ON public.partidos 
FOR EACH ROW 
EXECUTE FUNCTION public.fn_validar_penales_finalizacion();
CREATE TRIGGER trg_publicidad_updated_at 
BEFORE UPDATE ON public.publicidad 
FOR EACH ROW 
EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_torneos_updated_at 
BEFORE UPDATE ON public.torneos 
FOR EACH ROW 
EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- Inserta una Liga
-- ============================================
INSERT INTO public.torneos (nombre)
VALUES ('Liga Incial')

-- ============================================
-- 10) UTILIDADES (NO EJECUTAR - solo referencia)
-- ============================================

-- ----VISTAS
-- 
-- SELECT 
--     schemaname as esquema,
--     viewname as vista,
--     pg_get_viewdef((schemaname || '.' || viewname)::regclass, true) as definicion
-- FROM pg_catalog.pg_views 
-- WHERE schemaname ='public'
-- ORDER BY schemaname, viewname;

-- -------FUNCIONES
-- --FUNCIONES
-- --Como Obtener lAS Funciones
-- 
-- SELECT
--   n.nspname AS schema,
--   p.proname AS function_name,
--   pg_get_function_identity_arguments(p.oid) AS args,
--   pg_get_functiondef(p.oid) AS definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
-- ORDER BY function_name;

-- ----TRIGGER
-- --TRIGGER
-- --Como obtener los trigger
-- SELECT
--   n.nspname AS schema,
--   c.relname AS table_name,
--   t.tgname  AS trigger_name,
--   pg_get_triggerdef(t.oid, true) AS definition
-- FROM pg_trigger t
-- JOIN pg_class c      ON c.oid = t.tgrelid
-- JOIN pg_namespace n  ON n.oid = c.relnamespace
-- WHERE NOT t.tgisinternal
-- and n.nspname = 'public'
-- ORDER BY schema, table_name, trigger_name;

-- Nota: se removió un bloque huérfano que iniciaba con `RETURNS trigger` sin `CREATE FUNCTION` (duplicado de tg_partidos_recalc).
