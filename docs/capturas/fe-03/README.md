# FE-03 · Primer uso del tutor

| | Claro | Oscuro |
| --- | --- | --- |
| 390 px | [Inicio sin mascotas](390-light-inicio.png) · [Ficha con QR](390-light-completa.png) | [Inicio sin mascotas](390-dark-inicio.png) · [Ficha con QR](390-dark-completa.png) |
| 1366 px | [Inicio sin mascotas](1366-light-inicio.png) · [Ficha con QR](1366-light-completa.png) | [Inicio sin mascotas](1366-dark-inicio.png) · [Ficha con QR](1366-dark-completa.png) |

Recorrido comprobado con una cuenta nueva: registro de mascota → alergias → condiciones → medalla QR. Los enlaces de las tarjetas abren el campo pendiente. El porcentaje cuenta cuatro datos visibles en el API: identidad, alergias registradas, condiciones registradas y QR activo.

**Dependencia futura:** el API no distingue un campo no revisado de «sin alergias/condiciones conocidas» cuando el arreglo está vacío. Hasta contar con una marca explícita en el mock y el API real, el indicador representa campos registrados, no una valoración clínica ni confirmación de ausencia de afecciones.
