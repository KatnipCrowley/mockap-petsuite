# PetSuite: modelo de negocio, roles y reglas

Versión 2026-10. Fuente de verdad en código: `src/plans.ts` (planes y límites) y `src/permissions.ts` (roles y módulos). Si cambias un valor aquí, cámbialo también allí.

## 1. Actores

Los actores principales usan PetSuite para su propio fin. Los secundarios operan o dan soporte a la plataforma.

```mermaid
flowchart LR
  subgraph P[Actores principales]
    T[Tutor]
    PY[Pyme: dueño o administrador]
    O[ONG]
    JL[Jefe de local]
    CL[Personal clínico]
    V[Visitante sin cuenta]
  end
  subgraph S((PetSuite))
    QR[Ficha Única y QR de emergencia]
    DIR[Directorio y buscador]
    MURO[Muro comunal]
    ADO[Adopciones y perfil de ONG]
    SUS[Suscripciones y planes]
    PUB[Publicidad y convenios]
    PRIV[Privacidad Ley 21.719]
  end
  subgraph SEC[Actores secundarios]
    AS[Asesor PetSuite]
    AD[Administrador PetSuite]
    ORC[Orcob: recaudación y cobranza]
    MAIL[Servicio de correo]
    AG[Agencia de Protección de Datos]
  end
  T --> QR & DIR & MURO & ADO & PRIV
  V --> QR & ADO
  PY --> DIR & SUS & PUB
  JL --> DIR & PUB
  CL --> QR
  O --> ADO & PUB & MURO
  SUS --- ORC
  PUB --- AS
  SUS --- AS
  PRIV --- AD
  PRIV -.-> AG
  S --- MAIL
```

## 2. Tabla de roles

| Rol | Quién es | Lo asigna | Ámbito |
|---|---|---|---|
| Tutor | Dueño de mascotas | Registro propio (gratis) | Sus mascotas y su cuenta |
| Pyme (dueño o administrador) | Veterinaria, tienda, peluquería o cadena | Registro propio o asesor | Su empresa (tenant), todas sus sucursales |
| Jefe de local | Encargado de una sucursal | Dueño de la Pyme | Su sucursal, según los módulos que le asignen |
| Personal clínico | Veterinario de una Pyme veterinaria | Dueño de la Pyme | Fichas que los tutores compartieron con esa veterinaria |
| ONG | Refugio, agrupación o rescatista | Registro propio o asesor (gratis) | Su organización, animales, perfil y convenios |
| Asesor PetSuite | Ejecutivo comercial | Administrador | Cuentas de Pymes y ONG, aprobaciones, cobranza |
| Administrador PetSuite | Operación de la plataforma | PetSuite | Todo, incluidos usuarios, moderación y privacidad |

Las veterinarias son Pymes con rubro «veterinaria». El dueño administra y el personal clínico atiende: se mantienen separados.

## 3. Permisos por módulo

✔ = siempre · ◐ = asignable por el dueño · — = sin acceso

| Módulo | Dueño Pyme | Jefe de local | Clínico | Asesor | Admin |
|---|---|---|---|---|---|
| Perfil del negocio o del local | ✔ | ◐ (por defecto, solo su sucursal) | — | — | — |
| Sucursales | ✔ | — | — | — | — |
| Catálogo | ✔ | ◐ (por defecto) | — | — | — |
| Consultas de clientes | ✔ | ◐ (por defecto) | ◐ | — | — |
| Métricas | ✔ | ◐ (por defecto) | — | — | — |
| Equipo y permisos | ✔ | — | — | — | — |
| Publicidad | ✔ | ◐ | — | — | — |
| Convenios y canjes | ✔ | ◐ | — | — | — |
| Suscripción y pagos | ✔ | — | — | — | — |
| Pacientes (Ficha Única) | — | — | ✔ | — | — |
| Cuentas Pyme y ONG | — | — | — | ✔ | ✔ |
| Aprobaciones | — | — | — | ✔ | ✔ |
| Cobranza (Orcob) | — | — | — | ✔ | ✔ |
| Correos enviados | — | — | — | ✔ | ✔ |
| Usuarios y moderación | — | — | — | — | ✔ |
| Privacidad (Ley 21.719) | — | — | — | — | ✔ |

El servidor responde 403 si una cuenta usa un módulo que no tiene, aunque la pantalla lo muestre.

## 4. Planes de suscripción (Pymes)

Tarifa plana mensual, sin comisiones por venta. Precios en CLP.

| | Gratis | Bronce | Plata | Oro |
|---|---|---|---|---|
| Precio mensual | $0 | $10.000 | $15.000 | $25.000 |
| Ítems de catálogo publicados | 5 | 20 | 60 | 200 |
| Locales (incluida la casa matriz) | 1 | 1 | 3 | 10 |
| Cuentas de equipo | 0 | 1 | 5 | 20 |
| Ofertas vigentes a la vez | 0 | 2 | 10 | Sin límite |
| Banners activos | 0 | 0 | 1 | 3 |
| Convenios con ONG | 0 | 1 | 3 | Sin límite |
| Portada propia | No | Sí | Sí | Sí |
| Perfil propio por sucursal | No | No | Sí | Sí |
| Buscador | Orden alfabético | Orden alfabético | Prioridad | Primero, con insignia «Destacado» |
| Métricas | Visitas y contactos | Visitas y contactos | + canales e ítems más vistos | + canjes por sucursal |
| Soporte | Autogestión | Correo, 48 h hábiles | Asesor asignado | Asesor prioritario |

Las ONG no pagan. Tienen 1 banner activo y convenios sin límite. Todo pasa por el asesor.

Los precios los definió el equipo. Los límites son una propuesta inicial y se ajustan en `src/plans.ts`.

## 5. Reglas de negocio

### Suscripciones (RN-SUS)
- **RN-SUS-01.** Toda Pyme verificada aparece en el directorio. Sin un plan pagado vigente, rige Gratis.
- **RN-SUS-02.** Un periodo dura 30 días. Al renovar o subir de plan, el nuevo periodo empieza cuando termina el vigente. No se pierden días pagados.
- **RN-SUS-03.** Se paga por transferencia (la confirma un asesor) o con un código de recaudación de Orcob (se activa al recibir el aviso de pago).
- **RN-SUS-04.** Solo puede haber un pago en revisión a la vez.
- **RN-SUS-05.** Tras el vencimiento hay 5 días de gracia con todos los beneficios. Después, la Pyme baja a Gratis.
- **RN-SUS-06.** Bajar de plan no borra nada. Se publican los ítems más antiguos hasta el límite, las primeras ofertas vigentes y las primeras sucursales. El resto queda guardado.
- **RN-SUS-07.** Crear algo que supere el límite del plan responde 422 e indica qué plan lo permite.
- **RN-SUS-08.** Con más de 30 días de mora, sin pagos en revisión ni casos abiertos, el asesor puede derivar la deuda a Orcob. La Pyme recibe un aviso por correo con el número de caso y los datos enviados.

### Multitenant y equipo (RN-EQ)
- **RN-EQ-01.** Una Pyme es un tenant. Tiene casa matriz (los datos de la empresa) y sucursales, cada una con dirección, horario y contacto propios.
- **RN-EQ-02.** El dueño crea las cuentas del equipo. La clave temporal llega por correo.
- **RN-EQ-03.** Un jefe de local con «Perfil» edita solo su sucursal. El catálogo es común a toda la empresa.
- **RN-EQ-04.** El personal clínico solo existe en veterinarias. Ve las fichas que los tutores compartieron con esa veterinaria. Sus registros quedan firmados por la clínica.
- **RN-EQ-05.** Retirar a un integrante cierra sus sesiones y desactiva su cuenta. Sus registros clínicos se conservan.

### Publicidad (RN-PUB)
- **RN-PUB-01.** Los banners no llevan imágenes ni enlaces externos: título (hasta 60 caracteres), texto (hasta 140), tono de color y un destino interno.
- **RN-PUB-02.** Duran como máximo 30 días y no pueden empezar en el pasado.
- **RN-PUB-03.** Nada se muestra sin la aprobación del asesor. Un rechazo exige un motivo, que se envía por correo.
- **RN-PUB-04.** Se muestran hasta 3 banners por ubicación. Los de planes con más visibilidad van primero. Se cuentan impresiones y clics.

### Convenios y cupones (RN-CON)
- **RN-CON-01.** La Pyme propone a una ONG un descuento entre 5 % y 50 %. El código se genera automáticamente.
- **RN-CON-02.** Flujo: propuesto → la ONG acepta → el asesor aprueba → activo. Cualquiera de los tres puede rechazar.
- **RN-CON-03.** Cada venta con el código se registra como canje en la caja de la Pyme. Así se mide la visibilidad que entrega la ONG.
- **RN-CON-04.** Al alcanzar la meta mensual de canjes (100 por defecto), se otorga el premio del convenio (por defecto, premio de alimentos) una vez por mes. Se avisa a la Pyme, a la ONG y a los asesores.

### Perfil de ONG (RN-ONG)
- **RN-ONG-01.** La ONG arma su perfil sin subir imágenes: misión, cómo ayudar, necesidades, voluntariado, horario de visitas y datos para donar.
- **RN-ONG-02.** Lo que guarda es un borrador. Lo público cambia solo cuando el asesor aprueba, para proteger los datos bancarios de donación frente a fraudes.
- **RN-ONG-03.** PetSuite no recibe ni intermedia donaciones.

## 6. Ley 21.719 de protección de datos personales

Rige desde el 1 de diciembre de 2026. Esto es lo que implementa el mockup. Antes de producción, debe validarlo una asesoría legal.

| Exigencia | Cómo se cumple |
|---|---|
| Consentimiento libre, específico e informado | En el registro hay casillas separadas: términos (obligatorio), tratamiento de datos (obligatorio) y comunicaciones (opcional). Cada consentimiento se guarda con versión y fecha. |
| Revocación | En Configuración > Privacidad y datos se retiran las comunicaciones y las métricas, con efecto inmediato. |
| Acceso y portabilidad | Descarga inmediata de un JSON con tus datos, sin contraseña ni datos de terceros. |
| Rectificación, supresión, oposición y bloqueo | Solicitud con folio y plazo de 30 días corridos. El administrador la responde por correo. La supresión anonimiza la cuenta y borra mascotas y medallas. Los pagos se conservan por obligación tributaria. |
| Minimización | El QR público muestra solo una lista blanca de datos de emergencia. Orcob recibe solo RUT, razón social, correo comercial, monto, periodo y días de mora. |
| Encargados de tratamiento | Orcob (cobranza) y el proveedor de correo. Requieren un contrato de encargo. |
| Reclamo | Las respuestas informan el derecho a reclamar ante la Agencia de Protección de Datos Personales. |

Pendiente para producción: delegado de protección de datos, registro de actividades de tratamiento, protocolo de notificación de brechas y contratos con los encargados.

## 7. Orcob

Organización de Cobranzas Orcob Ltda. presta servicios de recaudación y cobranza. Como no publica un API abierto, el contrato esperado está en `src/mock/orcob.ts`:

- `crearCobro`: emite un código de pago para un periodo.
- `derivarCobranza`: abre un caso de cobranza extrajudicial con los datos mínimos del deudor.

En la demo, el aviso de pago (webhook) se simula desde Suscripción. Para integrarlo de verdad se necesita el convenio, las credenciales y el endpoint de notificación de Orcob.

## 8. Cuentas de demostración

Clave para todas: `petsuite123`.

| Cuenta | Para probar |
|---|---|
| tutor@petsuite.cl | Ficha Única, QR, banners, directorio, privacidad |
| tienda@petsuite.cl | Pyme Plata con sucursal, equipo, convenio en revisión |
| veterinaria@petsuite.cl | Pyme Oro (destacada), convenio activo con historial de canjes |
| peluqueria@petsuite.cl | Plan Bronce vencido hace 35 días: bajó a Gratis y se puede derivar a cobranza |
| jefe@petsuite.cl | Jefe de local de Huellitas Puerto Montt |
| clinico@petsuite.cl | Personal clínico de Clínica Veterinaria Sur |
| ong@petsuite.cl | Perfil público, banner en revisión, convenios |
| asesor@petsuite.cl | Aprobaciones, cobranza, creación de cuentas |
| admin@petsuite.cl | Todo lo anterior, más usuarios, moderación y privacidad |
