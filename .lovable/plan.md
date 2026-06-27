# Plan: TM RENT A CAR

Sistema ERP para renta de vehículos con todos los módulos del PRD. Dado el tamaño, propongo construirlo por **fases**, validando diseño y backend antes de avanzar.

## Stack y arquitectura

- TanStack Start + React + Tailwind (ya configurado).
- **Lovable Cloud** (Supabase gestionado) para auth, base de datos, storage de fotos/PDFs.
- Auth: email/contraseña, roles `owner` y `administrador` (mismos permisos) vía tabla `user_roles` + función `has_role`.
- PDFs generados con `pdf-lib` en server functions.
- Subida de archivos a Storage (fotos vehículos, documentos, evidencias multas, firmas inspección).

## Diseño visual

Estilo ERP profesional, minimalista, corporativo:

- Paleta: negro / grafito / gris claro / blanco, acento azul profesional + dorado oscuro premium.
- Sidebar fijo, top bar con búsqueda y notificaciones, tablas densas tipo ERP, tarjetas KPI, gráficas (Recharts).
- Tipografía sans-serif moderna, alto contraste.
- Todo definido en `src/styles.css` como tokens semánticos.

## Fases de entrega

### Fase 1 — Fundación (esta entrega)

1. Habilitar Lovable Cloud.
2. Diseño system completo (tokens, sidebar, layout ERP, componentes base).
3. Auth (login, gestión de sesión, roles owner/admin).
4. Schema completo de base de datos con RLS:
  - `profiles`, `user_roles`, `vehiculos`, `clientes`, `rentas`, `contratos`, `pagos`, `mantenimientos`, `seguros`, `multas`, `inspecciones`, `configuracion_empresa`.
  - Soft delete (`deleted_at`) en todas las tablas aplicables.
  - Triggers: cambio automático de estado de vehículo al crear/finalizar renta.
5. Layout principal (sidebar + topbar + rutas protegidas bajo `_authenticated/`).
6. Dashboard con KPIs reales y gráficas (ingresos, ocupación flota, métodos de pago, vehículos más rentados).

### Fase 2 — Núcleo operativo

- CRUD Vehículos (con fotos, documentos, estados, tarifas).
- CRUD Clientes (con historial).
- CRUD Rentas (flujo completo: crear → estado vehículo → contrato PDF → pagos → finalizar).
- Generación de contratos PDF.

### Fase 3 — Operación extendida

- Pagos (adelantos, parciales, final, comprobantes).
- Inspecciones (salida/devolución, fotos, firma, daños).
- Calendario tipo Google Calendar con drag & drop.

### Fase 4 — Gestión de flota

- Mantenimientos (programación + alertas).
- Seguros (pólizas + alertas vencimiento).
- Multas (con evidencias).

### Fase 5 — Administración

- Usuarios (CRUD owner/admin).
- Configuración empresa (datos, tarifas, métodos pago, moneda, impuestos, plantillas de contrato).
- Reportes (diario/semanal/mensual/personalizado, exportar PDF/Excel).
- Sistema de alertas/notificaciones.

## Funciones comunes en todos los módulos

Botones Nuevo/Editar/Eliminar/Guardar/Cancelar, búsqueda, filtros, ordenamiento, paginación, confirmaciones, toasts, validación con Zod, soft delete con restauración, historial de cambios donde aplique, responsive.

## Detalles técnicos

- **Roles**: tabla separada `user_roles` con enum `app_role`, función `has_role` security definer. Owner y Administrador tienen idénticos permisos (políticas RLS los tratan igual).
- **Automatizaciones DB**: triggers PL/pgSQL para estado de vehículo, función para detectar seguros/mantenimientos próximos a vencer.
- **Storage buckets**: `vehiculo-fotos` (público), `vehiculo-docs` (privado), `inspecciones` (privado), `multas-evidencia` (privado), `contratos-pdf` (privado), `cliente-docs` (privado).
- **Server functions** (`createServerFn` + `requireSupabaseAuth`) para: generar PDFs, cálculos de reportes, cambio de estados transaccional.

## Preguntas antes de empezar

1. **Moneda por defecto**: ¿RD$ (peso dominicano), USD, u otra? CORDOBA Y DOLAR
2. **Idioma**: confirmo **español** en toda la UI.
3. **Logo TM RENT A CAR**: ¿tienes un archivo para subir, o lo genero (texto + ícono) y lo puedes reemplazar luego? TEXTO E ICONO
4. ¿Apruebas el plan de fases y empezamos por la **Fase 1**? si

Una vez confirmes, empiezo habilitando Cloud y construyendo fundación + dashboard en esta misma entrega.