# Stage 1: Build
# Context must be the repo root so design-system is available
# (frontend depends on @slep/ui via file:../design-system).
FROM node:20-alpine as build
WORKDIR /app

COPY design-system/ ./design-system/

COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Server
FROM nginx:stable-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
RUN mkdir -p /app/staticfiles /app/media
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
