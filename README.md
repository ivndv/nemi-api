# Gestor de Activos IT (Backend)

## Descripción

Este proyecto funciona como la API del Gestor de Activos IT, un sistema diseñado para administrar y rastrear los recursos tecnológicos de una organización. Este backend se encarga de procesar la lógica, validar la información y proveer los datos necesarios a la aplicación web.

## Características

- **Inventario Centralizado**: Mantiene un registro estructurado del hardware, software y dispositivos de la empresa.
- **Alertas Tempranas**: Calcula fechas para advertir sobre garantías próximas a expirar, licencias por vencer y activos en mantenimiento.
- **Seguimiento de Ciclo de Vida**: Guarda el historial de cada equipo, desde su adquisición y asignación, hasta su baja.
- **Búsqueda y Filtros**: Proporciona funciones para realizar búsquedas rápidas y filtrado por estado, tipo o ubicación.

## Secciones

1. **Autenticación**: login con JWT y roles (Administrador).
2. **Dashboard**: resumen y alertas del inventario.
3. **Activos**: alta, consulta, edición y baja de equipos.
4. **Asignaciones**: vínculo entre equipos y personal.
5. **Historial**: cambios por activo.
6. **Garantías**: vencimientos y mantenimientos.
7. **Reportes**: generación de reportes.
8. **Configuración**: datos de la aplicación y perfil.

### Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio |
| `POST` | `/api/auth/login` | Inicio de sesión |
| `POST` | `/api/auth/registro` | Alta de usuario (solo Administrador) |
| `GET` | `/api/dashboard/resumen` | Resumen del inventario |
| `GET` | `/api/dashboard/alertas` | Alertas de garantías y mantenimiento |
| `GET` | `/api/gestion-activos/activos` | Listado de activos |
| `GET` | `/api/asignaciones` | Asignaciones registradas |
| `GET` | `/api/historial/activos/:id` | Historial de un activo |
| `GET` | `/api/garantias` | Garantías y vencimientos |
| `GET` | `/api/reportes/tipos` | Tipos de reporte |
| `GET` | `/api/configuracion/aplicacion` | Configuración de la aplicación |
| `GET` | `/api/docs` | Swagger UI |

## Uso

- **Integración Base**: Esta API está diseñada para proveer los datos directamente a la aplicación en Angular.
- **Formato Estándar**: Todas las comunicaciones y envío de datos se manejan en formato JSON.
- **Rutas Protegidas**: Las operaciones de creación o edición de inventario requieren credenciales de autorización.

## Tecnologías Utilizadas

- Bun
- Express 5
- TypeScript
- Drizzle ORM
- MySQL
- Zod
- Swagger (OpenAPI)
- Biome
- Docker


## Créditos

Este es el proyecto encargado de la gestión de información para el sistema empresarial.

- Desarrollado por Ivan Cruz.

## Despliegue

Este motor de datos se encuentra desplegado y administrado permanentemente a través de **Dokploy** en un servidor VPS.

Puedes consultar la documentación interactiva de la API (Swagger) aquí: [Nemi API](https://nemi-api.fluxdv.icu/api/docs)

## Licencia

[PolyForm Noncommercial 1.0.0](LICENSE). Uso personal y no comercial; el uso comercial requiere permiso.

© 2026 Ivan Cruz
