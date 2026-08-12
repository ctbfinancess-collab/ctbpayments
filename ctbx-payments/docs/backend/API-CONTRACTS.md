# Contratos públicos do BFF

O OpenAPI é a definição executável inicial. Este documento registra decisões semânticas comuns e recursos ainda preliminares.

## Convenções

- prefixo `/v1`;
- JSON em `camelCase`;
- dinheiro: `{ "amount": 248075, "currency": "BRL" }`;
- datas civis: `YYYY-MM-DD`; instantes: ISO 8601;
- IDs opacos;
- paginação por cursor: `items`, `nextCursor`, `hasMore`;
- sucesso e erro seguem `ERROR-MODEL.md`;
- comandos financeiros exigem `Idempotency-Key`.

## Estados comuns de operação

```text
PENDING
PROCESSING
REQUIRES_ACTION
SCHEDULED
COMPLETED
FAILED
UNDER_REVIEW
CANCELLED
```

`REQUIRES_ACTION` inclui uma `nextAction` tipada, por exemplo challenge. Status de provider permanece interno ao adapter.

## Conta

| Método | Recurso |
|---|---|
| GET | `/v1/accounts/current` |
| GET | `/v1/accounts/current/balances` |
| GET | `/v1/accounts/current/statement` |
| GET | `/v1/accounts/current/statement/future` |
| GET | `/v1/accounts/current/statement/blocked` |
| GET | `/v1/accounts/current/transactions/{id}` |
| GET | `/v1/accounts/current/transactions/{id}/receipt` |

Saldo normalizado:

```json
{
  "available": { "amount": 248075, "currency": "BRL" },
  "ledger": { "amount": 248075, "currency": "BRL" },
  "components": {
    "digitalAccount": { "amount": 248075, "currency": "BRL" },
    "cardAccount": { "amount": 0, "currency": "BRL" },
    "credit": { "amount": 0, "currency": "BRL" },
    "investments": { "amount": 0, "currency": "BRL" },
    "foreignCurrency": { "amount": 0, "currency": "BRL" },
    "blocked": { "amount": 0, "currency": "BRL" }
  },
  "asOf": "2026-08-12T12:00:00Z"
}
```

Os componentes preservam informação do legado, mas `available` deve ser calculado pelo core/provider, não pelo app.

## PIX

| Método | Recurso |
|---|---|
| POST | `/v1/pix/keys/lookup` |
| POST | `/v1/pix/qr/lookup` |
| GET | `/v1/pix/keys` |
| POST | `/v1/pix/keys` |
| DELETE | `/v1/pix/keys/{id}` |
| POST | `/v1/pix/receive/qr` |
| POST | `/v1/pix/transfers/validate` |
| POST | `/v1/pix/transfers` |
| POST | `/v1/pix/transfers/schedule` |
| GET | `/v1/pix/transfers/{id}` |
| GET | `/v1/pix/transfers/{id}/receipt` |

O app informa chave/EMV e dados de intenção. DICT, SPI, `EndToEndId`, códigos de validação, roteamento, antifraude e referências do provider ficam internos. A validação devolve beneficiário normalizado, taxas, limites aplicáveis e eventual `nextAction`; não reserva sucesso.

## Transferências

| Método | Recurso |
|---|---|
| GET | `/v1/transfers/banks` |
| GET | `/v1/transfers/favorites` |
| POST | `/v1/transfers/beneficiaries/lookup` |
| POST | `/v1/transfers/validate` |
| POST | `/v1/transfers` |
| POST | `/v1/transfers/schedule` |
| GET | `/v1/transfers/{id}` |
| GET | `/v1/transfers/{id}/receipt` |

`type` é `INTERNAL` ou `EXTERNAL`. O BFF resolve provider e formato bancário. Favoritos são recursos CTBX e não credenciais do beneficiário.

## Pagamentos

| Método | Recurso |
|---|---|
| POST | `/v1/payments/bills/lookup` |
| POST | `/v1/payments/bills/validate` |
| POST | `/v1/payments/bills` |
| POST | `/v1/payments/bills/schedule` |
| GET | `/v1/payments/{id}` |
| GET | `/v1/payments/{id}/receipt` |
| POST | `/v1/payments/installments/simulate` |
| POST | `/v1/payments/installments` |

O BFF devolve boleto canônico, valores calculados pelo provider e validade da consulta. CVV/token de cartão, quando necessários, devem seguir tokenização compatível com PCI; não são persistidos pelo BFF.

## Cartões

| Método | Recurso |
|---|---|
| GET | `/v1/cards` |
| GET | `/v1/cards/{id}` |
| POST | `/v1/cards/{id}/activation/challenge` |
| POST | `/v1/cards/{id}/activate` |
| POST | `/v1/cards/{id}/block` |
| POST | `/v1/cards/{id}/unblock` |
| POST | `/v1/cards/{id}/password` |
| GET | `/v1/cards/{id}/transactions` |
| GET | `/v1/cards/{id}/receipts` |
| POST | `/v1/cards/requests` |
| POST | `/v1/cards/{id}/recharge` |

PAN, processor ID e credenciais do emissor não são expostos. Cartões são identificados por ID CTBX, bandeira e últimos quatro dígitos.

## Investimentos — dependente de validação regulatória/provider

```text
GET  /v1/investments/products
GET  /v1/investments/products/{id}
POST /v1/investments/simulations
POST /v1/investments/orders
GET  /v1/investments/positions
GET  /v1/investments/terms
POST /v1/investments/terms/{id}/accept
```

Suitability, liquidez, tributação, carência, risco e aceite versionado são obrigatórios no contrato final.

## Cobrança — dependente de provider

```text
GET    /v1/billing/payers
POST   /v1/billing/payers
PATCH  /v1/billing/payers/{id}
DELETE /v1/billing/payers/{id}
GET    /v1/billing/bills
POST   /v1/billing/bills
GET    /v1/billing/bills/{id}
POST   /v1/billing/bills/{id}/send
GET    /v1/billing/bills/{id}/receipt
```

## Consignado — dependente de regulação/originador

```text
GET  /v1/consigned/products
GET  /v1/consigned/products/{id}/documents
POST /v1/consigned/simulations
POST /v1/consigned/applications
GET  /v1/consigned/applications
GET  /v1/consigned/applications/{id}
```

## Perfil e dispositivos

```text
GET    /v1/profile
GET    /v1/profile/account
POST   /v1/profile/photo
GET    /v1/profile/terms
POST   /v1/profile/terms/{id}/accept
GET    /v1/security/devices
DELETE /v1/security/devices/{id}
POST   /v1/security/challenges
POST   /v1/security/challenges/{id}/verify
```

Aceite de termo registra versão, hash, usuário, conta, dispositivo e instante.

## Modelos canônicos

| Modelo | Campos mínimos |
|---|---|
| `User` | `id`, `type`, `displayName`, contatos mascarados |
| `Account` | `id`, `type`, `status`, agência/conta mascaradas |
| `Balance` | `available`, `ledger`, `components`, `asOf` |
| `Transaction` | `id`, `type`, `direction`, `amount`, `status`, `occurredAt` |
| `Receipt` | `id`, `operationId`, `status`, `issuedAt`, conteúdo/link autorizado |
| `PixKey` | `id`, `type`, valor mascarado, `status` |
| `PixBeneficiary` | nome, documento mascarado, instituição, conta mascarada |
| `PixTransfer` | `id`, `amount`, beneficiário, `status`, datas |
| `BankTransfer` | `id`, `type`, beneficiário, `amount`, `status` |
| `Bill` | código mascarado, beneficiário, vencimento e valores |
| `Payment` | `id`, boleto, valor, `status`, agendamento |
| `Card` | `id`, `type`, bandeira, `lastFour`, `status` |
| `CardTransaction` | `id`, estabelecimento, valor, status e instante |
| `InvestmentProduct` | `id`, nome, risco, liquidez, limites, termos |
| `Billing` | `id`, sacado, vencimento, valor, status |
| `Device` | `id`, nome, plataforma, confiança, último uso |
| `Challenge` | `id`, tipo, finalidade, estado, expiração |
| `ApiError` | código, mensagem, retry, campos |

Campos finais dependem de schemas regulatórios e providers homologados; não foram inferidos além da evidência funcional.
