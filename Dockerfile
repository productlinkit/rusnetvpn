# --- build -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite only exposes VITE_-prefixed vars, and inlines them at build time —
# see .env.example. A running container can't change these; rebuild instead.
ARG VITE_API_BASE_URL=http://localhost:8090/api/v1
ARG VITE_REQUEST_TIMEOUT_MS=15000
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_REQUEST_TIMEOUT_MS=$VITE_REQUEST_TIMEOUT_MS \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# --- runtime -------------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /src/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ || exit 1
