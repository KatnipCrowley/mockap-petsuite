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
