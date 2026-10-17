-- Datos de referencia que necesita cualquier instalación (no son datos demo).

insert into comunas (id, nombre) values
  (1, 'Osorno'),
  (2, 'Puerto Montt'),
  (3, 'Castro');

-- Mismos ids y precios que PLANES en src/modules/plans/plans.ts.
insert into planes (id, codigo, nombre, precio_mensual_clp) values
  (1, 'gratis', 'Gratis', 0),
  (2, 'bronce', 'Bronce', 10000),
  (3, 'plata', 'Plata', 15000),
  (4, 'oro', 'Oro', 25000);
