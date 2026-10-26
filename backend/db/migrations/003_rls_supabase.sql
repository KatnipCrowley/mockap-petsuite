-- Supabase publica el esquema public por su API REST con la clave pública. PetSuite no usa esa API:
-- el navegador habla solo con nuestro backend, que conecta como dueño de las tablas y no está sujeto a RLS.
-- Activar RLS sin políticas cierra las tablas para la API pública. Toda tabla nueva debe activarlo también
-- (npm run db:migrate avisa si alguna queda sin RLS).
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
