# Build do site institucional CTBX Payments (Astro + servidor Node).
# Usamos Dockerfile em vez do Railpack, pelo mesmo motivo do backend:
# build previsível e sem depender do builder automático do Railway.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# O Railway define PORT; o servidor do Astro lê PORT e HOST.
CMD ["node", "./dist/server/entry.mjs"]
