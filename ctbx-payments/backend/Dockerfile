# Build alternativo ao Railpack (Etapa 2 — o builder padrão do Railway,
# "builder-ervuqb", está travando na fase de agendamento do build há mais
# de 13h, sem nenhuma linha de log — confirmado como problema da própria
# infraestrutura do Railway, não do nosso código ou config). Este
# Dockerfile evita esse caminho inteiramente, usando o builder DOCKERFILE
# do Railway em vez do RAILPACK (ver backend/railway.json).
#
# python3/make/g++: argon2 (hash de senha) é um módulo nativo — se não
# houver binário pré-compilado pra esta plataforma, precisa compilar na
# hora do `npm ci`.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Remove devDependencies (typescript, tsx, drizzle-kit, @types/*, etc.) da
# árvore final sem precisar rodar `npm ci` de novo (evitaria recompilar
# argon2 numa stage sem python3/make/g++).
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Mesmo caminho que o Railway já usa hoje via RAILPACK — dist/src/server.js
# (tsconfig.json tem rootDir ".", então src/server.ts vira dist/src/server.js,
# nunca dist/server.js — foi exatamente o que o "Diagnose" do Railway
# sugeriu errado numa investigação anterior).
CMD ["node", "dist/src/server.js"]
