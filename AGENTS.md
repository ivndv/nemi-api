# AGENTS.md — Nemi API (`nemi-api`)

## 1. Visión general

**nemi-api** es la API REST de **Nemi**, la plataforma interna de TI para administrar el ciclo de vida de los activos tecnológicos de una organización: hardware, software, licencias, garantías, mantenimientos, solicitudes e incidencias.

- **Dominio:** [https://nemi-api.fluxdv.icu](https://nemi-api.fluxdv.icu)
- **Swagger:** [https://nemi-api.fluxdv.icu/api/docs](https://nemi-api.fluxdv.icu/api/docs)
- **Frontend:** [https://nemi.mgdc.site](https://nemi.mgdc.site)
- **Repositorio:** [https://github.com/ivndv/nemi-api](https://github.com/ivndv/nemi-api)
- **Modelo de datos:** `docs/MODELO.md`

## 2. Antes de tocar código

- Lee `docs/MODELO.md`: es la fuente de verdad del modelo.

**CodeGraph** (índice de símbolos del repo): usa `codegraph_explore` (`query`, `maxFiles`, `projectPath`) antes de un grep masivo o de leer varios archivos; devuelve fuente verbatim, rutas de llamada e impacto.

- `codegraph sync /home/ivan/software-dev/nemi-api` tras editar, pull o cambiar de rama (incremental, uso normal).
- `codegraph index /home/ivan/software-dev/nemi-api` solo al crear el índice, tras `codegraph upgrade` o si `status` avisa `built by vX` (rebuild completo).
- `codegraph status /home/ivan/software-dev/nemi-api` para comprobar el estado.

## 3. Stack tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Runtime y gestor | Bun `1.4.4` |
| Lenguaje | TypeScript estricto, ESM (`nodenext`) |
| Framework | Express `5.3` |
| Base de datos | MySQL `9` |
| ORM y migraciones | Drizzle ORM `0.45.4`, Drizzle Kit `0.31.11` |
| Validación | Zod `4.6.7` |
| Seguridad | JWT, Helmet, `express-rate-limit`, CORS por origen |
| Hash | Microservicio Go + Argon2id (`hash-service`) |
| Archivos | Cloudflare R2 (`assets-mgdc/nemi/`) |
| Documentación | Swagger UI + `zod-openapi` |
| Linter | Biome `2.6.4` |
| Despliegue | Docker + Dokploy (webhook con Cloudflare Access) |

## 4. Estructura del código

```text
nemi-api/
├── app.ts · server.ts     → montaje de Express y arranque/apagado ordenado
├── config/                → db.ts (pool MySQL + Drizzle), env.ts (validación con Zod)
├── middleware/            → requestId, httpLog, autenticar, permisos, validar, límites, subida
├── routes/                → contratos HTTP
├── controllers/           → traducción HTTP ↔ servicios
├── services/              → reglas de negocio y consultas
│   ├── presentacion.ts    → códigos de BD ↔ etiquetas del frontend
│   ├── eventosService.ts  → bitácora de eventos con diff
│   ├── contexto.ts        → requestId por AsyncLocalStorage
│   ├── errors.ts          → ErrorHttp (mensaje + status)
│   └── reportes/          → patrón estrategia por slug
├── schemas/               → validación Zod
├── db/                    → schema.ts (fuente de verdad), migrate.ts, seed.ts, verify.ts, reset.ts
└── drizzle/               → migraciones versionadas + snapshots
```

Reglas de capas:

- `routes` declara y aplica middlewares.
- `controllers` no contiene SQL ni reglas de negocio.
- `services` concentra consultas, transacciones y eventos.
- Toda operación que cambia datos escribe un evento en la misma transacción.
- Los errores de negocio se lanzan con `ErrorHttp` y los responde el middleware global.
- La documentación OpenAPI se genera desde Zod en `openapi/` (`bun run openapi:check`).

## 5. Arquitectura y flujo de datos

### 5.1 Modelo de datos

Resumen (detalle en `docs/MODELO.md`):

- **Organización:** `roles`, `sedes`, `ubicaciones` (árbol), `departamentos`, `personas`.
- **Catálogos:** `tipos_activo`, `proveedores`, `acciones`, `tipos_reporte`.
- **Inventario:** `activos`, `licencias`, `adjuntos`.
- **Movimientos:** `asignaciones`, `asignaciones_licencia`, `mantenimientos`, `solicitudes`, `incidencias`, `renovaciones_licencia`.
- **Cobertura:** `garantias`.
- **Reportes:** `tipos_reporte`, `tipos_reporte_roles`, `reportes_generados`.
- **Auditoría y sistema:** `eventos`, `configuracion`.

Reglas clave:

- Nada se borra: baja lógica con `deleted_at`.
- Una asignación activa por activo de hardware y una por asiento de licencia (índices únicos).
- Solo un mantenimiento abierto por activo.
- Garantías sin solapamiento.
- Los roles son `administrador`, `tecnico`, `almacen`, `empleado`.
- Los índices con baja lógica usan columnas generadas `*_activo`.
- El estado de una licencia se deriva de sus asientos y se sincroniza en `activos.estado`.
- Los roles viven en `roles` y `personas.rol_id`; los reportes por rol en `tipos_reporte_roles`.
- Los reportes no guardan resultados; solo auditoría en `reportes_generados`.
- Las etiquetas visibles viajan como `*_label` (`estado_label`, `tipo_label`, etc.).
- `valor_compra` es adquisición; `licencias.costo` es el costo del periodo.

### 5.2 Migraciones

- El esquema **solo** se cambia editando `db/schema.ts` y generando una migración.
- **Prohibido `drizzle-kit push`** fuera de una base local de pruebas.
- Migraciones hacia adelante; rollback = restaurar respaldo.
- `db/seed.ts` no se ejecuta en producción.
- En producción, el contenedor ejecuta `db:migrate` antes de arrancar el servidor.

### 5.3 Endpoints

Públicos: `GET /api/health`, `GET /api/docs`, `GET /api/doc`.

Protegidos (JWT):

| Método | Ruta | Roles |
| :--- | :--- | :--- |
| GET | `/api/gestion-activos/activos` | todos (empleado solo lo suyo) |
| GET | `/api/gestion-activos/activos/:id` | todos (empleado solo lo suyo) |
| POST/PUT | `/api/gestion-activos/activos` | administrador, técnico, almacén |
| PATCH | `/api/gestion-activos/baja/:id` | administrador, técnico |
| DELETE | `/api/gestion-activos/activos/:id` | administrador, técnico |
| GET/POST/PUT/DELETE | `/api/asignaciones` | lectura todos; escritura administrador, técnico, almacén |
| GET | `/api/dashboard/resumen`, `/alertas` | todos |
| GET/POST/PUT/DELETE | `/api/garantias` | lectura todos; escritura administrador, técnico |
| GET | `/api/licencias` | todos |
| GET/POST/PATCH | `/api/licencias/:id/asientos` | escritura administrador, técnico, almacén |
| GET/POST | `/api/licencias/:id/renovaciones` | lectura todos; escritura administrador, técnico |
| GET | `/api/mantenimientos` | todos (empleado solo los de sus activos) |
| POST/PUT/PATCH | `/api/mantenimientos` | administrador, técnico |
| GET | `/api/incidencias` | todos (empleado las suyas y las de sus activos) |
| POST | `/api/incidencias` | todos |
| PATCH | `/api/incidencias/:id/estado` | administrador, técnico |
| POST | `/api/incidencias/:id/mantenimiento` | administrador, técnico |
| GET | `/api/solicitudes` | todos (empleado solo las suyas) |
| POST | `/api/solicitudes` | todos |
| PATCH | `/api/solicitudes/:id/aprobar` | administrador, técnico |
| PATCH | `/api/solicitudes/:id/rechazar` | administrador, técnico |
| PATCH | `/api/solicitudes/:id/entregar` | administrador, técnico, almacén |
| GET | `/api/adjuntos` | todos |
| POST/DELETE | `/api/adjuntos` | administrador, técnico, almacén |
| GET | `/api/historial/activos/:id` | todos |
| GET/POST | `/api/reportes` | administrador, técnico, almacén |
| GET/PUT | `/api/configuracion` | administrador (perfil: todos) |
| POST | `/api/auth/login` | público |
| POST | `/api/auth/registro` | administrador |

### 5.4 Errores, logs y validación

- Los servicios lanzan `ErrorHttp(status, mensaje)`; el middleware global responde.
- Los controllers simples no usan `try/catch`: Express 5 reenvía los errores async.
- `requestId` viaja en `x-request-id` y en el contexto de logs.
- Logs en JSON con `NODE_ENV=production`; texto legible en desarrollo.
- Se redactan `contrasena`, `password`, `token`, `authorization`, `x-api-key`, `secret`, `clave`, `hash`.
- Rate limits: global 1000/15 min, login 5/15 min, subidas 20/15 min.

Validación de entrada:

- `validar(schema)` valida el body.
- `validarQuery(schema)` valida los query params y deja el resultado en `req.validatedQuery`.
- `validarParams(schema)` valida los parámetros de ruta en `req.validatedParams`.
- Cada router registra `router.param("id", validarParamId)`; licencias añade `asiento`.
- Los esquemas viven en `schemas/query.ts`.
- Un parámetro inválido responde **400** con `{ error, errores }`, no 500.
- `page` y `limit` tienen límites: `1..100`.
- `orden` solo acepta `asc` o `desc`.
- Fechas en formato `YYYY-MM-DD`.
- Los booleanos solo aceptan `true` o `false`.

## 6. Variables de entorno

| Variable | Descripción |
| :--- | :--- |
| `SERVER_PORT` | Puerto HTTP (3030 por defecto) |
| `FRONTEND_URL` | Origen permitido por CORS |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL (`DB_NAME=nemi-db`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma y vigencia del token |
| `HASH_SERVICE_URL`, `HASH_SERVICE_KEY` | Microservicio Argon2id |
| `R2_*` | Credenciales de Cloudflare R2 |
| `SEED_PASSWORD` | Contraseña de los usuarios de ejemplo (solo seed) |

## 7. Comandos

```bash
bun run dev                # Servidor de desarrollo con recarga
bun run build              # Compilación TypeScript
bun run typecheck          # Verificación de tipos sin emitir
bun run check              # Biome (corrige)
bun run lint               # Solo lint
bun run format             # Solo formato
bun run db:generate        # Genera SQL desde schema.ts
bun run db:migrate         # Aplica migraciones
bun run db:seed            # Datos iniciales (idempotente)
bun run db:verify          # Verifica invariantes
bun run db:reset           # Borra tablas (solo local)
bun run db:studio          # Interfaz visual de Drizzle
bun run db:check           # Consistencia de migraciones
bun run db:admin           # Crea el primer administrador en una base nueva
bun run openapi:check      # Verifica la documentación OpenAPI
```

## 8. Convenciones y reglas críticas

1. Usa siempre **Bun**; nunca `npm`, `yarn` ni `pnpm`.
2. No ejecutes checks tras cada cambio: hazlos al final del conjunto.
3. No uses navegadores headless en este backend; verifica con `curl`.
4. Todo en español: variables de negocio, comentarios y documentación.
5. Prohibido `any`; usa tipos inferidos de Drizzle.
6. Toda entrada se valida con Zod.
7. No relajes autenticación ni permisos sin autorización.
8. Todo cambio de esquema requiere migración versionada.

## 9. Flujo de Git y despliegue

- **Prohibido** hacer commit o push sin la aprobación explícita del usuario.
- El desarrollo va en `develop`; el merge a `main` solo se hace con aprobación.
- Mensajes de commit con *Conventional Commits*, en minúsculas y en español.
- El despliegue es con **Docker + Dokploy**; el webhook está protegido con Cloudflare Access.

## 10. CI/CD

`push`/`PR` a `main`/`develop` ejecuta typecheck, Biome (`biome ci`), validación de migraciones y build de Docker. El deploy a Dokploy solo ocurre en `push` a `main`, vía webhook con Cloudflare Access.
