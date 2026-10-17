# Base de datos de PetSuite

PostgreSQL alojado en Supabase (proyecto `pet-suite-dat`, plan gratuito), creado desde el Marketplace de Vercel. El esquema está en `migrations/` y los datos demo salen del mismo seed que usa el mock del navegador.

## Configurar tu equipo

1. En Vercel, abre **Storage → pet-suite-dat**, pulsa **Show secret** y luego **Copy Snippet** en la pestaña `.env.local`.
2. Pega el snippet en un archivo `.env` en la raíz del proyecto y guárdalo. `.env` está en `.gitignore`: nunca lo subas.
3. Agrega al final dos líneas con los valores de dos variables del snippet. En ambas, cambia `sslmode=require` por `sslmode=no-verify`:

   ```
   DATABASE_URL_UNPOOLED=<valor de POSTGRES_URL_NON_POOLING>
   DATABASE_URL=<valor de POSTGRES_URL>
   ```

   - `DATABASE_URL_UNPOOLED` usa el pooler en modo sesión (puerto 5432). La usan las migraciones y el seed.
   - `DATABASE_URL` usa el pooler en modo transacción (puerto 6543). La usará el API.
   - `.env` no admite referencias como `$POSTGRES_URL`: pega el valor completo.
   - Supabase firma su certificado con una CA propia. Con `sslmode=require`, Node falla con `self-signed certificate in certificate chain`; `no-verify` mantiene el cifrado pero no verifica el certificado. En el paso del API se reemplazará por el certificado de Supabase.

## Comandos

```powershell
npm run db:migrate           # aplica las migraciones pendientes
npm run db:seed              # carga la demo en una base sin usuarios
npm run db:seed -- --reset   # BORRA todos los datos y vuelve a cargar la demo
```

- `--reset` vacía todas las tablas salvo `comunas`, `planes` y `schema_migrations`.
- La demo crea 11 cuentas con la clave `petsuite123`, cifrada con bcrypt.
- Las fechas de la demo son relativas al día en que se carga: suscripciones vigentes, ofertas y canjes del mes.

## Reglas para cambiar el esquema

- **No edites una migración ya aplicada.** El comando lo detecta por checksum y se detiene. Crea un archivo nuevo con el número siguiente (`004_...sql`).
- **Cada archivo corre en una transacción:** si falla, no queda a medias.
- **Toda tabla nueva debe activar RLS** (`alter table ... enable row level security`). Supabase publica el esquema `public` por su API REST con la clave pública; sin RLS, cualquiera podría leer y escribir esa tabla. `npm run db:migrate` muestra un AVISO si encuentra una tabla sin RLS.
  - PetSuite no usa esa API. El navegador habla solo con nuestro backend, que conecta como dueño de las tablas y no está sujeto a RLS.
- **Si cambia el modelo del mock** (`src/mock/db.ts`), agrega la migración correspondiente. Si un campo no tiene columna, `db:seed` falla y lo hace notar.
- **No crees tablas desde el Table Editor ni el SQL Editor de Supabase.** Quedarían fuera de las migraciones.

## Qué contiene

| Área | Tablas |
| --- | --- |
| Referencia | `comunas`, `planes` |
| Cuentas | `usuarios`, `sesiones`, `consentimientos`, `suspensiones` |
| Ficha Única y QR | `mascotas` (ficha en JSONB), `medallas`, `escaneos`, `mensajes_qr`, `accesos` |
| Pymes | `pymes`, `sucursales`, `miembros`, `contactos_pymes`, `items_catalogo`, `eventos_pyme` |
| Suscripciones | `suscripciones`, `pagos`, `casos_cobranza` |
| ONG | `ongs`, `animales`, `solicitudes_adopcion`, `eventos_adopcion` |
| Muro | `publicaciones`, `comentarios`, `reacciones`, `guardados`, `reportes` |
| Publicidad y convenios | `banners`, `convenios`, `premios_convenio`, `canjes` |
| Correo y privacidad | `correos`, `solicitudes_privacidad` |

### Diferencias con el mock (`src/mock/db.ts`)

| Mock | Base de datos |
| --- | --- |
| Clave en texto | `clave_hash` con bcrypt |
| Token de sesión | SHA-256 del token |
| Consentimientos y suspensión como campos del usuario | Tablas con historial |
| Objeto `oferta` en el ítem | Tres columnas: `oferta_precio_clp`, `oferta_desde`, `oferta_hasta` |
| Arreglo `premios` en el convenio | Tabla `premios_convenio` |
| `autor_id` en banners y `objeto_id` en reportes | Columnas separadas (`pyme_id`/`ong_id`, `publicacion_id`/`comentario_id`) que la base puede validar |

### Reglas que impone la propia base

- Una sola medalla activa por mascota.
- Correo único sin distinguir mayúsculas.
- La oferta debe ser menor al precio.
- Los permisos de equipo deben pertenecer a los módulos conocidos.
- Los eventos del muro llevan fecha.

## Plan gratuito de Supabase

El proyecto se pausa tras una semana sin uso. Mientras está pausado, el API no responde y el QR no abre la ficha. Se reactiva desde el panel de Supabase con **Restore project**. Antes de una presentación, revisa que esté activo.
