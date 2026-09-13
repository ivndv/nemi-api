# AGENTS.md — Guía para Agentes en Nemi API (`nemi-api`)

Guía operativa, arquitectónica y técnica para agentes de Inteligencia Artificial que colaboren en el desarrollo, mantenimiento y optimización del backend de **Nemi** (`nemi-api`).

---

## 1. Visión General del Proyecto

**nemi-api** es la API REST backend de **Nemi** (anteriormente Gestor de Activos IT), una plataforma empresarial diseñada para centralizar, auditar y rastrear los recursos tecnológicos (hardware, software, dispositivos y licencias) de una organización a lo largo de su ciclo de vida completo.

* **Propósito:** Proveer servicios backend desacoplados, autenticación segura basada en roles (RBAC), auditoría histórica, cálculo de alertas tempranas (vencimientos de garantías y licencias), subida y almacenamiento de imágenes en Cloudflare R2, y generación de reportes analíticos para el frontend en Angular.
* **Dominio API en Producción:** [https://nemi-api.fluxdv.icu](https://nemi-api.fluxdv.icu)
* **Frontend en Producción:** [https://nemi.mgdc.site](https://nemi.mgdc.site)
* **Swagger Docs:** [https://nemi-api.fluxdv.icu/api/docs](https://nemi-api.fluxdv.icu/api/docs)
* **Repositorio en GitHub:** [https://github.com/ivndv/nemi-api](https://github.com/ivndv/nemi-api)

---

## 2. Antes de Tocar Código (Contexto con CodeGraph)

Este proyecto cuenta con un grafo de conocimiento indexado con **CodeGraph**.

* **Uso del MCP CodeGraph:** Antes de realizar búsquedas masivas de texto (`grep`), listar directorios o leer múltiples archivos a ciegas, invoca la herramienta MCP `codegraph_explore` indicando:
  ```json
  {
    "projectPath": "/home/ivan/software-dev/nemi-api",
    "query": "tu consulta de arquitectura, símbolo o flujo"
  }
  ```
  Te proveerá el grafo de llamadas, blast radius y código verbatim de los símbolos en una sola llamada eficiente.
* **Sincronización del Índice:**
  Si creas o renombras archivos, sincroniza el índice ejecutando:
  ```bash
  codegraph sync /home/ivan/software-dev/nemi-api
  ```

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime & Gestor** | **Bun** / **Node.js** | Bun `v1.3.x` (`bun.lock`), Node `24.x` |
| **Lenguaje** | **TypeScript** | Modo estricto ESM (`tsconfig.json`, target ES2022) |
| **Framework Web** | **Express 5** | `express ^5.2.1` |
| **Base de Datos** | **MySQL 9** | Motor relacional local en Docker y producción en VPS |
| **ORM & Migraciones** | **Drizzle ORM** | `drizzle-orm ^0.45.2`, `mysql2 ^3.22.3`, `drizzle-kit ^0.31.9` |
| **Almacenamiento Cloud** | **Cloudflare R2** | `@aws-sdk/client-s3 ^3.1053.0` (Bucket central `assets-mgdc/nemi/`) |
| **Hash Microservice** | **Go + Argon2id** | Microservicio externo desacoplado (`hash-service` en puerto `3010`) |
| **Seguridad & Auth** | **JWT + Helmet + Rate Limit** | `jsonwebtoken ^9.0.3`, `helmet ^8.2.0`, `express-rate-limit ^8.5.2` |
| **Validación de Schemas**| **Zod** | `zod ^4.6.2` (Validación de body, query y env) |
| **Caché en Memoria** | **Node-Cache** | `node-cache ^5.1.2` (Caché auxiliar en servicios) |
| **Subida de Archivos** | **Multer** | `multer ^2.1.1` (Memoria intermedia antes de subida a R2) |
| **Documentación** | **Swagger UI Express** | `swagger-ui-express ^5.0.1`, `swagger-jsdoc ^6.2.8` |
| **Linter & Formatter** | **Biome 2** | `@biomejs/biome ^2.5.13` (`biome.json`) |
| **Infraestructura & CI/CD**| **Docker Swarm + Dokploy**| Despliegue automatizado con GitHub Actions en VPS Oracle Cloud |

---

## 4. Arquitectura y Estructura del Código

El backend implementa una arquitectura modular por capas con separación estricta de responsabilidades (SoC) y principios SOLID:

```plaintext
nemi-api/
├── .github/
│   └── workflows/ci-cd.yml      → Pipeline de CI/CD (lint, check, deploy via Dokploy API)
│
├── config/
│   ├── db.ts                    → Pool de conexiones MySQL y cliente Drizzle ORM
│   └── env.ts                   → Validación de variables de entorno con esquema Zod
│
├── controllers/                 → Controladores HTTP (reciben req, delegan a servicios, responden res)
│   ├── activosController.ts
│   ├── asignacionesController.ts
│   ├── authController.ts
│   ├── configuracionController.ts
│   ├── dashboardController.ts
│   ├── garantiasController.ts
│   ├── historialController.ts
│   └── reporteController.ts
│
├── db/
│   ├── schema.ts                → Esquema relacional Drizzle (11 tablas tipadas)
│   └── schema.sql               → DDL de referencia SQL
│
├── middleware/                  → Middlewares Express de infraestructura y seguridad
│   ├── autenticar.ts            → Validación de JWT y extracción de usuario en sesión
│   ├── errores.ts               → Manejo centralizado y seguro de errores HTTP
│   ├── intentos.ts              → Rate limit específico para protección anti-brute force en login
│   ├── limite.ts                → Rate limit global (1000 req / 15 min)
│   ├── permisos.ts              → Control de acceso basado en roles (RBAC: Administrador/Usuario)
│   ├── seguridad.ts             → Configuración de Helmet y CORS con whitelist dinámica
│   ├── subida.ts                → Middleware de Multer para parseo de archivos multipart
│   └── validar.ts               → Middleware de validación con esquemas Zod
│
├── routes/                      → Declaración de rutas y aplicación de middlewares en cadena
│   ├── activosRoutes.ts
│   ├── asignacionesRoutes.ts
│   ├── authRoutes.ts
│   ├── configuracionRoutes.ts
│   ├── dashboardRoutes.ts
│   ├── garantiasRoutes.ts
│   ├── healthRoutes.ts
│   ├── historialRoutes.ts
│   └── reporteRoutes.ts
│
├── schemas/                     → Contratos y esquemas de validación Zod (body y query params)
│   ├── activos.ts
│   ├── asignaciones.ts
│   ├── auth.ts
│   ├── configuracion.ts
│   ├── garantias.ts
│   ├── historial.ts
│   └── reporte.ts
│
├── services/                    → Lógica de negocio pura, consultas a base de datos y clientes externos
│   ├── activosService.ts        → Gestión de activos, estados, bajas y búsqueda multicriterio
│   ├── asignacionesService.ts   → Asignaciones de activos a personal y actualización de estados
│   ├── authService.ts           → Inicio de sesión, registro y emisión de JWT
│   ├── configuracionService.ts  → Parámetros globales de la organización
│   ├── dashboardService.ts      → Agregaciones estadísticas y métricas del sistema
│   ├── garantiasService.ts      → Alertas tempranas de licencias y garantías
│   ├── hashService.ts           → Cliente HTTP que delega en el microservicio externo Argon2id
│   ├── historialService.ts      → Trazabilidad del ciclo de vida de los activos
│   ├── logger.ts                → Logger estructurado para eventos y errores
│   ├── r2Service.ts             → Subida y eliminación de fotos en Cloudflare R2 (`assets-mgdc/nemi/`)
│   └── reportes/                → Motor de reportes basado en Patrón Estrategia (Strategy Pattern)
│       ├── EstrategiaReporte.ts
│       ├── registroReporte.ts
│       └── tipos/ (ReporteCostos, ReportePorTipo, etc.)
│
├── swagger/                     → Especificación OpenAPI / Swagger de la API
│   └── swagger.ts
│
├── app.ts                       → Montaje de Express, middlewares globales y rutas
├── server.ts                    → Inicialización del servidor HTTP y Graceful Shutdown
├── drizzle.config.ts            → Configuración de Drizzle Kit
└── biome.json                   → Configuración de linter y formateador Biome
```

---

## 5. Patrones de Diseño Clave

1. **Patrón Estrategia (Strategy Pattern) en Reportes:**
   * Ubicado en `services/reportes/`.
   * Permite agregar nuevos tipos de reportes (ej. Costos, Tipos, Ubicaciones) implementando la interfaz `EstrategiaReporte` y registrándolos en `registroReporte.ts` sin modificar el controlador ni la ruta.
2. **Microservicio de Hashing Externo (Argon2id):**
   * En lugar de cargar la CPU de Node/Bun con algoritmos pesados de derivación de claves, `services/hashService.ts` consume un microservicio en Go (`hash-service`) vía HTTP con autenticación por encabezado `x-api-key`.
3. **Almacenamiento Centralizado en Cloudflare R2:**
   * Las fotos de activos se almacenan en el bucket centralizado `assets-mgdc` bajo el prefijo `nemi/`.
   * Las URLs públicas resultantes siguen el formato canónico `https://assets.mgdc.site/nemi/{uuid}-{slug}.{ext}`.

---

## 6. Comandos de Desarrollo y Tooling

Todos los comandos del backend se ejecutan con **Bun**:

```bash
# Iniciar servidor en modo desarrollo (recarga automática con tsx)
bun run dev

# Compilación de TypeScript a JavaScript (dist/)
bun run build

# Verificación de tipos estáticos sin emitir archivos
bun run typecheck

# Verificación y corrección de formato y linter con Biome
bun run check
bun run lint
bun run format

# Gestión de base de datos con Drizzle Kit
bun run db:generate   # Generar migraciones SQL
bun run db:migrate    # Ejecutar migraciones en la base de datos
bun run db:push       # Sincronizar schema directamente con MySQL
bun run db:studio     # Abrir interfaz visual Drizzle Studio
```

---

## 7. Convenciones Obligatorias para Agentes

### 7.1 Regla de Oro en Ejecución de Tests y Checks
* **PROHIBIDO ejecutar comprobaciones de forma reactiva tras cada pequeño cambio.** Realiza todas las modificaciones primero; ejecuta `bun run check` y `bun run typecheck` **una sola vez al final** cuando todo el conjunto esté listo y verificado.

### 7.2 Restricción Estricta de Herramientas
* **PROHIBIDO el uso de navegadores headless (Playwright/Puppeteer)** en este proyecto backend. Toda prueba o verificación se realiza a nivel HTTP mediante `curl`, health checks o tests automatizados.

### 7.3 Uso de CodeGraph
* Antes de realizar búsquedas a ciegas, utiliza el MCP `codegraph` (`codegraph_explore`).
* Si creas nuevos módulos, controladores o servicios, mantén el índice al día ejecutando:
  ```bash
  codegraph sync /home/ivan/software-dev/nemi-api
  ```

### 7.4 Estilo de Código, Comentarios y Tipado
* **Lenguaje:** Todo el código, nombres de variables de negocio, comentarios y documentación deben redactarse en **español**.
* **Comentarios de 1 sola línea:** Directos, concisos y explicativos del *por qué*, sin bloques multilínea redundantes.
* **Tipado estricto:** Prohibido el uso de `any`. Define interfaces explícitas o aprovecha los tipos inferidos de Drizzle (`typeof activos.$inferSelect`, `typeof usuarios.$inferInsert`).
* **Validación en entrada:** Todo endpoint que reciba datos de usuario debe validar con su esquema Zod correspondiente mediante el middleware `validar(schema)`.

### 7.5 Flujo de Git y Despliegues
* **PROHIBIDO realizar commits o push sin la confirmación y aprobación explícita del usuario.**
* **Flujo de ramas:** Todo desarrollo se realiza en la rama `develop`.
* **Despliegue a Producción:** El merge a la rama `main` activa el pipeline de GitHub Actions (`ci-cd.yml`), el cual verifica el código con Biome y dispara el webhook de despliegue en Dokploy automáticamente.
* **Mensajes de commit:** Seguir estrictamente *Conventional Commits* en minúsculas y español (`feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `docs: ...`).
