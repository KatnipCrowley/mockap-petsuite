-- PetSuite: esquema inicial en PostgreSQL. Traduce el modelo de src/mock/db.ts.
-- Convenciones: ids uuid; estados como text con CHECK (más fáciles de ampliar que un ENUM);
-- fechas de calendario (AAAA-MM-DD) como date y momentos como timestamptz.
-- Los datos de estructura variable (ficha clínica, horarios, perfil de ONG) van en JSONB.

-- ---------- Referencia ----------

create table comunas (
  id smallint primary key,
  nombre text not null unique
);

-- Límites y beneficios de cada plan siguen en src/modules/plans/plans.ts; aquí solo lo que
-- necesitan las suscripciones y los pagos para mantener la integridad.
create table planes (
  id smallint primary key,
  codigo text not null unique check (codigo in ('gratis', 'bronce', 'plata', 'oro')),
  nombre text not null,
  precio_mensual_clp integer not null check (precio_mensual_clp >= 0)
);

-- ---------- Cuentas ----------

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  clave_hash text not null,
  rol text not null check (rol in ('tutor', 'ong', 'pyme', 'jefe_local', 'clinico', 'asesor', 'admin')),
  nombre_visible text not null,
  comuna_id smallint references comunas,
  estado text not null default 'activo' check (estado in ('activo', 'suspendido', 'eliminado')),
  -- Derecho de bloqueo (Ley 21.719): se conservan los datos pero no se tratan.
  bloqueo_tratamiento boolean not null default false,
  creado_en timestamptz not null default now()
);
create unique index usuarios_correo_key on usuarios (lower(correo));

-- El cliente guarda el token en claro; la base solo su SHA-256, así una filtración no abre sesiones.
create table sesiones (
  token_hash bytea primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null
);
create index sesiones_usuario_idx on sesiones (usuario_id);

-- Historial de consentimientos (Ley 21.719): cada cambio es una fila nueva para poder demostrarlo.
-- El estado vigente de cada tipo es su fila más reciente.
create table consentimientos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  tipo text not null check (tipo in ('terminos', 'privacidad', 'comunicaciones', 'metricas')),
  otorgado boolean not null,
  version text not null,
  fecha timestamptz not null default now()
);
create index consentimientos_vigente_idx on consentimientos (usuario_id, tipo, fecha desc);

-- Historial de suspensiones. La vigente es la que no tiene levantada_en (a lo más una por usuario).
create table suspensiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios on delete cascade,
  tipo text not null check (tipo in ('temporal', 'permanente')),
  dias integer check (dias between 1 and 3650),
  hasta timestamptz,
  motivo text not null,
  mensaje text not null,
  aplicada_por uuid references usuarios,
  aplicada_en timestamptz not null default now(),
  levantada_en timestamptz,
  check ((tipo = 'temporal') = (dias is not null and hasta is not null))
);
create unique index suspensiones_vigente_key on suspensiones (usuario_id) where levantada_en is null;

-- ---------- Ficha Única y QR de emergencia ----------

create table mascotas (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references usuarios,
  nombre text not null,
  especie text not null,
  raza text,
  sexo text,
  fecha_nacimiento date,
  foto_url text,
  -- FichaDatos de src/shared/api.ts: condiciones, medicamentos, alergias, vacunas, tratamientos, atenciones...
  datos_clinicos jsonb not null default '{"condiciones":[],"medicamentos":[],"notaEmergencia":"","vacunas":[],"alergias":[],"tratamientos":[],"atenciones":[],"alertasCriticas":[]}'
    check (jsonb_typeof(datos_clinicos) = 'object'),
  -- Control optimista: una edición con versión antigua responde 409.
  ficha_version integer not null default 1 check (ficha_version > 0),
  creado_en timestamptz not null default now()
);
create index mascotas_tutor_idx on mascotas (tutor_id);

-- Medalla física: el QR solo lleva el token opaco, nunca datos de la ficha.
create table medallas (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references mascotas on delete cascade,
  token text not null unique,
  estado text not null default 'activa' check (estado in ('activa', 'inactiva', 'reemplazada')),
  emitida_en timestamptz not null default now()
);
create unique index medallas_una_activa_key on medallas (mascota_id) where estado = 'activa';

create table escaneos (
  id bigint generated always as identity primary key,
  medalla_id uuid not null references medallas on delete cascade,
  ocurrido_en timestamptz not null default now()
);
create index escaneos_medalla_idx on escaneos (medalla_id, ocurrido_en desc);

-- Aviso que deja quien encuentra a la mascota; el tutor lo lee sin exponer sus datos.
create table mensajes_qr (
  id uuid primary key default gen_random_uuid(),
  medalla_id uuid not null references medallas on delete cascade,
  remitente_nombre text,
  remitente_contacto text,
  mensaje text not null,
  latitud numeric(9, 6) check (latitud between -90 and 90),
  longitud numeric(9, 6) check (longitud between -180 and 180),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'leido', 'respondido')),
  enviado_en timestamptz not null default now()
);
create index mensajes_qr_medalla_idx on mensajes_qr (medalla_id, enviado_en desc);

-- ---------- Pymes (multitenant) ----------

create table pymes (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid not null references usuarios,
  nombre_comercial text not null,
  rut_empresa text not null unique,
  rubro text not null check (rubro in ('veterinaria', 'tienda', 'peluqueria', 'otro')),
  descripcion text,
  comuna_id smallint not null references comunas,
  direccion text,
  latitud numeric(9, 6) check (latitud between -90 and 90),
  longitud numeric(9, 6) check (longitud between -180 and 180),
  telefono text,
  whatsapp text,
  horario jsonb not null default '{}' check (jsonb_typeof(horario) = 'object'),
  servicios text[] not null default '{}',
  foto_portada text,
  estado_verificacion text not null default 'pendiente' check (estado_verificacion in ('pendiente', 'aprobada', 'rechazada', 'suspendida')),
  creado_en timestamptz not null default now()
);
create index pymes_propietario_idx on pymes (propietario_id);
create index pymes_directorio_idx on pymes (comuna_id, rubro) where estado_verificacion = 'aprobada';

-- Acceso temporal de una veterinaria a la ficha, otorgado por el tutor.
create table accesos (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references mascotas on delete cascade,
  pyme_id uuid not null references pymes on delete cascade,
  otorgado_por uuid not null references usuarios,
  permiso text not null check (permiso in ('lectura', 'escritura')),
  vigente_hasta timestamptz not null,
  revocado_en timestamptz
);
create index accesos_mascota_idx on accesos (mascota_id);
create index accesos_pyme_vigentes_idx on accesos (pyme_id, vigente_hasta) where revocado_en is null;

create table sucursales (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes on delete cascade,
  nombre text not null,
  comuna_id smallint not null references comunas,
  direccion text,
  latitud numeric(9, 6) check (latitud between -90 and 90),
  longitud numeric(9, 6) check (longitud between -180 and 180),
  telefono text,
  whatsapp text,
  horario jsonb not null default '{}' check (jsonb_typeof(horario) = 'object'),
  descripcion text,
  servicios text[] not null default '{}',
  creado_en timestamptz not null default now()
);
create index sucursales_pyme_idx on sucursales (pyme_id);

-- Equipo interno. sucursal_id null = casa matriz (también al eliminar su sucursal, como en el mock).
create table miembros (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes on delete cascade,
  usuario_id uuid not null references usuarios,
  rol text not null check (rol in ('jefe_local', 'clinico')),
  sucursal_id uuid references sucursales on delete set null,
  permisos text[] not null check (permisos <@ array['perfil', 'sucursales', 'catalogo', 'contactos', 'metricas', 'equipo', 'publicidad', 'convenios', 'suscripcion', 'pacientes']),
  creado_en timestamptz not null default now(),
  unique (pyme_id, usuario_id)
);
create index miembros_usuario_idx on miembros (usuario_id);

create table contactos_pymes (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes on delete cascade,
  remitente_id uuid not null references usuarios,
  remitente_nombre text not null,
  remitente_contacto text,
  mensaje text not null,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'leido', 'respondido')),
  respuesta text,
  creado_en timestamptz not null default now(),
  respondido_en timestamptz
);
create index contactos_pymes_pyme_idx on contactos_pymes (pyme_id, creado_en desc);
create index contactos_pymes_remitente_idx on contactos_pymes (remitente_id);

-- Catálogo referencial: no hay cobros dentro de la app. La oferta va completa o no va.
create table items_catalogo (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes on delete cascade,
  tipo text not null check (tipo in ('producto', 'servicio')),
  nombre text not null,
  descripcion text,
  precio_referencial_clp integer check (precio_referencial_clp >= 0),
  disponible boolean not null default true,
  categoria text,
  sin_stock boolean not null default false,
  oferta_precio_clp integer check (oferta_precio_clp >= 0),
  oferta_desde date,
  oferta_hasta date,
  creado_en timestamptz not null default now(),
  constraint items_catalogo_oferta_check check (
    (oferta_precio_clp is null and oferta_desde is null and oferta_hasta is null)
    or (oferta_precio_clp is not null and oferta_desde is not null and oferta_hasta is not null
        and oferta_desde <= oferta_hasta
        and (precio_referencial_clp is null or oferta_precio_clp < precio_referencial_clp))
  )
);
create index items_catalogo_pyme_idx on items_catalogo (pyme_id);

create table eventos_pyme (
  id bigint generated always as identity primary key,
  pyme_id uuid not null references pymes on delete cascade,
  item_id uuid references items_catalogo on delete set null,
  tipo text not null check (tipo in ('visita_perfil', 'vista_item', 'clic_contacto', 'clic_whatsapp')),
  ocurrido_en timestamptz not null default now()
);
create index eventos_pyme_idx on eventos_pyme (pyme_id, ocurrido_en desc);

-- ---------- Suscripciones y cobranza ----------

create table suscripciones (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes,
  plan_id smallint not null references planes,
  inicio date not null,
  fin date not null,
  estado text not null check (estado in ('pendiente', 'activa', 'vencida', 'cancelada')),
  check (fin >= inicio)
);
create index suscripciones_pyme_idx on suscripciones (pyme_id, fin desc);

-- Los pagos se conservan aunque se suprima la cuenta (obligación tributaria).
create table pagos (
  id uuid primary key default gen_random_uuid(),
  suscripcion_id uuid not null references suscripciones,
  monto_clp integer not null check (monto_clp >= 0),
  canal text not null check (canal in ('transferencia', 'orcob')),
  referencia text,
  codigo_orcob text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'rechazado')),
  pagado_en timestamptz not null default now()
);
create index pagos_suscripcion_idx on pagos (suscripcion_id);

-- Caso derivado a Orcob. datos_enviados guarda exactamente lo que salió de PetSuite (rendición de cuentas).
create table casos_cobranza (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes,
  id_caso text not null unique,
  monto_clp integer not null check (monto_clp >= 0),
  dias_mora integer not null check (dias_mora >= 0),
  datos_enviados jsonb not null,
  estado text not null default 'en_gestion' check (estado in ('en_gestion', 'pagado', 'cerrado')),
  derivado_por uuid not null references usuarios,
  derivado_en timestamptz not null default now(),
  cerrado_en timestamptz
);
create index casos_cobranza_pyme_idx on casos_cobranza (pyme_id);

-- ---------- ONG y adopciones ----------

create table ongs (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid not null references usuarios,
  nombre text not null,
  tipo text not null check (tipo in ('refugio', 'rescatista_independiente', 'agrupacion')),
  descripcion text,
  comuna_id smallint not null references comunas,
  contacto text,
  redes_sociales text,
  estado_verificacion text not null default 'pendiente' check (estado_verificacion in ('pendiente', 'aprobada', 'rechazada')),
  -- Perfil CMS (OngPerfil). Lo público es la última versión aprobada por el asesor.
  perfil_publicado jsonb check (perfil_publicado is null or jsonb_typeof(perfil_publicado) = 'object'),
  perfil_borrador jsonb check (perfil_borrador is null or jsonb_typeof(perfil_borrador) = 'object'),
  perfil_estado text not null default 'sin_enviar' check (perfil_estado in ('sin_enviar', 'en_revision', 'publicado', 'rechazado')),
  perfil_motivo text,
  creado_en timestamptz not null default now()
);
create index ongs_propietario_idx on ongs (propietario_id);

create table animales (
  id uuid primary key default gen_random_uuid(),
  ong_id uuid not null references ongs on delete cascade,
  nombre text not null,
  especie text not null,
  raza text,
  edad_estimada text,
  estado_salud text,
  historia text,
  historial_salud jsonb not null default '{"condiciones":[],"medicamentos":[],"notaEmergencia":"","vacunas":[],"alergias":[],"tratamientos":[],"atenciones":[],"alertasCriticas":[]}'
    check (jsonb_typeof(historial_salud) = 'object'),
  foto_url text,
  estado text not null default 'disponible' check (estado in ('disponible', 'en_proceso', 'adoptado')),
  -- Al concretarse la adopción, el historial pasa a una ficha del nuevo tutor.
  mascota_id uuid references mascotas on delete set null,
  publicado_en timestamptz not null default now()
);
create index animales_ong_idx on animales (ong_id);
create index animales_disponibles_idx on animales (publicado_en desc) where estado = 'disponible';

create table solicitudes_adopcion (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animales on delete cascade,
  solicitante_nombre text,
  solicitante_contacto text,
  mensaje text not null,
  estado text not null default 'nueva' check (estado in ('nueva', 'en_conversacion', 'concretada', 'cerrada')),
  creado_en timestamptz not null default now()
);
create index solicitudes_adopcion_animal_idx on solicitudes_adopcion (animal_id);

create table eventos_adopcion (
  id bigint generated always as identity primary key,
  animal_id uuid not null references animales on delete cascade,
  ocurrido_en timestamptz not null default now()
);
create index eventos_adopcion_animal_idx on eventos_adopcion (animal_id, ocurrido_en desc);

-- ---------- Muro comunal y moderación ----------

create table publicaciones (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references usuarios,
  comuna_id smallint not null references comunas,
  mascota_id uuid references mascotas on delete set null,
  animal_id uuid references animales on delete set null,
  tipo text not null check (tipo in ('extravio', 'encuentro', 'recomendacion', 'alerta', 'evento', 'adopcion')),
  texto text not null,
  -- Sector aproximado, nunca la dirección exacta.
  sector text,
  foto_url text,
  fecha_evento date,
  resuelto_en timestamptz,
  editado_en timestamptz,
  estado text not null default 'publicada' check (estado in ('publicada', 'oculta', 'eliminada')),
  creado_en timestamptz not null default now(),
  check (tipo <> 'evento' or fecha_evento is not null)
);
create index publicaciones_muro_idx on publicaciones (comuna_id, creado_en desc) where estado = 'publicada';
create index publicaciones_autor_idx on publicaciones (autor_id);

create table comentarios (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references usuarios,
  publicacion_id uuid not null references publicaciones on delete cascade,
  texto text not null,
  estado text not null default 'visible' check (estado in ('visible', 'oculto', 'eliminado')),
  editado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index comentarios_publicacion_idx on comentarios (publicacion_id, creado_en);

create table reacciones (
  publicacion_id uuid not null references publicaciones on delete cascade,
  usuario_id uuid not null references usuarios on delete cascade,
  primary key (publicacion_id, usuario_id)
);

create table guardados (
  publicacion_id uuid not null references publicaciones on delete cascade,
  usuario_id uuid not null references usuarios on delete cascade,
  primary key (publicacion_id, usuario_id)
);
create index guardados_usuario_idx on guardados (usuario_id);

-- Un reporte apunta a una publicación o a un comentario, nunca a ambos.
create table reportes (
  id uuid primary key default gen_random_uuid(),
  reportante_id uuid not null references usuarios,
  objeto_tipo text not null check (objeto_tipo in ('publicacion', 'comentario')),
  publicacion_id uuid references publicaciones on delete cascade,
  comentario_id uuid references comentarios on delete cascade,
  motivo text not null,
  estado text not null default 'abierto' check (estado in ('abierto', 'resuelto_ocultado', 'resuelto_mantenido')),
  creado_en timestamptz not null default now(),
  check (
    (objeto_tipo = 'publicacion' and publicacion_id is not null and comentario_id is null)
    or (objeto_tipo = 'comentario' and comentario_id is not null and publicacion_id is null)
  )
);
create index reportes_abiertos_idx on reportes (creado_en) where estado = 'abierto';

-- ---------- Publicidad y convenios ----------

-- Banner sin imágenes: lo publica una Pyme o una ONG y siempre lo aprueba el asesor.
create table banners (
  id uuid primary key default gen_random_uuid(),
  autor_tipo text not null check (autor_tipo in ('pyme', 'ong')),
  pyme_id uuid references pymes on delete cascade,
  ong_id uuid references ongs on delete cascade,
  titulo text not null,
  texto text not null,
  destino text not null check (destino in ('perfil', 'adopciones', 'convenio')),
  ubicacion text not null check (ubicacion in ('inicio', 'directorio', 'muro')),
  comuna_id smallint references comunas,
  tono text not null check (tono in ('acento', 'calido', 'info')),
  desde date not null,
  hasta date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado', 'retirado')),
  motivo text,
  revisado_por uuid references usuarios,
  impresiones integer not null default 0 check (impresiones >= 0),
  clics integer not null default 0 check (clics >= 0),
  creado_en timestamptz not null default now(),
  check (desde <= hasta),
  check ((autor_tipo = 'pyme' and pyme_id is not null and ong_id is null) or (autor_tipo = 'ong' and ong_id is not null and pyme_id is null))
);
create index banners_vigentes_idx on banners (ubicacion, desde, hasta) where estado = 'aprobado';

create table convenios (
  id uuid primary key default gen_random_uuid(),
  pyme_id uuid not null references pymes,
  ong_id uuid not null references ongs,
  titulo text not null,
  descuento_pct smallint not null check (descuento_pct between 5 and 50),
  condiciones text not null,
  codigo text not null,
  desde date not null,
  hasta date not null,
  meta_mensual integer not null default 100 check (meta_mensual between 10 and 1000),
  premio text not null,
  estado text not null default 'pendiente_ong' check (estado in ('pendiente_ong', 'pendiente_asesor', 'activo', 'rechazado', 'finalizado')),
  motivo text,
  creado_en timestamptz not null default now(),
  check (desde <= hasta)
);
create unique index convenios_codigo_key on convenios (upper(codigo));
create index convenios_pyme_idx on convenios (pyme_id);
create index convenios_ong_idx on convenios (ong_id);

-- Premio mensual por cumplir la meta de canjes: a lo más uno por convenio y mes (AAAA-MM).
create table premios_convenio (
  convenio_id uuid not null references convenios on delete cascade,
  mes char(7) not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  otorgado_en timestamptz not null default now(),
  primary key (convenio_id, mes)
);

create table canjes (
  id uuid primary key default gen_random_uuid(),
  convenio_id uuid not null references convenios,
  sucursal_id uuid references sucursales on delete set null,
  monto_clp integer check (monto_clp between 0 and 100000000),
  registrado_por uuid not null references usuarios,
  ocurrido_en timestamptz not null default now()
);
create index canjes_convenio_idx on canjes (convenio_id, ocurrido_en desc);

-- ---------- Correo y privacidad ----------

-- Bandeja de salida: hasta tener un proveedor de correo, los mensajes quedan registrados aquí.
create table correos (
  id uuid primary key default gen_random_uuid(),
  para text not null,
  asunto text not null,
  cuerpo text not null,
  tipo text not null check (tipo in ('bienvenida', 'cuenta_creada', 'cuenta_equipo', 'aprobacion', 'convenio', 'cobranza', 'privacidad', 'premio')),
  enviado_en timestamptz not null default now()
);
create index correos_para_idx on correos (lower(para), enviado_en desc);

-- Derechos ARSOPOL (Ley 21.719) con plazo legal de respuesta de 30 días.
create table solicitudes_privacidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios,
  derecho text not null check (derecho in ('acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo')),
  detalle text not null,
  estado text not null default 'recibida' check (estado in ('recibida', 'en_proceso', 'respondida', 'rechazada')),
  respuesta text,
  creado_en timestamptz not null default now(),
  vence_en date not null,
  respondido_en timestamptz
);
create index solicitudes_privacidad_vence_idx on solicitudes_privacidad (vence_en) where estado in ('recibida', 'en_proceso');
