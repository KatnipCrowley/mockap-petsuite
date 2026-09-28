# API compartida de PetSuite (demostración)

Este servidor Node 24 expone el mismo contrato que `src/mock/server.ts` en `/api/v1`. A diferencia del mock del navegador, guarda los datos en un archivo del servidor: un QR con token opaco se abre desde otro teléfono, el visitante puede dejar un aviso, el tutor lo ve en su bandeja y reemplazar/desactivar la medalla invalida el código anterior.

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

El servidor reutiliza las cuentas y contraseñas conocidas de la demostración. `PETSUITE_ALLOW_DEMO_API=1` habilita explícitamente su acceso desde la red; esta versión sirve para probar el flujo compartido, no para alojar cuentas reales. Para producción hacen falta autenticación y almacenamiento de credenciales adecuados y una infraestructura persistente. El archivo `data/` queda fuera de Git.

Verificación local: `node --test backend/server.test.mjs`.
