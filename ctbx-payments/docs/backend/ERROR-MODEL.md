# Modelo de erros

## Envelope

Sucesso:

```json
{ "data": {}, "meta": {}, "requestId": "req_..." }
```

Erro:

```json
{
  "error": {
    "code": "PIX_KEY_NOT_FOUND",
    "message": "Não foi possível localizar a chave.",
    "retryable": false,
    "fieldErrors": []
  },
  "requestId": "req_..."
}
```

`message` é apresentação/fallback. A lógica usa apenas `code`, status HTTP e ações tipadas.

## Status HTTP

| Status | Uso |
|---:|---|
| 400 | requisição malformada |
| 401 | sessão ausente/expirada |
| 403 | usuário autenticado sem autorização |
| 404 | recurso não localizado |
| 409 | conflito de estado ou idempotência |
| 422 | validação de negócio conhecida |
| 429 | limite de requisições |
| 502 | falha normalizada do provider |
| 503 | serviço indisponível |
| 504 | timeout do provider, com resultado potencialmente indeterminado |

## Catálogo inicial

| Código | HTTP | Retry | Domínio |
|---|---:|---:|---|
| `VALIDATION_ERROR` | 422 | não | comum |
| `AUTH_INVALID_CREDENTIALS` | 401 | não | auth |
| `AUTH_SESSION_EXPIRED` | 401 | não | auth |
| `AUTH_SESSION_REVOKED` | 401 | não | auth |
| `ACCOUNT_NOT_ALLOWED` | 403 | não | conta |
| `INSUFFICIENT_FUNDS` | 422 | não | financeiro |
| `LIMIT_EXCEEDED` | 422 | não | financeiro |
| `CHALLENGE_REQUIRED` | 409 | não | segurança |
| `CHALLENGE_INVALID` | 422 | não | segurança |
| `CHALLENGE_EXPIRED` | 410 | não | segurança |
| `PIX_KEY_NOT_FOUND` | 404 | não | PIX |
| `PIX_KEY_ALREADY_REGISTERED` | 409 | não | PIX |
| `BILL_NOT_FOUND` | 404 | não | pagamento |
| `BILL_NOT_PAYABLE` | 422 | não | pagamento |
| `CARD_INVALID_STATE` | 409 | não | cartão |
| `IDEMPOTENCY_KEY_REUSED` | 409 | não | comum |
| `OPERATION_UNDER_REVIEW` | 202 | não | financeiro |
| `PROVIDER_UNAVAILABLE` | 503 | sim | integração |
| `PROVIDER_TIMEOUT` | 504 | condicionado | integração |
| `INTERNAL_ERROR` | 500 | não | comum |

Regras bancárias adicionais só entram após validação do provider e compliance. Códigos legados ambíguos tornam-se `LEGACY_UNMAPPED_RESPONSE` internamente e não devem ser apresentados ao app como número.

## Segurança

Erros não expõem stack, host, payload de provider, documentos completos, credenciais ou existência de usuário em fluxos que permitam enumeração.
