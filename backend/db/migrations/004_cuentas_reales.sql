-- Cuentas reales: confirmación de correo, recuperación de contraseña e invitaciones con enlace de un solo uso.
-- Las invitaciones reemplazan a las claves temporales que se enviaban por correo.

-- Sin confirmar, la cuenta no puede ingresar. Las cuentas que ya existían ingresaban sin este paso: se dan por confirmadas.
alter table usuarios add column correo_verificado_en timestamptz;
update usuarios set correo_verificado_en = creado_en;

-- El enlace lleva el token en claro; la base guarda solo su SHA-256, igual que en las sesiones.
create table tokens_cuenta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios on delete cascade,
  tipo text not null check (tipo in ('verificacion', 'restablecer', 'invitacion')),
  token_hash bytea not null unique,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  usado_en timestamptz
);
create index tokens_cuenta_usuario_idx on tokens_cuenta (usuario_id, tipo, creado_en desc);
-- Como el resto de las tablas (003): sin políticas, la API REST pública de Supabase no la ve.
alter table tokens_cuenta enable row level security;

alter table correos drop constraint correos_tipo_check;
alter table correos add constraint correos_tipo_check
  check (tipo in ('bienvenida', 'verificacion', 'restablecer', 'cuenta_creada', 'cuenta_equipo', 'aprobacion', 'convenio', 'cobranza', 'privacidad', 'premio'));
