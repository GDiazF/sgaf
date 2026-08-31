# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:26-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: produccion ────────────────────────────────────────────────────────
FROM node:26-alpine AS production

WORKDIR /app

# Usuario sin privilegios
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Solo dependencias de produccion
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Artefactos del build
COPY --from=builder /app/dist ./dist

# Assets estaticos (logo para el sello de firma)
COPY --from=builder /app/assets ./assets

# Directorio de logs con permisos correctos
RUN mkdir -p logs && chown -R nestjs:nodejs logs

USER nestjs

EXPOSE 4010

CMD ["node", "dist/main"]
