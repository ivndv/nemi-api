# Modelo de datos — Nemi

Documento conceptual de la base de datos: qué hace el sistema, qué conceptos maneja,
cómo se relacionan y qué reglas no se pueden romper.

Este documento manda sobre el código. El `db/schema.ts` y las migraciones se derivan de aquí.

## 1. Propósito y alcance

Nemi es una herramienta interna del departamento de TI para administrar el ciclo de vida
de los activos tecnológicos de una organización: hardware, software, licencias, garantías
y mantenimientos.

Alcance del modelo:

- **Una sola empresa**, con **varias sedes**.
- Varios **departamentos** por sede.
- Empleados que consultan, solicitan y reportan.
- Personal de TI que administra inventario, asignaciones y soporte.

Fuera de alcance por ahora: multiempresa, facturación, compras y contabilidad.

## 2. Glosario

| Concepto          | Definición                                                       |
| ----------------- | ---------------------------------------------------------------- |
| **Sede**          | Ubicación física de la organización (ciudad o edificio).         |
| **Ubicación**     | Punto dentro de una sede: piso, sala, almacén. Forma un árbol.   |
| **Persona**       | Empleado registrado. Puede autenticarse y tener un rol.          |
| **Activo**        | Bien tecnológico con identidad e historial propios.              |
| **Licencia**      | Activo de categoría `licencia` con asientos y renovación.        |
| **Asignación**    | Vínculo temporal entre un activo de hardware y una persona.      |
| **Asiento**       | Unidad de uso de una licencia, asignable a una persona o equipo. |
| **Garantía**      | Cobertura de un proveedor sobre un activo, con vigencia.         |
| **Mantenimiento** | Intervención técnica sobre un activo, interna o externa.         |
| **Solicitud**     | Petición de un empleado para recibir un activo.                  |
| **Incidencia**    | Reporte de una falla sobre un activo.                            |
| **Evento**        | Registro inmutable de algo que ocurrió en el sistema.            |
| **Alerta**        | Aviso derivado de fechas. No se almacena: se calcula.            |

## 3. Actores y permisos

| Rol               | Descripción                                          |
| ----------------- | ---------------------------------------------------- |
| **Administrador** | Control total, incluidos usuarios y configuración.   |
| **Técnico**       | Soporte: incidencias, mantenimientos, asignaciones.  |
| **Almacén**       | Inventario físico: altas, ubicaciones, entregas.     |
| **Empleado**      | Consulta lo suyo, solicita activos y reporta fallas. |

| Capacidad                | Admin | Técnico | Almacén | Empleado |
| ------------------------ | :---: | :-----: | :-----: | :------: |
| Ver inventario completo  |  ✅   |   ✅    |   ✅    |    ❌    |
| Crear y editar activos   |  ✅   |   ✅    |   ✅    |    ❌    |
| Dar de baja activos      |  ✅   |   ✅    |   ❌    |    ❌    |
| Asignar y entregar       |  ✅   |   ✅    |   ✅    |    ❌    |
| Aprobar solicitudes      |  ✅   |   ✅    |   ❌    |    ❌    |
| Atender incidencias      |  ✅   |   ✅    |   ❌    |    ❌    |
| Abrir mantenimientos     |  ✅   |   ✅    |   ❌    |    ❌    |
| Gestionar garantías      |  ✅   |   ✅    |   ❌    |    ❌    |
| Generar reportes         |  ✅   |   ✅    |   ✅    |    ❌    |
| Solicitar un activo      |  ✅   |   ✅    |   ✅    |    ✅    |
| Reportar una incidencia  |  ✅   |   ✅    |   ✅    |    ✅    |
| Usuarios y configuración |  ✅   |   ❌    |   ❌    |    ❌    |
| Ver únicamente lo propio |  ✅   |   ✅    |   ✅    |    ✅    |

## 4. Entidades

Convenciones de este documento: `id` es la llave primaria salvo que se indique otra cosa.
`created_at`, `updated_at` y `deleted_at` se omiten en las listas para no repetirlos.

### 4.1 Organización

#### `sedes`

| Atributo     | Tipo  | Notas       |
| ------------ | ----- | ----------- |
| `nombre`     | texto | Único       |
| `ciudad`     | texto |             |
| `direccion`  | texto |             |
| `deleted_at` | fecha | Baja lógica |

#### `ubicaciones`

Árbol dentro de una sede.

| Atributo     | Tipo  | Notas                                 |
| ------------ | ----- | ------------------------------------- |
| `sede_id`    | FK    | Obligatorio                           |
| `padre_id`   | FK    | Auto-referencia, nulo en la raíz      |
| `nombre`     | texto | Único dentro del padre                |
| `tipo`       | enum  | `edificio`, `piso`, `sala`, `almacen` |
| `deleted_at` | fecha | Baja lógica                           |

#### `roles`

| Atributo | Tipo  | Notas            |
| -------- | ----- | ---------------- |
| `slug`   | texto | Único, estable   |
| `nombre` | texto | Etiqueta visible |

#### `departamentos`

| Atributo     | Tipo  | Notas |
| ------------ | ----- | ----- |
| `nombre`     | texto | Único |
| `deleted_at` | fecha |       |

#### `personas`

| Atributo          | Tipo  | Notas                                             |
| ----------------- | ----- | ------------------------------------------------- |
| `nombre`          | texto |                                                   |
| `email`           | texto | Único, credencial de acceso                       |
| `contrasena`      | texto | Hash Argon2id                                     |
| `departamento_id` | FK    |                                                   |
| `sede_id`         | FK    |                                                   |
| `fecha_ingreso`   | fecha |                                                   |
| `rol`             | enum  | `administrador`, `tecnico`, `almacen`, `empleado` |
| `foto_url`        | texto |                                                   |
| `ultimo_acceso`   | fecha |                                                   |
| `deleted_at`      | fecha | Nunca se borra: se desactiva                      |

### 4.2 Catálogos

#### `tipos_activo`

| Atributo      | Tipo  | Notas                                                       |
| ------------- | ----- | ----------------------------------------------------------- |
| `nombre`      | texto | Único                                                       |
| `slug`        | texto | Único, estable                                              |
| `categoria`   | enum  | `hardware`, `software`, `licencia`, `servicio`, `accesorio` |
| `descripcion` | texto |                                                             |

#### `proveedores`

| Atributo    | Tipo  | Notas                          |
| ----------- | ----- | ------------------------------ |
| `nombre`    | texto | Único                          |
| `tipo`      | enum  | `bienes`, `servicios`, `ambos` |
| `contacto`  | texto |                                |
| `telefono`  | texto |                                |
| `email`     | texto |                                |
| `direccion` | texto |                                |
| `notas`     | texto |                                |

#### `acciones`

Catálogo cerrado de eventos. Evita textos libres y errores de captura.

| Atributo | Tipo  | Notas          |
| -------- | ----- | -------------- |
| `slug`   | texto | Único, estable |
| `nombre` | texto |                |

Ejemplos: `activo.creado`, `activo.actualizado`, `activo.baja`, `asignacion.creada`,
`asignacion.devuelta`, `garantia.creada`, `mantenimiento.abierto`, `solicitud.aprobada`.

#### `tipos_reporte`

| Atributo      | Tipo  | Notas                                   |
| ------------- | ----- | --------------------------------------- |
| `slug`        | texto | Único; mapea a la estrategia de reporte |
| `nombre`      | texto |                                         |
| `descripcion` | texto |                                         |
| `activo`      | bool  |                                         |

### 4.3 Inventario

#### `activos`

Un activo es cualquier bien inventariable. Si su categoría es `licencia`, se extiende con
la tabla `licencias`.

| Atributo            | Tipo    | Notas                                      |
| ------------------- | ------- | ------------------------------------------ |
| `nombre`            | texto   |                                            |
| `tipo_id`           | FK      |                                            |
| `proveedor_id`      | FK      |                                            |
| `ubicacion_id`      | FK      | Ubicación actual                           |
| `dueno_id`          | FK      | Responsable del bien, opcional             |
| `etiqueta_serial`   | texto   | **Único** cuando no es nulo                |
| `estado`            | enum    | `disponible`, `asignado`, `mantenimiento`  |
| `condicion`         | enum    | `nuevo`, `usado`, `danado`                 |
| `fecha_adquisicion` | fecha   |                                            |
| `valor_compra`      | decimal | 12,2                                       |
| `modelo`            | texto   |                                            |
| `descripcion`       | texto   |                                            |
| `foto_url`          | texto   |                                            |
| `deleted_at`        | fecha   | Baja lógica: reemplaza a `activo` y `baja` |

Notas:

- No existe el estado `dado de baja`. La baja es `deleted_at`.
- No existe la columna `activo` (0/1). Sería redundante con `deleted_at`.
- `fecha_salida` desaparece: la baja queda en `deleted_at` y en el evento correspondiente.

#### `licencias`

Extensión 1:1 de un activo de categoría `licencia`.

| Atributo                | Tipo   | Notas                                              |
| ----------------------- | ------ | -------------------------------------------------- |
| `activo_id`             | FK     | 1:1 con `activos`                                  |
| `modalidad`             | enum   | `perpetua`, `suscripcion`                          |
| `tipo_uso`              | enum   | `dispositivo`, `usuario`, `concurrente`, `volumen` |
| `asientos_comprados`    | entero | Mínimo 1                                           |
| `referencia_clave`      | texto  | Enlace al gestor de secretos, no la clave          |
| `renovacion_automatica` | bool   |                                                    |
| `fecha_renovacion`      | fecha  | Nula en perpetuas                                  |
| `periodicidad_costo`    | enum   | `mensual`, `anual`, `unica`                        |

El estado de una licencia **se calcula** a partir de los asientos y se sincroniza en
`activos.estado` cada vez que se asigna, libera o renueva:

- `asientos_libres = asientos_comprados − asientos asignados activos`
- `asientos_libres > 0` → disponible
- `asientos_libres = 0` → asignada
- `fecha_renovacion < hoy` → vencida

#### `adjuntos`

Archivos asociados a cualquier entidad: facturas, pólizas, actas, fotos.

| Atributo     | Tipo   | Notas                                                           |
| ------------ | ------ | --------------------------------------------------------------- |
| `entidad`    | enum   | `activo`, `garantia`, `mantenimiento`, `incidencia`, `licencia` |
| `entidad_id` | entero |                                                                 |
| `tipo`       | enum   | `factura`, `poliza`, `acta`, `foto`, `otro`                     |
| `nombre`     | texto  |                                                                 |
| `key`        | texto  | Clave del objeto en R2 (para borrarlo)                          |
| `url`        | texto  | URL pública en R2                                               |
| `mime`       | texto  | Obligatorio                                                     |
| `tamano`     | entero | Bytes, obligatorio                                              |
| `subido_por` | FK     |                                                                 |
| `updated_at` | fecha  |                                                                 |
| `deleted_at` | fecha  | Baja lógica; el archivo se borra de R2                          |

### 4.4 Movimientos

#### `asignaciones`

Vínculo entre un activo de hardware y una persona.

| Atributo                   | Tipo  | Notas                          |
| -------------------------- | ----- | ------------------------------ |
| `activo_id`                | FK    |                                |
| `persona_id`               | FK    |                                |
| `departamento_id`          | FK    | Snapshot al momento de asignar |
| `ubicacion_id`             | FK    | Snapshot al momento de asignar |
| `fecha_asignacion`         | fecha |                                |
| `fecha_devolucion_pactada` | fecha | Para alertas de devolución     |
| `fecha_devolucion_real`    | fecha | Nula mientras siga activa      |
| `comentarios`              | texto |                                |

Estados: `activa` (sin devolución real) y `devuelta` (con fecha real).

El departamento y la ubicación se copian en la asignación para que el histórico no cambie
si la persona se mueve de área o de sede después.

#### `asignaciones_licencia`

Consumo de asientos.

| Atributo           | Tipo   | Notas                                 |
| ------------------ | ------ | ------------------------------------- |
| `licencia_id`      | FK     | Activo de categoría licencia          |
| `asiento`          | entero | 1..`asientos_comprados`               |
| `destino_tipo`     | enum   | `persona`, `activo`                   |
| `persona_id`       | FK     | Nulo si el destino es un activo       |
| `activo_id`        | FK     | Nulo si el destino es una persona     |
| `fecha_asignacion` | fecha  |                                       |
| `fecha_liberacion` | fecha  | Nula mientras el asiento esté ocupado |

#### `mantenimientos`

| Atributo        | Tipo    | Notas                      |
| --------------- | ------- | -------------------------- |
| `activo_id`     | FK      |                            |
| `responsable`   | enum    | `interno`, `externo`       |
| `tecnico_id`    | FK      | Obligatorio si es interno  |
| `proveedor_id`  | FK      | Obligatorio si es externo  |
| `tipo`          | enum    | `preventivo`, `correctivo` |
| `fecha_salida`  | fecha   |                            |
| `fecha_retorno` | fecha   | Nula mientras siga abierto |
| `diagnostico`   | texto   |                            |
| `costo`         | decimal | 12,2                       |

Estados: `abierto`, `cerrado`.

#### `solicitudes`

| Atributo           | Tipo  | Notas                                             |
| ------------------ | ----- | ------------------------------------------------- |
| `solicitante_id`   | FK    |                                                   |
| `tipo`             | enum  | `equipo`, `licencia`, `accesorio`, `reemplazo`    |
| `tipo_activo_id`   | FK    | Opcional                                          |
| `motivo`           | texto |                                                   |
| `prioridad`        | enum  | `baja`, `media`, `alta`                           |
| `estado`           | enum  | `pendiente`, `aprobada`, `rechazada`, `entregada` |
| `resuelta_por`     | FK    |                                                   |
| `activo_id`        | FK    | Se llena al entregar                              |
| `fecha_resolucion` | fecha |                                                   |

#### `incidencias`

| Atributo           | Tipo  | Notas                                           |
| ------------------ | ----- | ----------------------------------------------- |
| `activo_id`        | FK    |                                                 |
| `reportante_id`    | FK    |                                                 |
| `descripcion`      | texto |                                                 |
| `prioridad`        | enum  | `baja`, `media`, `alta`                         |
| `estado`           | enum  | `abierta`, `en_revision`, `resuelta`, `cerrada` |
| `mantenimiento_id` | FK    | Se llena si el técnico decide abrir uno         |
| `fecha_resolucion` | fecha |                                                 |

La incidencia **solo se reporta**. El técnico decide si abre mantenimiento.

#### `renovaciones_licencia`

| Atributo      | Tipo    | Notas       |
| ------------- | ------- | ----------- |
| `licencia_id` | FK      |             |
| `fecha`       | fecha   |             |
| `asientos`    | entero  |             |
| `costo`       | decimal | 12,2        |
| `adjunto_id`  | FK      | Comprobante |

### 4.5 Cobertura

#### `garantias`

| Atributo       | Tipo    | Notas                    |
| -------------- | ------- | ------------------------ |
| `activo_id`    | FK      |                          |
| `proveedor_id` | FK      |                          |
| `nombre`       | texto   |                          |
| `fecha_inicio` | fecha   |                          |
| `fecha_fin`    | fecha   | Debe ser mayor al inicio |
| `costo`        | decimal | 12,2                     |
| `condiciones`  | texto   |                          |
| `descripcion`  | texto   |                          |

Varias garantías por activo, sin solapamiento. El estado (`vigente`, `por vencer`,
`vencida`) se calcula con `fecha_fin`; no se almacena.

### 4.6 Auditoría y sistema

#### `eventos`

Bitácora inmutable de todo lo relevante.

| Atributo           | Tipo   | Notas                                                                                                 |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------- |
| `entidad`          | enum   | `activo`, `asignacion`, `garantia`, `mantenimiento`, `solicitud`, `incidencia`, `persona`, `licencia` |
| `entidad_id`       | entero |                                                                                                       |
| `accion_id`        | FK     | Catálogo `acciones`                                                                                   |
| `actor_id`         | FK     | Quién ejecutó la acción                                                                               |
| `datos_anteriores` | JSON   | Opcional                                                                                              |
| `datos_nuevos`     | JSON   | Opcional                                                                                              |

El diff permite reconstruir qué cambió sin guardar copias completas:

```json
{
	"datos_anteriores": { "estado": "asignado", "ubicacion_id": 4 },
	"datos_nuevos": { "estado": "disponible", "ubicacion_id": 2 }
}
```

#### `configuracion`

Fila única.

| Atributo                    | Tipo   | Notas          |
| --------------------------- | ------ | -------------- |
| `id`                        | entero | Siempre 1      |
| `idioma`                    | texto  |                |
| `zona_horaria`              | texto  |                |
| `moneda`                    | texto  |                |
| `formato_fecha`             | texto  |                |
| `dias_alerta_licencia`      | entero | Por defecto 30 |
| `dias_alerta_garantia`      | entero | Por defecto 30 |
| `dias_alerta_devolucion`    | entero | Por defecto 7  |
| `dias_alerta_mantenimiento` | entero | Por defecto 3  |

### 4.7 Unicidad con baja lógica

Los campos únicos que conviven con `deleted_at` usan una columna generada:

```sql
email_activo = IF(deleted_at IS NULL, email, NULL)
UNIQUE (email_activo)
```

Así el valor queda libre al dar de baja y se conserva en el histórico. Aplica a:

- `personas.email`
- `activos.etiqueta_serial`
- `proveedores.nombre`
- `tipos_activo.nombre` y `slug`
- `departamentos.nombre`, `sedes.nombre`
- `ubicaciones (sede_id, nombre)`

### 4.8 Reportes por rol

- `tipos_reporte.alcance`: `global` o `propio`.
- `tipos_reporte_roles` asigna qué rol ve cada reporte.
- `reportes_generados` audita quién generó, con qué filtros y cuántas filas.
- Los resultados no se almacenan.

## 5. Relaciones

```text
sedes ──1:N── ubicaciones (auto-referencia en padre_id)
sedes ──1:N── personas
departamentos ──1:N── personas

tipos_activo ──1:N── activos
proveedores ──1:N── activos
proveedores ──1:N── garantias
proveedores ──1:N── mantenimientos
ubicaciones ──1:N── activos

activos ──1:N── asignaciones
personas ──1:N── asignaciones
asignaciones ──N:1── departamentos
asignaciones ──N:1── ubicaciones

activos ──1:1── licencias
licencias ──1:N── asignaciones_licencia
licencias ──1:N── renovaciones_licencia

activos ──1:N── garantias
activos ──1:N── mantenimientos
activos ──1:N── incidencias

personas ──1:N── solicitudes
personas ──1:N── incidencias
```

Cardinalidades que importan:

| Regla                                     | Cardinalidad efectiva         |
| ----------------------------------------- | ----------------------------- |
| Asignación activa por activo de hardware  | máximo 1                      |
| Asignación activa por asiento de licencia | máximo 1                      |
| Garantías activas por activo              | N, sin solapamiento de fechas |
| Mantenimientos abiertos por activo        | máximo 1                      |

## 6. Reglas de negocio

1. Un activo tiene un solo estado actual.
2. Un activo de hardware tiene como máximo una asignación activa.
3. Una licencia tiene como máximo una asignación activa por asiento.
4. Reasignar exige devolver primero: el activo vuelve a `disponible`.
5. Dar de baja exige que el activo esté `disponible` y sin mantenimiento abierto.
6. Un activo en mantenimiento no se puede asignar.
7. Una devolución registra fecha real, ubicación y condición.
8. Las garantías de un activo no pueden solaparse en fechas.
9. `fecha_fin` de una garantía debe ser posterior a `fecha_inicio`.
10. Una solicitud solo se entrega si está `aprobada`.
11. Una incidencia la abre cualquier usuario; un mantenimiento solo Técnico o Admin.
12. Todo cambio relevante genera un evento con diff.
13. Nada se borra físicamente: se usa `deleted_at`, salvo adjuntos, cuyo archivo sí se elimina de R2.
    13.1. Un activo con licencia no se asigna como hardware: usa asientos.
    13.2. Los únicos se liberan al dar de baja (columnas generadas).
14. `etiqueta_serial` es única cuando existe.
15. La configuración es una sola fila con `id = 1`.

## 7. Máquinas de estado

### Activo

```text
alta ──▶ disponible ──asignar──▶ asignado ──devolver──▶ disponible
             │                        │
             │ mantenimiento          │ mantenimiento
             ▼                        ▼
        mantenimiento ──retorno──▶ disponible

cualquier estado ──baja──▶ archivado (deleted_at, terminal)
```

### Asignación

```text
activa ──devolución real──▶ devuelta
activa ──devolución pactada vencida──▶ (sigue activa, genera alerta)
```

### Solicitud

```text
pendiente ──aprobar──▶ aprobada ──entregar──▶ entregada
     └──────rechazar──▶ rechazada
```

### Incidencia

```text
abierta ──revisar──▶ en_revision ──resolver──▶ resuelta ──cerrar──▶ cerrada
                            └──abrir mantenimiento──▶ (mantenimiento abierto)
```

### Mantenimiento

```text
abierto ──retorno del activo──▶ cerrado
```

### Garantía

```text
(vigente) ──se acerca fecha_fin──▶ (por vencer) ──pasa fecha_fin──▶ (vencida)
```

Calculado, no almacenado.

### Licencia

```text
disponible (asientos libres) ──se ocupan todos──▶ asignada
asignada ──se libera un asiento──▶ disponible
cualquiera ──fecha_renovacion vencida──▶ vencida
```

## 8. Licencias en detalle

### Casos reales

| Caso             | Ejemplo               | Tipo de uso   | Asientos |
| ---------------- | --------------------- | ------------- | -------- |
| Por equipo (OEM) | Windows 11, antivirus | `dispositivo` | 1        |
| Por usuario      | Microsoft 365, Adobe  | `usuario`     | N        |
| Volumen          | SQL Server, CALs      | `volumen`     | N        |
| Concurrente      | AutoCAD en red        | `concurrente` | N (pool) |

### Asignación por caso

- **Dispositivo**: `destino_tipo = activo`, `activo_id` apunta al equipo. Si el equipo se
  da de baja, el asiento se libera.
- **Usuario**: `destino_tipo = persona`, un asiento por persona.
- **Volumen**: igual que usuario o dispositivo, según cómo se instale.
- **Concurrente**: no se asignan asientos; solo se controlan vigencia y costo.

### Complianza

```text
asientos_libres = asientos_comprados − asientos ocupados
asientos_libres < 0  →  sobredespliegue
```

La alerta de sobredespliegue queda pendiente para una fase posterior.

### Claves de producto

No se almacenan. `referencia_clave` guarda una referencia al gestor de contraseñas
(por ejemplo, "Ver Bitwarden → M365"). Si más adelante se necesitan dentro del sistema,
se agrega un campo cifrado con AES-256-GCM y una clave en variables de entorno; la API
nunca las devolvería.

## 9. Modelo de eventos

`eventos` reemplaza a `historial`. Ventajas:

- Un solo timeline para activos, asignaciones, garantías, mantenimientos y solicitudes.
- Acciones cerradas por catálogo, sin errores de captura.
- Diff antes/después para auditoría real.
- Se puede filtrar por entidad, acción, actor y fecha.

Se escribe **dentro de la misma transacción** que la operación que lo origina. Si la
operación falla, el evento no existe.

## 10. Decisiones tomadas

| Tema               | Decisión                                                  |
| ------------------ | --------------------------------------------------------- |
| Licencias          | Son activos de categoría `licencia`, con tabla de detalle |
| Asientos           | Modelados por `asignaciones_licencia`, uno por asiento    |
| Devolución         | Se separan fecha pactada y fecha real                     |
| Mantenimiento      | Tabla propia, interno o externo                           |
| Asignación         | A persona, con snapshot de departamento y ubicación       |
| Sedes              | Sí, con jerarquía de ubicaciones                          |
| Garantías          | Varias por activo, sin solapamiento                       |
| Baja               | Solo `deleted_at`, exige devolución previa                |
| Roles              | Administrador, Técnico, Almacén, Empleado                 |
| Solicitudes        | Incluidas en el MVP; aprueba Admin o Técnico              |
| Incidencias        | Solo reporte; el técnico decide abrir mantenimiento       |
| Adjuntos           | Incluidos: facturas, pólizas, actas y fotos               |
| Empresa            | Una sola; no se modela `empresa_id`                       |
| Claves de licencia | No se almacenan; solo referencia al gestor de secretos    |
| Reportes           | No se persisten; son consultas                            |

## 11. Pendientes

- Alerta de sobredespliegue de licencias.
- Notificaciones por correo o en la aplicación.
- Historial de cambios de precio y asientos por renovación.
- Multiempresa, si algún día se necesita.
- Portal externo para empleados sin acceso a todo el inventario.

## 12. Migraciones y herramientas

El esquema vive en `db/schema.ts`. La base solo se toca con migraciones versionadas.

```text
drizzle/
├── 0000_init.sql
├── 0001_fecha_ingreso.sql
└── meta/
```

| Comando               | Qué hace                                        |
| --------------------- | ----------------------------------------------- |
| `bun run db:generate` | Genera una migración a partir de `db/schema.ts` |
| `bun run db:migrate`  | Aplica las migraciones pendientes               |
| `bun run db:seed`     | Carga los datos iniciales (idempotente)         |
| `bun run db:verify`   | Verifica conteos e invariantes                  |
| `bun run db:reset`    | Borra las tablas de la base actual              |
| `bun run db:studio`   | Abre Drizzle Studio                             |
| `bun run db:check`    | Valida que las migraciones sean consistentes    |

Reglas:

- **Nunca** `drizzle-kit push` fuera de una máquina local de pruebas.
- Todo cambio de esquema: editar `db/schema.ts`, generar, revisar el SQL y commitear.
- Las migraciones son solo hacia adelante; el rollback es restaurar un respaldo.
- `db/seed.ts` no se ejecuta en producción.
- Los códigos de la base (`disponible`, `asignado`) se traducen a etiquetas en la capa de
  servicios para no romper el contrato del frontend.
