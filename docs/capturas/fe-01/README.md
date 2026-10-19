# FE-01 · Ficha pública de emergencia

Capturas de Chromium a 390 × 844 y 1366 × 768, en claro y oscuro. Se incluye una captura de reflujo a 195 × 422 (equivalente al espacio disponible con zoom al 200 % sobre 390 px).

| Estado | 390 claro | 390 oscuro | 1366 claro | 1366 oscuro |
| --- | --- | --- | --- | --- |
| Ficha y contacto fijo | [Ver](390-light-ok.png) | [Ver](390-dark-ok.png) | [Ver](1366-light-ok.png) | [Ver](1366-dark-ok.png) |
| Cargando | [Ver](390-light-loading.png) | [Ver](390-dark-loading.png) | [Ver](1366-light-loading.png) | [Ver](1366-dark-loading.png) |
| Medalla no válida | [Ver](390-light-invalid.png) | [Ver](390-dark-invalid.png) | [Ver](1366-light-invalid.png) | [Ver](1366-dark-invalid.png) |
| Medalla desactivada | [Ver](390-light-disabled.png) | [Ver](390-dark-disabled.png) | [Ver](1366-light-disabled.png) | [Ver](1366-dark-disabled.png) |
| Error de red | [Ver](390-light-network.png) | [Ver](390-dark-network.png) | [Ver](1366-light-network.png) | [Ver](1366-dark-network.png) |
| Aviso enviado | [Ver](390-light-sent.png) | [Ver](390-dark-sent.png) | [Ver](1366-light-sent.png) | [Ver](1366-dark-sent.png) |

[Reflujo a 200 %](390-light-zoom200.png).

Las capturas de estados usan respuestas simuladas **solo en el navegador de pruebas**. Dependencia para la próxima semana: el contrato actual devuelve 404 tanto para tokens inexistentes como para medallas desactivadas. Para distinguir «Medalla desactivada» en producción, `GET /qr/:token` debe devolver 410 cuando la medalla existió pero fue desactivada o reemplazada, en el mock y el API real a la vez. Mientras tanto, el 404 conserva el mensaje genérico «no existe o ya no está activo», sin revelar datos privados.
