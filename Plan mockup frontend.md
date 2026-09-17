# PetSuite — Plan de Mockup Frontend

Documento de planificación para construir el mockup frontend del MVP definido en `Plan mockup.txt`.

## 1. Alcance

Se construirá una aplicación PWA responsive desde cero con React y TypeScript. El mockup cubrirá los cinco actores definidos en el documento de referencia:

- Tutor de mascota.
- Visitante anónimo.
- Administrador de Pyme.
- Personal clínico veterinario.
- Administrador de la plataforma.

El objetivo es representar el producto completo del MVP, incluyendo navegación, estados esenciales, validaciones y datos ficticios realistas. El backend será desarrollado posteriormente, por lo que el frontend utilizará servicios mock reemplazables.

## 2. Decisiones confirmadas

- Tecnología: React + TypeScript.
- Plataforma: PWA responsive.
- Nivel visual: media fidelidad.
- Estilos: componentes propios con Tailwind CSS.
- Idioma: español.
- Datos: ficticios y realistas.
- Persistencia mock: `localStorage`.
- Autenticación: login simulado mediante cuentas demo por rol.
- Mapa: mapa simulado, sin API externa.
- QR: generación visual, descarga PNG y vista de impresión.
- Contacto QR: formulario anónimo simulado.
- Validación: Zod para todos los formularios.
- Actores: todos los actores del documento de referencia.
- Pantallas: cobertura de las 23 pantallas definidas.
- Identidad inicial: tonos rojos y blancos para las interfaces, con negro para el texto.
- Identidad editable: colores y tipografía deben definirse mediante tokens modificables.

## 3. Límites del mockup

El mockup no dependerá de un backend real ni de una API externa. Las operaciones de autenticación, CRUD, métricas, suscripciones, contactos y moderación se simularán en el frontend.

La capa de servicios debe permitir reemplazar posteriormente los mocks por llamadas HTTP sin modificar las pantallas ni los componentes de presentación.

La información privada del tutor no debe aparecer en la ficha pública de emergencia. La vista pública solo mostrará la información definida por los requerimientos de privacidad del documento de referencia.

## 4. Arquitectura frontend

### 4.1 Estructura propuesta

```text
src/
  app/
    layouts/
    routes/
  components/
    ui/
    forms/
    feedback/
    navigation/
  features/
    auth/
    tutor/
    pets/
    qr/
    directory/
    community/
    business/
    admin/
  mocks/
  services/
  lib/
    permissions.ts
    storage.ts
  styles/
  types.ts
  validators.ts
```

### 4.2 Archivo central de tipos

`src/types.ts` será el archivo central único para tipos e interfaces compartidas:

- Roles y permisos.
- Usuarios.
- Mascotas.
- Historial médico.
- Vacunas, alergias y atenciones.
- Pymes.
- Productos y servicios.
- Publicaciones del muro.
- Comentarios y reacciones.
- Suscripciones.
- Contactos seguros.
- Métricas.
- Estados de carga, error y éxito.
- Tipos usados por los formularios.

### 4.3 Archivo central de validadores

`src/validators.ts` será el archivo central único para esquemas Zod:

- Registro de tutor.
- Login.
- Recuperación de contraseña.
- Registro y edición de mascota.
- Historial médico.
- Perfil de Pyme.
- Producto o servicio.
- Publicación del muro.
- Comentario.
- Contacto seguro.
- Suscripción.
- Gestión de usuarios.
- Moderación.

Todos los formularios deben consumir estos esquemas y mostrar mensajes de error en español.

### 4.4 Servicios mock

Los servicios mock deben aislar la lógica de datos:

- `authService`.
- `petService`.
- `medicalHistoryService`.
- `qrService`.
- `directoryService`.
- `communityService`.
- `businessService`.
- `metricsService`.
- `subscriptionService`.
- `contactService`.
- `adminService`.

Los servicios utilizarán datos iniciales ficticios y persistirán las modificaciones en `localStorage`.

## 5. Sistema visual

### 5.1 Dirección visual

La interfaz utilizará una dirección cálida, clara y confiable basada en:

- Rojo como color de marca y acciones principales.
- Blanco como superficie principal.
- Negro o tonos negros para textos.
- Escala de grises para bordes, fondos secundarios y estados deshabilitados.

Los valores exactos de color y la tipografía quedan abiertos a modificación antes de la implementación visual final.

### 5.2 Componentes propios

Se crearán componentes reutilizables para:

- Botones.
- Inputs.
- Selects.
- Textareas.
- Cards.
- Badges.
- Tablas.
- Modales.
- Alertas.
- Tabs.
- Dropdowns.
- Skeletons.
- Estados vacíos.
- Estados de error.
- Confirmaciones.
- Navegación mobile y desktop.

## 6. Pantallas y flujos

### 6.1 Tutor de mascota

Pantallas cubiertas:

- T1 Registro / Login.
- T2 Inicio / Dashboard.
- T3 Mis Mascotas.
- T4 Registrar / Editar Mascota.
- T5 Ficha de Mascota.
- T6 Historial Médico.
- T7 Directorio de Pymes.
- T8 Detalle de Pyme.
- T9 Muro Comunal.
- T10 Publicar en el Muro.
- T11 Perfil Público de Mascota.
- T12 Configuración de Cuenta.

Funciones principales:

- Crear y editar mascotas.
- Agregar datos de salud.
- Visualizar el historial médico como timeline.
- Generar y descargar el QR.
- Activar o desactivar la visibilidad pública de una mascota.
- Consultar el directorio.
- Publicar y participar en el muro comunal.
- Gestionar datos personales y privacidad.

### 6.2 Visitante anónimo

Pantallas cubiertas:

- V1 Ficha de Emergencia Pública.
- V2 Confirmación de Contacto Enviado.

Funciones principales:

- Abrir la ficha desde un QR.
- Ver foto, nombre, alergias y condiciones críticas permitidas.
- No mostrar RUT, teléfono ni dirección.
- Escribir un mensaje anónimo.
- Enviar el mensaje mediante un formulario validado.
- Mostrar estados de carga, error y confirmación.

La ficha V1 debe tratarse como la pantalla crítica del producto y mantenerse visualmente simple y rápida.

### 6.3 Administrador de Pyme

Pantallas cubiertas:

- P1 Registro / Login Pyme.
- P2 Dashboard Pyme.
- P3 Editar Perfil del Negocio.
- P4 Gestionar Catálogo.
- P5 Agregar / Editar Producto o Servicio.
- P6 Panel de Métricas.
- P7 Gestión de Suscripción.
- P8 Mensajes / Contactos Recibidos.

Funciones principales:

- Gestionar la información del negocio.
- Crear, editar, activar y desactivar productos o servicios.
- Visualizar visitas y productos más consultados.
- Consultar el estado de la suscripción.
- Consultar pagos manuales simulados.
- Ver mensajes recibidos desde el directorio o la ficha QR.

### 6.4 Personal clínico veterinario

El personal clínico se representará como un rol dentro del contexto Pyme. Utilizará la estructura de pantallas de Pyme con permisos específicos para consultar la información clínica autorizada.

No se agregan pantallas clínicas adicionales en esta versión porque el documento de referencia no las define.

### 6.5 Administrador de plataforma

Pantallas cubiertas:

- A1 Login Admin.
- A2 Dashboard General.
- A3 Gestión de Usuarios.
- A4 Moderación del Muro Comunal.
- A5 Gestión de Suscripciones.

Funciones principales:

- Consultar KPIs globales.
- Buscar y activar o desactivar usuarios.
- Revisar publicaciones reportadas.
- Aprobar o eliminar publicaciones.
- Validar pagos manuales.
- Activar y renovar suscripciones de Pymes.

## 7. Flujos prioritarios

### 7.1 Registro y QR

```text
Login o registro de tutor
  -> Mis Mascotas
  -> Registrar Mascota
  -> Ficha de Mascota
  -> Generar QR
  -> Vista previa
  -> Descargar PNG o imprimir
```

### 7.2 Emergencia

```text
Escaneo del QR
  -> Ficha de Emergencia Pública
  -> Formulario de contacto anónimo
  -> Validación Zod
  -> Contacto Enviado
```

### 7.3 Alta de Pyme

```text
Registro Pyme
  -> Perfil del Negocio
  -> Catálogo
  -> Suscripción
  -> Activación manual simulada por Admin
```

### 7.4 Moderación

```text
Publicación en el muro
  -> Reporte opcional
  -> Cola de moderación
  -> Aprobar o eliminar
```

## 8. Estados obligatorios

Cada flujo debe contemplar, cuando corresponda:

- Carga.
- Estado vacío.
- Error de validación.
- Error de operación.
- Éxito.
- Confirmación de acciones destructivas.
- Permiso insuficiente.
- Sesión no autenticada.
- Datos no encontrados.
- Elementos activos e inactivos.
- Mensajes leídos y no leídos.

## 9. Fases de ejecución

### Fase 1: Inicialización

- Crear el proyecto React + TypeScript.
- Configurar Tailwind CSS.
- Configurar routing.
- Crear layouts y navegación por rol.
- Crear los archivos `types.ts` y `validators.ts`.

### Fase 2: Datos y simulación

- Crear datos ficticios iniciales.
- Implementar servicios mock.
- Implementar persistencia con `localStorage`.
- Implementar cuentas demo por rol.

### Fase 3: Componentes visuales

- Crear tokens de color y tipografía.
- Crear componentes base.
- Implementar navegación mobile, tablet y desktop.
- Crear estados de feedback.

### Fase 4: Tutor y visitante

- Implementar autenticación.
- Implementar mascotas e historial.
- Implementar generación de QR.
- Implementar ficha pública y contacto seguro.

### Fase 5: Directorio y comunidad

- Implementar directorio.
- Implementar mapa simulado.
- Implementar perfiles de Pyme.
- Implementar muro, publicaciones, comentarios y reacciones.

### Fase 6: Pyme y administración

- Implementar catálogo.
- Implementar métricas.
- Implementar suscripciones.
- Implementar mensajes.
- Implementar backoffice y moderación.

### Fase 7: Validación final

- Ejecutar validación de formularios mediante Zod.
- Probar cuentas demo por rol.
- Verificar persistencia después de recargar.
- Revisar los tres tamaños responsive.
- Recorrer los flujos críticos.
- Revisar que la ficha pública no exponga información privada.

## 10. Criterios de aceptación

- Las 23 pantallas del documento de referencia están representadas.
- Todos los roles tienen acceso únicamente a sus vistas permitidas.
- El tutor puede crear una mascota y generar su QR.
- El visitante puede consultar una ficha pública y enviar un contacto anónimo.
- La Pyme puede gestionar su perfil y catálogo.
- El administrador puede moderar publicaciones y gestionar suscripciones.
- Todos los formularios tienen validación Zod.
- Los cambios se conservan en `localStorage`.
- El mapa no requiere credenciales externas.
- El QR puede descargarse como PNG y visualizarse en modo impresión.
- La interfaz es usable en móvil, tablet y desktop.
- Los tokens de color y tipografía pueden modificarse sin rehacer los componentes.

## 11. Pendientes que no se deben asumir

- Valores hexadecimales definitivos de la paleta roja.
- Tipografía definitiva.
- Logo final de PetSuite.
- Nombres finales de rutas.
- Contrato y tecnología del backend.
- Permisos exactos del personal clínico.
- Biblioteca concreta para generar el QR.
- Textos e imágenes definitivos.
