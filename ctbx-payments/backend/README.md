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

`NODE_ENV=production` recusa todos os providers sandbox. `MemoryIdempotencyStore` existe apenas para desenvolvimento/teste; produção exige armazenamento compartilhado e atômico.

Não configure URLs, tokens ou credenciais do backend legado.

## Autenticação sandbox local

> **SANDBOX IS NOT A BANKING ENVIRONMENT.** Todos os usuários, contas, tokens e saldos são locais, fictícios e descartáveis.

Credenciais fixas exclusivas de development/test:

```text
email: demo@ctbx.local
password: DEMO_ONLY
```

Exemplo de login local, depois de executar `npm run dev`:

```sh
curl -X POST http://127.0.0.1:3000/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"demo@ctbx.local","password":"DEMO_ONLY","device":{"installationId":"sbx-local-installation","platform":"ANDROID"}}'
```

Use o `deviceId` retornado como `X-Device-Id` junto do access token opaco nas rotas protegidas. Não copie tokens para documentação, commits ou logs.

### Teste em aparelho físico

Em `development` e `test`, o servidor escuta em `0.0.0.0` por padrão. Isso permite que um aparelho na mesma rede acesse o BFF pelo IP local do computador, sem gravar esse IP no código:

```text
http://<IP_LOCAL_DO_COMPUTADOR>:3000
```

Configure essa URL somente no ambiente do app com `EXPO_PUBLIC_API_BASE_URL`. Verifique o firewall local e use apenas uma rede confiável: o sandbox usa HTTP local e não é adequado para internet ou produção.

`HOST` pode substituir o endereço de escuta. Em production, o default é `127.0.0.1`, permitindo que proxy/rede de implantação decidam conscientemente a exposição:

```sh
HOST=127.0.0.1 NODE_ENV=production npm start
```

## Ambientes

```sh
NODE_ENV=development npm run dev
NODE_ENV=test npm test
NODE_ENV=production npm start
```

Production não inicializa `SandboxAuthProvider`, `SandboxSessionStore`, `SandboxDeviceBindingProvider` nem `SandboxAccountProvider`; sem providers reais, autenticação retorna `AUTH_PROVIDER_NOT_CONFIGURED`.
