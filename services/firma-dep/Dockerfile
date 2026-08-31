# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ── Stage 2: produccion ────────────────────────────────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

# Usuario sin privilegios
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Dependencias de produccion (ya pruned en builder; evita 2º npm ci con lock desincronizado)
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Artefactos del build
COPY --from=builder /app/dist ./dist

# Assets estaticos (logo para el sello de firma)
COPY --from=builder /app/assets ./assets

# Directorio de logs con permisos correctos
RUN mkdir -p logs && chown -R nestjs:nodejs logs

USER nestjs

EXPOSE 4010

CMD ["node", "dist/main"]
