# CTBX Payments BFF skeleton

Skeleton executável do BFF contract-first descrito em `../docs/backend/`. Não possui banco, provider financeiro, credenciais ou integração legada.

## Stack

Fastify 5 + TypeScript foi escolhido por schemas HTTP nativos, injeção de requisições para testes, logging estruturado e baixo volume de infraestrutura própria.

## Uso local

```sh
npm install
npm run typecheck
npm test
npm run build
npm run validate:openapi
npm run dev
```

`NODE_ENV=production` desabilita DemoAuthProvider e a rota documental do OpenAPI. `MemoryIdempotencyStore` existe apenas para desenvolvimento/teste; produção exige armazenamento compartilhado e atômico.

Não configure URLs, tokens ou credenciais do backend legado.
