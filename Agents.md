# PetSuite — Bitácora de Cambios

Este archivo registra cada cambio o agregado realizado en el proyecto a partir del 16 de septiembre de 2026.

## Principio rector del producto

La idea principal de PetSuite es crear una plataforma digital para centralizar el cuidado y la seguridad de las mascotas.

Su núcleo es una Ficha Única de Salud vinculada a un código QR. Si una mascota se pierde o tiene una emergencia, cualquier persona puede escanear el QR y consultar información crítica, como alergias o condiciones médicas, además de contactar al tutor sin acceder a sus datos privados.

El proyecto también integra:

- Gestión de mascotas e historial médico.
- Directorio de veterinarias, tiendas y peluquerías.
- Muro comunal para extravíos, encuentros y recomendaciones.
- Catálogo y métricas para Pymes.
- Administración y moderación de la plataforma.

En resumen: PetSuite conecta tutores, mascotas, negocios veterinarios y comunidad en un solo lugar, priorizando la seguridad mediante el QR de emergencia.

Este principio debe considerarse antes de cualquier decisión de arquitectura, frontend, diseño visual, datos, validaciones o nuevas funcionalidades.

## Regla de trabajo

Antes de finalizar cualquier cambio, se debe agregar una entrada con:

- Fecha.
- Archivos modificados o agregados.
- Cambio realizado.
- Motivo.
- Verificación ejecutada.

## 2026-09-16

### Estado inicial de seguimiento

- Archivos principales existentes: `src/App.tsx`, `src/styles.css`, `src/types.ts`, `src/validators.ts`.
- Funcionalidades existentes: autenticación demo, tutor, mascotas, QR, directorio, muro comunal, configuración, roles demo, paneles Pyme/clínico/admin y PWA básica.
- Verificación de referencia: `npm run build` ejecutado correctamente.

### Solicitud incorporada

- Se establece `Agents.md` como bitácora obligatoria para cambios y agregados futuros.

## 2026-09-16

### Separación de roles clínico y Pyme

- Archivos modificados: `src/App.tsx`.
- Cambio realizado: se diferenciaron las etiquetas de rol del perfil para tutor, administrador de Pyme, personal clínico veterinario y administrador de plataforma. Se mantuvieron separados los flujos y dashboards clínicos y comerciales.
- Motivo: evitar confundir al personal veterinario con las funciones administrativas de una Pyme.
- Verificación ejecutada: `npm run build` ejecutado correctamente.

## 2026-09-16

### Pymes como tiendas de productos y pedidos

- Archivos modificados: `src/App.tsx`, `src/types.ts`, `src/styles.css`.
- Cambio realizado: se orientó el Directorio a tiendas de productos para mascotas, se agregaron productos mock de alimentos, accesorios, higiene y salud, carrito de compra, solicitud de pedido con retiro o despacho y bandeja Pyme para actualizar estados del pedido.
- Motivo: representar correctamente el modelo comercial de PetSuite como distribución y venta de productos para mascotas.
- Verificación ejecutada: `npm run build` ejecutado correctamente.

## 2026-09-16

### Principio rector del producto agregado

- Archivos modificados: `Agents.md`.
- Cambio realizado: se agregó como principio principal la definición de PetSuite, su núcleo basado en la Ficha Única de Salud con QR de emergencia y sus módulos complementarios.
- Motivo: asegurar que toda decisión futura mantenga el propósito central del producto.
- Verificación ejecutada: revisión del contenido actualizado de `Agents.md`.

## 2026-09-16

### Administración de usuarios mejorada

- Archivos modificados: `src/App.tsx`, `src/styles.css`.
- Cambio realizado: se agregó buscador de usuarios, pestañas por estado, lista administrativa visual, suspensión personalizada o permanente mediante tarjeta de confirmación y reactivación de cuentas.
- Motivo: mejorar el control administrativo de usuarios y hacer más clara la moderación de cuentas reportadas o activas.
- Verificación ejecutada: `npm run build` ejecutado correctamente.

## 2026-09-23

### Identidad de suite y jerarquía visual

- Archivos modificados: `src/App.tsx`, `src/styles.css`, `package.json`, `package-lock.json`, `Agents.md`.
- Cambio realizado: se sustituyó la identidad clínica de la cuenta Pyme por una tienda con catálogo de productos; se ajustó el acceso y la portada para destacar el QR de emergencia, las mascotas y la comunidad. Se incorporaron iconos Lucide a la navegación y vistas principales, separadores estructurales y enlaces funcionales desde Inicio.
- Motivo: representar PetSuite como plataforma de herramientas para mascotas, sin confundir el rol comercial con el clínico, y mejorar la legibilidad de las vistas sin usar caracteres decorativos como iconos.
- Verificación ejecutada: `npm run build` y `git diff --check` correctamente.

### Revisión de composición y legibilidad de las cinco vistas de tutor

- Archivos modificados: `src/App.tsx`, `src/styles.css`, `Agents.md`.
- Cambio realizado: se sustituyó el fondo rosado general por una paleta neutra con paneles contrastados, navegación oscura fija, encabezados y textos más legibles. Inicio y mascotas ahora agrupan sus fichas en paneles; directorio separa resultados y mapa; comunidad aprovecha el ancho en columnas y configuración tiene navegación y formulario en superficies independientes. Se ajustó la presentación móvil y el modo oscuro, y se cambiaron los tonos coral y ámbar de bajo contraste.
- Motivo: corregir la falta de jerarquía, separación, contraste y densidad que impedía leer y distinguir las herramientas de PetSuite.
- Verificación ejecutada: `npm run build`, `git diff --check` y cálculo de contraste de los pares de texto principales (mínimo medido: 5,29:1).

### Paleta coherente en modo oscuro

- Archivos modificados: `src/styles.css`, `Agents.md`.
- Cambio realizado: se unificaron encabezado, tarjetas, campos y opciones de apariencia con las superficies azul verdosas del modo oscuro; el color elegido se conserva en botones y selecciones, con una versión aclarada para textos y contornos.
- Motivo: eliminar los fondos marrones heredados y evitar que el texto del acento desaparezca sobre superficies oscuras.
- Verificación ejecutada: `npm run build`, `git diff --check` y cálculo de contraste de los diez acentos aclarados sobre el panel oscuro (mínimo: 5,02:1).

### Acceso a cerrar sesión desde Perfil

- Archivos modificados: `src/App.tsx`, `src/styles.css`, `Agents.md`.
- Cambio realizado: se presenta la acción de cerrar sesión al visualizar Perfil y se oculta de Privacidad, manteniendo su posición bajo el formulario en pantallas grandes y pequeñas.
- Motivo: agrupar la salida de la cuenta junto a los datos de perfil y reservar Privacidad para opciones de visibilidad.
- Verificación ejecutada: `npm run build` y `git diff --check` correctamente.

### Paletas visibles y persistentes en Apariencia

- Archivos modificados: `src/App.tsx`, `src/styles.css`, `AGENTS.md`.
- Cambio realizado: se agregó la paleta Original azul verdosa como opción predeterminada, se corrigió la prioridad de los colores elegidos y se aplicó cada paleta a fondos, navegación y paneles destacados en claro y oscuro. La previsualización se restaura al salir sin guardar y conserva la selección al confirmar.
- Motivo: hacer que el cambio de paleta sea perceptible y que la configuración guardada se mantenga al navegar.
- Verificación ejecutada: `npm run build` y `git diff --check` correctamente.

### Corrección del color Original

- Archivos modificados: `src/App.tsx`, `src/styles.css`, `Agents.md`.
- Cambio realizado: la opción Original y su muestra pasan a rojo brillante; fondos, textos, navegación y paneles destacados acompañan el rojo en claro y oscuro en lugar de mantener la identidad verde anterior.
- Motivo: respetar el color original indicado por el usuario y diferenciarlo de Carmesí.
- Verificación ejecutada: `npm run build` y `git diff --check` correctamente.

### Bandeja de usuarios reportados

- Archivos modificados: `src/App.tsx`, `src/styles.css`, `Agents.md`.
- Cambio realizado: la vista de moderación de usuarios incluye resumen de pendientes, buscador, filas con identidad, rol y estado separados, acciones alineadas y un estado vacío diferenciado. Se conectó la confirmación de suspensión de esta bandeja a la actualización persistente de la cuenta.
- Motivo: hacer que la revisión de reportes tenga la jerarquía y claridad de las demás vistas administrativas y que sus acciones sean operativas.
- Verificación ejecutada: `npm run build` y `git diff --check` correctamente.

### Revisión contextual de reportes y medidas

- Archivos modificados o agregados: `src/App.tsx`, `src/moderation.ts`, `src/validators.ts`, `src/styles.css`, `Agents.md`.
- Cambio realizado: Resolver y Suspender abren modales con el motivo, el perfil o publicación afectada y mensajes de denunciantes. Se agregaron cierre, advertencia o solicitud de información; chat privado mock persistente; suspensión por días o baneo permanente; mensaje obligatorio validado con Zod, registro local de decisiones y conexión de reportes del muro con la bandeja.
- Motivo: dar contexto a cada decisión de moderación y permitir comunicar y registrar las medidas sin perder los reportes pendientes.
- Verificación ejecutada: `npm run build` y `git diff --check` correctamente.

## 2026-09-24

### Ficha única de salud y QR público portable

- Archivos modificados o agregados: `src/App.tsx`, `src/types.ts`, `src/validators.ts`, `src/publicQr.ts`, `src/publicQr.test.mjs`, `src/styles.css`, `public/sw.js`, `Agents.md`.
- Cambio realizado: las mascotas permiten editar datos básicos, alergias, condiciones, medicamentos y notas de emergencia; se agregó un historial privado de vacunas, atenciones y tratamientos. El tutor controla si puede generar el QR, previsualizar y compartir la ficha, descargar PNG e imprimirlo. El enlace QR lleva exclusivamente una instantánea validada de campos públicos, por lo que la ficha abre sin cuenta ni `localStorage` del tutor en otro dispositivo; enlaces inválidos no exponen la ficha privada. El formulario de contacto queda identificado como demo local, con sus mensajes visibles solo en el navegador donde se guardaron. Se renovó el caché PWA para no servir la aplicación antigua al abrir un QR.
- Motivo: completar el núcleo de salud y seguridad del producto sin confundir una simulación local con un sistema de contacto o revocación remota.
- Verificación ejecutada: `node --test src/publicQr.test.mjs` (3 pruebas), `npm run build` y `git diff --check` correctamente.

### Publicación del mockup en GitHub Pages

- Fecha: 2026-09-24.
- Archivos modificados o agregados: `.github/workflows/pages.yml`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/publicQr.ts`, `src/publicQr.test.mjs`, `public/manifest.webmanifest`, `public/sw.js`, `tsconfig.app.json`, `Agents.md`.
- Cambio realizado: se configuró la verificación de PR y el despliegue automático de `main` a GitHub Pages; se adaptaron recursos, PWA y enlaces QR a la subruta `/mockap-petsuite/`.
- Motivo: publicar el mockup sin romper la ficha pública de emergencia ni las rutas de la aplicación.
- Verificación ejecutada: `node --test src/publicQr.test.mjs` (4 pruebas), `npm run build -- --base=/mockap-petsuite/`, inspección de `dist/index.html` y `git diff --check` correctamente.

### Avisos de cambios y fallos de Pages en Discord

- Fecha: 2026-09-24.
- Archivos modificados o agregados: `.github/workflows/discord-notifications.yml`, `.github/scripts/notify-discord.mjs`, `Agents.md`.
- Cambio realizado: se agregaron avisos en Markdown sin embeds al grupo configurado mediante `DISCORD_TOKEN` (secret) y `DISCORD_CHANNEL` (variable) cuando hay pushes a `main` o falla una publicación de Pages en `main`; las menciones quedan desactivadas.
- Motivo: informar cambios y errores de despliegue en la conversación indicada sin incluir credenciales en el repositorio.
- Verificación ejecutada: `node --check .github/scripts/notify-discord.mjs` y `git diff --check` correctamente.

## 2026-09-27

### Frontend igual al prototipo, con capa de datos simulada sin base de datos

- Fecha: 2026-09-27.
- Archivos modificados o agregados: `src/api.ts`, `src/mock/db.ts`, `src/mock/server.ts` (nuevos); `src/App.tsx`, `src/Login.tsx`, `src/tutor.tsx`, `src/community.tsx`, `src/directory.tsx`, `src/business.tsx`, `src/clinical.tsx`, `src/admin.tsx`, `src/adoption.tsx`, `src/media.tsx`, `src/validators.ts`, `src/styles.css`, `src/design.css`, `src/design-pages.css`, `src/design-polish.css`, `src/main.tsx` (copiados del prototipo de `Escritorio/mockap-petsuite` y adaptados); `public/img/*` con `CREDITOS.md`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/manifest.webmanifest`, `public/sw.js`, `index.html`, `package.json`, `package-lock.json`, `.github/workflows/pages.yml`, `Agents.md`. Eliminados: `src/types.ts`, `src/moderation.ts`, `src/publicQr.ts`, `src/publicQr.test.mjs`.
- Cambio realizado: se reemplazó el frontend por el del prototipo (roles tutor, Pyme, clínico, ONG y admin; Ficha Única con QR de token opaco; directorio con Leaflet y catálogo referencial; muro por comuna; adopción pública; moderación y verificación). `api()` conserva la firma del cliente HTTP, pero delega en `mock/server.ts`, que implementa las rutas y reglas del API (RBAC, control de versión de la ficha con 409, lista blanca del QR, límites de plan, adopción con traspaso de la ficha), con latencia de 150 a 350 ms y persistencia en `localStorage` (`petsuite-mock-db-v1`). El estado se relee en cada llamada para que las pestañas no se pisen. Se agregó «Restablecer datos de demostración» en Configuración > Privacidad. Se eliminaron el carrito, los pedidos, la ficha incrustada en la URL del QR y la paleta roja anterior, según lo acordado con el usuario. Fotos, íconos y enlaces QR respetan la base de GitHub Pages (`import.meta.env.BASE_URL`). Además, la lista de mascotas del tutor se recarga al cambiar de vista y la barra lateral angosta (≤800 px) ya no desborda el texto.
- Motivo: dejar el frontend igual al prototipo de referencia mientras no hay servidor, de modo que conectar el API real solo requiera cambiar `src/api.ts`.
- Limitaciones declaradas: sin servidor, un QR solo se abre en el navegador donde se creó (en otro teléfono muestra «Medalla no válida»); no se incrustan datos en la URL para conservar la desactivación de medallas. No hay correo, notificaciones push ni carga de fotos, y el catálogo de adopción no es indexable. Las contraseñas demo se guardan sin cifrar en `localStorage`.
- Verificación ejecutada: `npx tsc -b` y `npm run build` con la base de Pages, correctos. Recorrido con Playwright (Chromium) contra `vite`: 8 de 8 flujos correctos y sin errores de consola (QR y aviso al tutor, reemplazo de medalla, acceso de escritura y registro clínico visto por el tutor, directorio sin carrito y métricas de la Pyme, publicación, reporte y ocultamiento, adopción de Canela traspasada a Diego con Óctuple, aprobación de Rescate Nuevo, tema y modo oscuro persistentes). Revisión visual a 390 px sin desplazamiento horizontal. `git diff --check` no se ejecutó porque `git` no está en el PATH de esta terminal.

## 2026-09-29

### Más funciones para clínicas, Pymes y muro comunal

- Fecha: 2026-09-29.
- Archivos modificados: `src/api.ts`, `src/mock/db.ts`, `src/mock/server.ts`, `src/App.tsx`, `src/business.tsx`, `src/clinical.tsx`, `src/tutor.tsx`, `src/community.tsx`, `src/directory.tsx`, `src/adoption.tsx`, `src/admin.tsx`, `src/design-polish.css`, `AGENTS.md`.
- Cambio realizado:
  - Clínicas: buscador y filtros de pacientes (con alertas, con registro, acceso por vencer). Los registros se crean con `POST /mascotas/:id/registros` y quedan firmados por la clínica. La clínica puede editar o anular solo los suyos: anular no borra, deja el registro tachado con el motivo. Las vacunas admiten próxima dosis. Nueva vista «Perfil de la clínica». El tutor ve quién hizo cada registro, no puede editar los clínicos y el servidor rechaza con 403 cualquier intento de alterarlos o firmar como clínica.
  - Pymes: edición completa de ítems con categoría, marca «sin stock» y oferta con precio y fechas (debe ser menor al precio referencial), además de filtro por categoría. Nueva vista «Perfil del negocio» (descripción, servicios destacados, contacto, horario de lunes a domingo y coordenadas; nombre, RUT y rubro siguen bajo verificación). Métricas comparadas con los 30 días anteriores y contacto por canal. Renovación o cambio de plan con referencia de transferencia: el nuevo periodo empieza al terminar el vigente y el administrador lo confirma o rechaza desde «Pymes y suscripciones». El directorio muestra servicios, ofertas vigentes con precio tachado, el filtro «Con ofertas» y la marca de sin stock.
  - Muro comunal: nuevos tipos «Alerta de salud», «Evento o campaña» (con fecha obligatoria) y «Adopción» (solo ONG verificadas, desde «Mis animales» > «Difundir en el muro», con acceso a Adopciones). Los extravíos llevan la foto de la mascota elegida y un sector sin dirección exacta, y se marcan como encontrados. Lo urgente (extravíos activos y alertas de la última semana) aparece primero. El autor edita y elimina sus publicaciones y comentarios. Se pueden reportar comentarios, que se moderan igual que las publicaciones. Hay buscador, orden por recientes o más apoyadas y publicaciones guardadas.
  - Accesibilidad y diseño: los botones del menú tienen nombre accesible aun cuando solo se ve el ícono (≤800 px). El buscador del directorio usa un ícono Lucide en lugar de un carácter. Los modales altos se desplazan en vez de quedar cortados, y el encabezado del muro se adapta a 390 px.
  - Datos de demostración: la clave de `localStorage` pasa a `petsuite-mock-db-v2` porque el modelo cambió; los datos v1 se descartan. El seed agrega categorías, una oferta vigente, servicios por negocio y publicaciones de cada tipo nuevo.
- Motivo: completar las herramientas de trabajo de clínicas y Pymes, y hacer del muro un canal útil para extravíos y alertas, respetando la privacidad del tutor, la trazabilidad de la Ficha Única y la ausencia de pagos dentro de la app.
- Verificación ejecutada: `npx tsc -b` y `npm run build` con la base de Pages, correctos. Recorrido con Playwright (Chromium): 14 de 14 flujos correctos, sin errores de consola (los 9 anteriores más: registro clínico editado, anulado y bloqueado para el tutor; oferta, sin stock y perfil reflejados en el directorio; cambio de plan confirmado por el administrador; extravío con foto, sector, edición, comentarios, encontrada, guardadas y búsqueda; comentario reportado y ocultado; animal difundido por la ONG). Revisión visual en escritorio y a 390 px sin desplazamiento horizontal. `git diff --check` no se ejecutó porque `git` no está en el PATH de esta terminal.
## 2026-09-28

### Perfil Pyme y consultas desde el directorio

- Fecha: 2026-09-28.
- Archivos modificados o agregados: `src/App.tsx`, `src/Login.tsx`, `src/api.ts`, `src/business.tsx`, `src/business-profile.tsx`, `src/business-contacts.tsx`, `src/business.test.mjs`, `src/clinical.tsx`, `src/community.tsx`, `src/directory.tsx`, `src/design-polish.css`, `src/mock/db.ts`, `src/mock/server.ts`, `src/tutor.tsx`, `src/validators.ts`, `.env.example`, `Agents.md`.
- Cambio realizado: la Pyme puede editar nombre, comuna, dirección, teléfono, WhatsApp, horarios, descripción y coordenadas mediante un mapa, además de elegir una portada de las imágenes demo. La ficha pública del directorio usa los datos editados. El tutor puede enviar consultas desde el directorio y revisar respuestas en «Mis consultas»; la Pyme dispone de una bandeja para leerlas y responder. Los contactos se persisten por usuario y negocio en el mock y se migran los datos demo antiguos. El catálogo permite editar ítems y confirma su eliminación. Se integraron esquemas Zod para los nuevos formularios y otros formularios principales. `src/api.ts` acepta opcionalmente `VITE_API_URL` para usar un API HTTP compartido sin alterar las pantallas; sin configurarlo sigue usando el mock.
- Motivo: completar las pantallas Pyme P3, P5 y P8 y preparar la siguiente integración del QR entre dispositivos manteniendo la identidad visual vigente.
- Verificación ejecutada: `node --test src/business.test.mjs` (3 pruebas de permisos, perfil, consultas y migración), `npm run build`, `npm run build -- --base=/mockap-petsuite/` y `git diff --check` correctamente. No se verificó el flujo visual en navegador en esta sesión.

### API HTTP compartida para probar QR entre dispositivos

- Fecha: 2026-09-28.
- Archivos modificados o agregados: `backend/server.mjs`, `backend/server.test.mjs`, `backend/README.md`, `package.json`, `.gitignore`, `.env.example`, `Agents.md`.
- Cambio realizado: se añadió un servidor Node 24 para las rutas `/api/v1` del mock, con datos persistidos en un archivo compartido fuera de Git, escritura atómica, límite de tamaño del cuerpo, control de origen CORS y acceso de red a las cuentas demo solo cuando se habilita expresamente. El frontend puede usarlo con `VITE_API_URL`; QR, avisos y desactivación de medallas funcionan desde clientes HTTP distintos cuando ambos alcanzan el mismo servidor.
- Motivo: permitir pruebas del flujo crítico QR y contacto entre dispositivos sin modificar el diseño ni incrustar información médica en la URL, manteniendo explícito que esta API comparte credenciales demo y no constituye autenticación de producción.
- Verificación ejecutada: `node --test backend/server.test.mjs` (lectura anónima del QR, contacto, revocación, CORS y persistencia al reiniciar), `node --check backend/server.mjs`, `npm run build -- --base=/mockap-petsuite/` y `git diff --check` correctamente.

### Suspensión administrativa con revisión de denuncias

- Fecha: 2026-09-28.
- Archivos modificados o agregados: `src/admin.tsx`, `src/admin-suspension.tsx`, `src/admin-suspension.test.mjs`, `src/design-polish.css`, `src/mock/db.ts`, `src/mock/server.ts`, `src/validators.ts`, `Agents.md`.
- Cambio realizado: Suspender desde Usuarios u Ocultar y suspender desde Moderación abre una tarjeta compartida con los antecedentes de las denuncias de las publicaciones del usuario, incluidos contenido, motivo, denunciante, fecha y estado. El administrador puede elegir motivos rápidos, suspensión temporal de 1 a 3650 días o permanente, redactar un mensaje obligatorio y confirmar expresamente la medida. El mock guarda el tipo, razón, mensaje y vencimiento; revoca sesiones, reactiva las suspensiones temporales al vencer y permite reactivar manualmente las permanentes. Desde Moderación oculta y resuelve la publicación denunciada en la misma operación. «Ver denuncias» ofrece acceso independiente al historial desde Usuarios.
- Motivo: facilitar decisiones informadas y registradas, sin suspender directamente desde la lista ni perder el contexto de los reportes.
- Verificación ejecutada: `node --test src/admin-suspension.test.mjs src/business.test.mjs backend/server.test.mjs` (6 pruebas), `npm run build -- --base=/mockap-petsuite/` y `git diff --check` correctamente. Sin revisión visual en navegador en esta sesión.

## 2026-10-12

### Reparación del merge de benja-1 con main

- Fecha: 2026-10-12.
- Archivos modificados: `src/App.tsx`, `src/admin.tsx`, `src/api.ts`, `src/business.tsx`, `src/business-profile.tsx`, `src/clinical.tsx`, `src/community.tsx`, `src/design-polish.css`, `src/directory.tsx`, `src/mock/db.ts`, `src/mock/server.ts`, `src/tutor.tsx`, `src/validators.ts`, `src/business.test.mjs`, `src/admin-suspension.test.mjs`, `backend/server.mjs`.
- Cambio realizado: el merge `d91b94b` dejó el proyecto sin compilar (55 errores TS). Se rehízo desde `fc428b8` + `8ff8940`, conservando lo del 29 de septiembre (ofertas, categorías, autoría clínica, muro completo) y lo del 28 (contactos, portada y mapa del perfil, suspensión, API HTTP). Hay un solo perfil de negocio (`business-profile.tsx`), que ahora incluye servicios destacados. Las pruebas importan `STORAGE_KEY` en vez de fijar la clave, y `backend/server.mjs` acepta cualquier versión `petsuite-mock-db-vN` (antes ignoraba la v2 y no persistía).
- Motivo: el código heredado no compilaba ni persistía en el API HTTP.
- Verificación ejecutada: `npx tsc -b` sin errores y las 6 pruebas existentes correctas.

### Modelo de negocio: suscripciones, multitenant, asesor, CMS de ONG, publicidad, convenios, Orcob y Ley 21.719

- Fecha: 2026-10-12.
- Archivos agregados: `src/plans.ts`, `src/permissions.ts`, `src/plans-ui.tsx`, `src/team.tsx`, `src/promotions.tsx`, `src/ong-profile.tsx`, `src/advisor.tsx`, `src/privacy.tsx`, `src/design-suite.css`, `src/mock/suite.ts`, `src/mock/orcob.ts`, `src/business-rules.test.mjs`, `docs/modelo-de-negocio.md`.
- Archivos modificados: `src/App.tsx`, `src/Login.tsx`, `src/api.ts`, `src/business.tsx`, `src/business-profile.tsx`, `src/clinical.tsx`, `src/admin.tsx`, `src/adoption.tsx`, `src/directory.tsx`, `src/tutor.tsx`, `src/community.tsx`, `src/validators.ts`, `src/main.tsx`, `src/mock/db.ts`, `src/mock/server.ts`, `public/sw.js` (caché v5), `AGENTS.md`.
- Cambio realizado:
  - Planes Gratis ($0), Bronce ($10.000), Plata ($15.000) y Oro ($25.000) con límites de ítems, locales, equipo, ofertas, banners y convenios, más portada, perfil por sucursal, prioridad en el buscador, nivel de métricas y soporte. El mock aplica los límites con 422 e indica qué plan los permite. Hay comparativa en el alta, en Suscripción y en la página pública `#planes`, y medidores de uso en el Inicio de la Pyme. Tras el vencimiento hay 5 días de gracia y luego se baja a Gratis sin borrar datos.
  - Multitenant: sucursales por Pyme (pines en el mapa, búsqueda y perfil propio desde Plata) y equipo con roles internos (jefe de local y personal clínico) y permisos por módulo. Las credenciales temporales llegan por correo. Las veterinarias pasan a ser Pymes; el clínico es personal de la veterinaria y accede a las fichas por membresía.
  - Rol asesor: verifica Pymes y ONG, confirma pagos, crea cuentas con correo de bienvenida y aprueba banners, perfiles de ONG y convenios. Gestiona la cobranza.
  - Publicidad sin imágenes, con aprobación del asesor, en el inicio, el directorio y el muro, con impresiones y clics.
  - Convenios Pyme–ONG con código de cupón (la ONG acepta y el asesor aprueba), registro de canjes en caja, meta mensual (100 por defecto) con premio de alimentos y métricas de impacto para la ONG.
  - CMS de ONG: misión, necesidades, donaciones, voluntariado, emblema y color. Se publica solo tras la aprobación del asesor. Perfil público en `#ong/<id>` y listado en Adopciones.
  - Orcob (Organización de Cobranzas Orcob Ltda.): adaptador mock con código de recaudación, aviso de pago simulado y derivación de deudas con más de 30 días de mora, enviando solo datos mínimos de la empresa.
  - Ley 21.719: consentimientos separados y versionados en el registro, retiro inmediato de los opcionales, descarga JSON (acceso y portabilidad), solicitudes ARSOPOL con plazo de 30 días, panel de privacidad del administrador y anonimización al aceptar una supresión. Bandeja de correos simulada en Configuración.
  - Datos demo v3 (`petsuite-mock-db-v3`) con cuentas nuevas: veterinaria, peluquería morosa, jefe de local y asesor.
- Motivo: aplicar los cambios de la reunión de octubre: remarcar el modelo de suscripción, definir roles y reglas de negocio, empresas con varias sucursales, gestión por asesores y cumplimiento de la nueva ley de datos, manteniendo como núcleo la Ficha Única y el QR.
- Limitaciones declaradas: los límites por plan son una propuesta (el equipo solo fijó los precios). Orcob y el correo son simulados. Las claves temporales viajan en texto en el correo demo; en producción se usaría un enlace de activación de un solo uso. El cumplimiento de la Ley 21.719 debe validarlo una asesoría legal.
- Verificación ejecutada: `npx tsc -b` sin errores y `npm run build -- --base=/mockap-petsuite/` correcto. `node --test src/admin-suspension.test.mjs src/business.test.mjs src/business-rules.test.mjs backend/server.test.mjs`: 13 de 13 pruebas (7 nuevas de reglas de negocio). Recorrido con Playwright (Chromium) por las 9 cuentas demo y todas sus vistas a 1366 px y 390 px, más `#planes`, `#adopciones` y `#ong/<id>`: sin errores de consola ni desplazamiento horizontal. `git diff --check` correcto.

## 2026-10-19

### FE-01 · Ficha pública de emergencia

- Fecha: 2026-10-19.
- Archivos modificados o agregados: `src/tutor.tsx`, `src/design-pages.css`, `docs/capturas/fe-01/README.md` y sus capturas, `AGENTS.md`.
- Cambio realizado: la ficha pública prioriza foto, nombre, alertas, alergias y condiciones antes del formulario; conserva visible un botón de contacto que lleva al campo del mensaje sin romper la ruta QR. Se separaron carga, medalla inválida, medalla desactivada (cuando el API responda 410), error de red con reintento y aviso enviado; se ajustaron áreas táctiles, asociación de errores, reflujo al ampliar y privacidad de la presentación.
- Motivo: permitir a quien encuentra una mascota consultar inmediatamente la información crítica y avisar al tutor desde cualquier tamaño de pantalla, sin exponer datos privados.
- Dependencia para la próxima semana: el contrato actual devuelve 404 tanto para tokens inexistentes como desactivados. Para mostrar el estado distinguible de medalla desactivada hace falta 410 en el mock y el API real; hoy 404 muestra «no existe o ya no está activo». No se modificaron `src/mock/` ni `backend/`.
- Verificación ejecutada: `npx tsc -b`, `npm run build -- --base=/mockap-petsuite/`, `node --test src/*.test.mjs backend/*.test.mjs` (13/13) y `git diff --check`, correctos. Revisión con Chromium y respuestas simuladas en navegador para los seis estados en 390 y 1366 px, claro y oscuro; sin errores de consola ni desbordamiento horizontal, contraste de textos críticos ≥4,5:1 y reflujo a 195 px (espacio disponible al 200 % de zoom en 390 px). Capturas en `docs/capturas/fe-01/`.

### FE-02 · Descarga e impresión del QR

- Fecha: 2026-10-19.
- Archivos modificados o agregados: `src/tutor.tsx`, `src/styles.css`, `docs/capturas/fe-02/README.md` y capturas/PDF, `AGENTS.md`.
- Cambio realizado: el PNG se genera a 1200 × 1200 píxeles y se descarga con un nombre seguro derivado del nombre de la mascota. La impresión se separa en una vista exclusiva de una medalla de 60 × 70 mm sobre A4; muestra solo nombre, QR de 46 mm y texto «Escanéame si me encuentras», en blanco y negro.
- Motivo: ofrecer un archivo legible y una impresión a tamaño medalla sin incluir la interfaz del tutor ni datos médicos o privados en el papel.
- Verificación ejecutada: `npx tsc -b`, `npm run build -- --base=/mockap-petsuite/`, `node --test src/*.test.mjs backend/*.test.mjs` y `git diff --check`. Chromium: descarga PNG, hoja A4 y revisión visual a 390 y 1366 px en claro y oscuro; capturas y PDF en `docs/capturas/fe-02/`. El escaneo físico con dos teléfonos requiere validación manual; un QR del mock local no se comparte entre navegadores sin API compartida.

### FE-03 · Primer uso del tutor

- Fecha: 2026-10-19.
- Archivos modificados o agregados: `src/tutor.tsx`, `src/design-pages.css`, `docs/capturas/fe-03/README.md` y capturas, `AGENTS.md`.
- Cambio realizado: Inicio de una cuenta sin mascotas guía en tres pasos (registro, datos críticos y QR); cada mascota muestra un porcentaje calculado con identidad, alergias, condiciones y medalla activa, y sus tarjetas incluyen un botón que abre directamente el siguiente campo pendiente. Tras crear una mascota se abre su ficha y se puede llegar al QR sin ayuda externa.
- Motivo: dar una ruta clara hacia la ficha pública de emergencia sin agregar datos ni rutas al API.
- Dependencia futura: los arreglos vacíos de alergias y condiciones no distinguen «sin revisar» de «ninguna conocida». Una marca de revisión explícita necesitaría actualizar el mock y el API real en conjunto.
- Verificación ejecutada: `npx tsc -b`, `npm run build -- --base=/mockap-petsuite/`, `node --test src/*.test.mjs backend/*.test.mjs` y `git diff --check`. Recorrido con Chromium de cuenta nueva a medalla QR y tarjeta demo que abre el campo pendiente, a 390 y 1366 px en modo claro y oscuro; capturas en `docs/capturas/fe-03/`.

### FE-04 · Estados compartidos en vistas por rol

- Fecha: 2026-10-19.
- Archivos modificados o agregados: `src/feedback.tsx`, `src/feedback.css`, `src/main.tsx`, `src/media.tsx`, `src/tutor.tsx`, `src/directory.tsx`, `src/community.tsx`, `src/adoption.tsx`, `src/business.tsx`, `src/business-profile.tsx`, `src/business-contacts.tsx`, `src/clinical.tsx`, `src/team.tsx`, `src/promotions.tsx`, `src/ong-profile.tsx`, `src/admin.tsx`, `src/advisor.tsx`, `src/privacy.tsx`, `docs/capturas/fe-04/README.md` y capturas, `AGENTS.md`.
- Cambio realizado: componentes compartidos para esqueleto, estado vacío con acción contextual, error con reintento y permiso insuficiente. Se aplicaron a tutor, directorio y muro; Pyme, clínica y sus módulos; ONG, adopciones públicas, asesor y administración. Se evitó mostrar listas vacías o métricas en cero mientras cargan; se desactivaron animaciones del mapa que emitían errores al salir del directorio durante una transición.
- Motivo: distinguir falta de datos de fallas de conexión y dar una acción clara para recuperarse en cada rol.
- Verificación ejecutada: `npx tsc -b`, `npm run build -- --base=/mockap-petsuite/`, `node --test src/*.test.mjs backend/*.test.mjs`, `git diff --check`. Chromium a 390 y 1366 px, claro y oscuro: estados vacíos, carga, recuperación de error HTTP simulado y permiso clínico insuficiente; sin errores de consola ni desbordamiento horizontal. Capturas en `docs/capturas/fe-04/`. La ficha pública QR corresponde a FE-01 y está en la misma rama consolidada.

### FE-05 · Revisión responsive y de paletas de las vistas de octubre

- Fecha: 2026-10-19.
- Archivos modificados o agregados: `src/design-suite.css`, `docs/capturas/fe-05/README.md` y 102 capturas, `AGENTS.md`.
- Cambio realizado: se revisaron las 17 vistas de planes, sucursales, equipo, promociones, convenios, perfil de ONG, asesor, privacidad y correos. Se corrigió el contraste de etiquetas de estado en oscuro, el reflujo de las tablas administrativas, los banners de aprobaciones en móvil y el encabezado público de planes.
- Motivo: evitar texto ilegible y composición comprimida en las vistas nuevas, conservando los temas y el modo oscuro.
- Verificación ejecutada: revisión con Chromium a 390 y 1366 px en claro y oscuro (Original), y a 768 y 1024 px en oscuro (Original, Océano y Lavanda); sin desbordamiento horizontal ni errores de JavaScript. Etiquetas de estado renderizadas verificadas con contraste ≥4,5:1. Capturas y lista de vistas en `docs/capturas/fe-05/README.md`. `npx tsc -b`, `npm run build -- --base=/mockap-petsuite/`, `node --test src/*.test.mjs backend/*.test.mjs` y `git diff --check` ejecutados correctamente.

### Consolidación FE-01 a FE-05 en una rama

- Fecha: 2026-10-19.
- Archivos modificados: `src/tutor.tsx`, `Agents.md`, `docs/capturas/fe-04/README.md`.
- Cambio realizado: se integraron en `fe-01-a-fe-05-frontend` los cinco cambios de frontend sobre `main`. Se conservaron conjuntamente la guía y las acciones de primer uso, la ficha pública, la impresión QR y los estados de recuperación; la bitácora reúne sus cinco entradas.
- Motivo: preparar una sola rama para revisión e integración sin perder funcionalidades ni capturas de las tareas.
- Verificación ejecutada: `npx tsc -b`, `npm run build -- --base=/mockap-petsuite/`, `node --test src/*.test.mjs backend/*.test.mjs` (13/13), `git diff --check main...HEAD` y recorrido integrado con Chromium a 390 px claro y 1366 px oscuro (tutor, salud, PNG, impresión, QR público, contacto, estados vacíos y salida del mapa), además de registro de cuenta nueva hasta medalla QR y panel de privacidad a 768 px oscuro/Océano. Sin errores de JavaScript ni desplazamiento horizontal.
