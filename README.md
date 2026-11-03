# Nemi API

## Descripción

API central de Nemi: la plataforma interna de TI para administrar el ciclo de vida de los activos
tecnológicos de una organización. Gestiona inventario, personas, sedes, asignaciones, licencias con
asientos, garantías, mantenimientos, solicitudes, incidencias y auditoría.

El modelo de datos vive en [`db/schema.ts`](db/schema.ts) y las migraciones en [`drizzle/`](drizzle/).

## Demo

https://nemi.mgdc.site

| Campo | Valor |
|---|---|
| Correo | `empleado@nemi.dev` |
| Contraseña | `Nemi123!` |

El usuario demo tiene rol **Empleado**: consulta sus activos, reporta incidencias y crea solicitudes.
No puede editar el inventario ni acceder a administración.

## Características

- **Inventario centralizado** de hardware, software, licencias y servicios.
- **Licencias con asientos**: asignables a personas o equipos, con renovaciones.
- **Asignaciones y devoluciones** con fecha pactada y fecha real.
- **Garantías** múltiples por activo, sin solapamiento.
- **Mantenimientos** internos o externos, con costo y diagnóstico.
- **Solicitudes e incidencias** con flujo de aprobación y atención.
- **Auditoría** de cada operación con diff antes/después.
- **Roles**: administrador, técnico, almacén y empleado.
- **Documentación OpenAPI** integrada.

## Endpoints

La raíz `/` responde un JSON con enlaces a health, docs y OpenAPI.

Públicos: `/api/health` (verifica la base de datos), `/api/docs`, `/api/doc`.

Protegidos con JWT:

- `GET /api/gestion-activos/activos`
- `GET /api/gestion-activos/activos/:id`
- `POST|PUT|DELETE /api/gestion-activos/activos`
- `PATCH /api/gestion-activos/baja/:id`
- `GET|POST|PUT|DELETE /api/asignaciones`
- `GET /api/dashboard/resumen`
- `GET /api/dashboard/alertas`
- `GET|POST|PUT|DELETE /api/garantias`
- `GET /api/licencias` + asientos y renovaciones
- `GET|POST|PUT|PATCH /api/mantenimientos`
- `GET|POST|PATCH /api/incidencias`
- `GET|POST|PATCH /api/solicitudes`
- `GET|POST|DELETE /api/adjuntos`
- `GET /api/historial/activos/:id`
- `GET|POST /api/reportes` (catálogo filtrado por rol)
- `GET|POST /api/personas` (solo administrador)
- `GET|PUT /api/configuracion`
- `POST /api/auth/login`
- `POST /api/auth/registro`

## Uso

Las rutas protegidas requieren el encabezado:

```http
Authorization: Bearer <token>
```

## Puesta en marcha

```bash
bun install
cp .env.example .env        # ajusta credenciales
bun run db:migrate          # aplica migraciones
bun run db:seed             # datos iniciales
bun run db:admin            # primer administrador en producción
bun run dev
```

El seed crea un usuario por rol, todos con la contraseña `Nemi123!`:

```
admin@nemi.dev     administrador
tecnico@nemi.dev   tecnico
almacen@nemi.dev   almacen
empleado@nemi.dev  empleado
```

## Migraciones

```bash
bun run db:generate   # genera SQL desde db/schema.ts
bun run db:migrate    # aplica pendientes
bun run db:verify     # conteos e invariantes
bun run db:reset      # limpia la base (solo local)
bun run db:check      # consistencia
```

Nunca uses `drizzle-kit push` fuera de una base local de pruebas.

## Tecnologías Utilizadas

- **Runtime**: Bun
- **Framework**: Express 5, Zod
- **Base de datos**: MySQL 9, Drizzle ORM, Drizzle Kit
- **Seguridad**: JWT, Helmet, rate limiting, API key con microservicio de hash
- **Almacenamiento**: Cloudflare R2
- **Documentación**: Swagger UI, zod-openapi
- **Observabilidad**: logs estructurados con `requestId` y redacción de datos sensibles
- **Linter**: Biome, TypeScript
- **Contenedor**: Docker

## Despliegue

Desplegado con Dokploy en un VPS. Swagger disponible en:
[Nemi API](https://nemi-api.fluxdv.icu/api/docs)

El contenedor aplica las migraciones pendientes antes de arrancar.

## Licencia

[PolyForm Noncommercial 1.0.0](LICENSE). Uso personal y no comercial; el uso comercial requiere permiso.

© 2026 Ivan Cruz
