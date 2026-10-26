# API de PetSuite

Este servidor Node 24 expone en `/api/v1` el mismo contrato que `src/mock/server.ts` (rutas, validaciones, mensajes y forma de las respuestas). Con él, un QR con token opaco se abre desde otro teléfono, el visitante deja un aviso, el tutor lo ve en su bandeja y reemplazar o desactivar la medalla invalida el código anterior.

## Origen de los datos

| `.env` | Datos |
| --- | --- |
| Con `DATABASE_URL` | PostgreSQL en Supabase, mediante las rutas de `backend/api/`. Ver `backend/db/README.md` para configurar la base. |
| Sin `DATABASE_URL` | El mock del navegador, con el estado guardado en `data/petsuite.json`. |

`npm run api:start` lee `.env` si existe y muestra al iniciar qué datos usa.

## Cómo está hecho el API sobre PostgreSQL

- Cada solicitud corre en una transacción: si la ruta falla, no queda nada a medias.
- Las sesiones se guardan en la tabla `sesiones` como SHA-256 del token, con 30 días de vigencia. Las claves se verifican con bcrypt.
- Las reglas de negocio reutilizan lo compartido con el frontend: validaciones Zod de `src/shared/validators.ts`, planes de `src/modules/plans/plans.ts` y permisos de `src/shared/permissions.ts`.
- **Paridad con el mock.** `backend/api/paridad.test.mjs` corre los mismos guiones contra el mock y contra una base PGlite (PostgreSQL en memoria) con los mismos datos, y exige respuestas idénticas.
  - Una prueba de cobertura falla si alguna ruta queda sin guion.
  - Si cambias una regla, cámbiala en `src/mock` y en `backend/api`. La prueba indica el paso exacto que difiere.

Pruebas: `npm test` ejecuta las del mock, las del servidor HTTP (con archivo y con PGlite) y las de paridad. No necesita Supabase ni Docker.

## Probar en la misma computadora

Desde la raíz del proyecto, en una terminal:

```powershell
npm run api:start
```

En otra terminal configura el frontend antes de iniciar Vite:

```powershell
$env:VITE_API_URL = 'http://127.0.0.1:3000/api/v1'
npm run dev
```

Para abrirlo desde otro teléfono o desde GitHub Pages, el servidor debe estar publicado en una dirección alcanzable por ambos dispositivos. La compilación del frontend debe usar `VITE_API_URL=https://TU_API/api/v1` y el backend debe permitir el origen del sitio con `PETSUITE_CORS_ORIGINS`. GitHub Pages requiere que la API use HTTPS.

Para probarlo dentro de una red privada, configura en la terminal del servidor `HOST=0.0.0.0`, `PETSUITE_ALLOW_DEMO_API=1` y `PETSUITE_CORS_ORIGINS` con el origen exacto del frontend. `PORT` cambia el puerto (predeterminado: `3000`). `PETSUITE_DATA_FILE` cambia el archivo de datos (predeterminado: `data/petsuite.json`); conserva ese archivo en un volumen persistente y ejecuta **una sola instancia** del servidor.

Por ejemplo, si la computadora tiene la IP `192.168.1.10`, en la terminal del API:

```powershell
$env:HOST = '0.0.0.0'
$env:PETSUITE_ALLOW_DEMO_API = '1'
$env:PETSUITE_CORS_ORIGINS = 'http://192.168.1.10:5173'
npm run api:start
```

En la terminal del frontend:

```powershell
$env:VITE_API_URL = 'http://192.168.1.10:3000/api/v1'
npm run dev -- --host 0.0.0.0
```

Abre `http://192.168.1.10:5173` en ambos dispositivos. La URL del API debe usar la IP de la computadora, nunca `127.0.0.1` en el teléfono.

El servidor reutiliza las cuentas y contraseñas conocidas de la demostración. `PETSUITE_ALLOW_DEMO_API=1` habilita explícitamente su acceso desde la red; esta versión sirve para probar el flujo compartido, no para alojar cuentas reales. El archivo `data/` queda fuera de Git.

Antes de alojar cuentas reales faltan:

- cambiar las claves demo;
- reemplazar las claves temporales del correo simulado por un enlace de activación;
- verificar el certificado TLS de Supabase en lugar de `sslmode=no-verify`.

Verificación local: `npm test`.
