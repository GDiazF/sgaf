# Usa Node.js para compilar
FROM node:20-alpine as build-stage

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código y compilar
COPY . .
RUN npm run build

# Imagen final ligera con Nginx para servir los archivos
FROM nginx:stable-alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
