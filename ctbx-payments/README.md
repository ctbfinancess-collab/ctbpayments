# CTBX Payments

## Modos

- `DEMO`: mocks locais, sem rede.
- `SANDBOX`: autenticação, sessão, conta e saldos pelo BFF local. Operações financeiras ficam indisponíveis.
- `PRODUCTION`: sem bypass; backend real ainda não configurado.

> **SANDBOX IS NOT A BANKING ENVIRONMENT.** Os dados e saldos são fictícios.

## Teste manual do sandbox

Terminal 1:

```sh
cd backend
npm run dev
```

Terminal 2:

```sh
EXPO_PUBLIC_APP_MODE=SANDBOX \
EXPO_PUBLIC_API_BASE_URL=<LOCAL_BFF_URL> \
npx expo start
```

Credenciais locais de desenvolvimento estão documentadas no `backend/README.md`. A senha não é preenchida automaticamente.

Em alguns simuladores, `localhost` aponta para a máquina de desenvolvimento; em outros, é necessário usar o endereço específico do host. Um aparelho físico precisa acessar o IP da máquina na mesma rede local. Configure isso em `EXPO_PUBLIC_API_BASE_URL` e nunca grave o IP pessoal no repositório.

Arquivos `.env*.local` são ignorados pelo Git. Refresh tokens sandbox permanecem somente em memória; não são persistidos em AsyncStorage. Antes de persistência real, implementar SecureStore/Keychain.
