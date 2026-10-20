# FE-04 · Estados de carga, vacío, error y permiso

Revisión con Chromium a 390 × 844 y 1366 × 768, en claro y oscuro. Las imágenes se nombran `<ancho>-<modo>-<estado>.png`.

| Caso | 390 claro | 390 oscuro | 1366 claro | 1366 oscuro |
| --- | --- | --- | --- | --- |
| Directorio sin resultados | [Ver](390-light-tutor-vacio.png) | [Ver](390-dark-tutor-vacio.png) | [Ver](1366-light-tutor-vacio.png) | [Ver](1366-dark-tutor-vacio.png) |
| Consultas Pyme vacías | [Ver](390-light-pyme-vacio.png) | [Ver](390-dark-pyme-vacio.png) | [Ver](1366-light-pyme-vacio.png) | [Ver](1366-dark-pyme-vacio.png) |
| Resumen admin cargando | [Ver](390-light-admin-carga.png) | [Ver](390-dark-admin-carga.png) | [Ver](1366-light-admin-carga.png) | [Ver](1366-dark-admin-carga.png) |
| Error y botón Reintentar | [Ver](390-light-error.png) | [Ver](390-dark-error.png) | [Ver](1366-light-error.png) | [Ver](1366-dark-error.png) |
| Permiso clínico insuficiente | [Ver](390-light-permiso.png) | [Ver](390-dark-permiso.png) | [Ver](1366-light-permiso.png) | [Ver](1366-dark-permiso.png) |

Las dos últimas filas se comprobaron con respuestas HTTP **simuladas solo durante la prueba visual**: la falla de `/mascotas` se recuperó con «Reintentar» y una cuenta clínica sin Pyme mostró «Permiso insuficiente». No se cambió el mock ni el backend. Los estados de la ficha pública del QR corresponden a FE-01 y están incluidos en la misma rama consolidada.
