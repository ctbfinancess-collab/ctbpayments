# Idempotência

## Escopo obrigatório

Obrigatória em PIX, transferências, pagamentos, investimentos, cobranças, solicitações/recargas e alterações financeiras de cartão.

```http
Idempotency-Key: <valor opaco de alta entropia>
```

## Geração e escopo

- preferencialmente gerada pelo app por intenção do usuário;
- permanece a mesma em retry da mesma intenção;
- muda quando o usuário altera dados materiais ou inicia nova intenção;
- chave vinculada a usuário, conta, método, rota e hash canônico do payload;
- nunca deve conter CPF, conta, valor ou outro dado legível.

## Persistência

O BFF registra atomicamente:

```text
keyHash, actorId, accountId, route, payloadHash,
status, operationId, responseStatus, responseBodyRedacted,
createdAt, expiresAt
```

A janela mínima deve cobrir retries móveis, indisponibilidade e reconciliação; o prazo final depende do domínio/provider e será definido operacionalmente.

## Repetição

| Situação | Resposta |
|---|---|
| primeira chamada | cria operação |
| mesma chave/payload, em processamento | devolve a mesma operação/`PROCESSING` |
| mesma chave/payload, concluída | reproduz resposta persistida |
| mesma chave, payload diferente | `409 IDEMPOTENCY_KEY_REUSED` |
| falha antes de qualquer side effect | permite retomada controlada |
| timeout após envio ao provider | consulta/reconcilia; não reenvia cegamente |

## Provider

Quando o provider suporta idempotência, o BFF deriva uma chave estável própria do adapter. Quando não suporta, usa registro local, lock por operação e reconciliação por referência. Isso reduz risco, mas não substitui garantia contratual do provider.

## Operações agendadas

Criação e cancelamento possuem chaves distintas. A execução pelo scheduler usa `operationId` persistente e não uma nova intenção do app.
