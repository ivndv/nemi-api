# Etapa de construcción
FROM oven/bun:1.4.4-alpine AS builder

WORKDIR /app

# Dependencias con versiones exactas
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Código fuente y compilación
COPY . .
RUN bun run build

# Etapa de producción
FROM oven/bun:1.4.4-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV SERVER_PORT=3030

# Solo dependencias de producción
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# Código compilado, migraciones y fuentes que Bun ejecuta en runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/db ./db
COPY --from=builder /app/config ./config
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/schemas ./schemas
COPY --from=builder /app/services ./services
COPY --from=builder /app/openapi ./openapi
COPY --from=builder /app/app.ts ./app.ts
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/types.d.ts ./types.d.ts

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3030/api/health || exit 1

# Aplica migraciones pendientes y arranca el servidor
CMD ["sh", "-c", "bun db/migrate.ts && bun server.ts"]
