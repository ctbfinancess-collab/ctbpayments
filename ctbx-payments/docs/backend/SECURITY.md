# Segurança

## Princípios

- zero confiança entre app, BFF e providers;
- privilégio mínimo e segregação por domínio;
- segredo somente em secret manager do servidor;
- criptografia em trânsito e repouso;
- dados e logs minimizados por padrão;
- operações sensíveis autorizadas no servidor.

## Segurança transacional

```text
POST /v1/security/challenges
POST /v1/security/challenges/{id}/verify
```

Tipos suportáveis: `OTP`, `PUSH`, `DEVICE_CONFIRMATION` e `BIOMETRIC_DEVICE_PROOF`. O motor de risco escolhe o tipo conforme operação, valor, usuário, dispositivo e sinais antifraude. O app não fixa a regra.

Um challenge contém:

```text
id, type, purpose, operationId, status, expiresAt,
attemptsRemaining, deliveryHint, nextAction
```

O resultado verificado é vinculado criptograficamente à operação e expira rapidamente. OTP nunca é devolvido por API, persistido em claro ou registrado.

## Biometria

Biometria é verificação local para liberar uma chave não exportável. O servidor valida a prova do dispositivo e o vínculo com a operação. É proibido armazenar senha para simular login biométrico.

## Dados proibidos em logs

- senha, CVV e OTP;
- access/refresh token;
- PAN completo e trilha de cartão;
- chaves privadas;
- documentos e contas completos;
- payload bancário integral;
- segredo ou credencial de provider.

Campos permitidos devem ser mascarados ou tokenizados. Acesso a auditoria é segregado e monitorado.

## Auditoria financeira

Evento mínimo:

```text
requestId, correlationId, operationId, actorId, accountId,
deviceId, action, previousStatus, nextStatus, providerAlias,
providerReferenceHash, occurredAt, result
```

## App e API

- certificate pinning é decisão baseada em threat model, com plano de rotação;
- rate limiting por usuário, dispositivo, IP e operação;
- proteção contra enumeração em login e recuperação;
- validação estrita de schema e tamanho de upload;
- recibos e arquivos passam por autorização e scanning;
- CORS não é controle para aplicativo móvel;
- analytics não recebe PII financeira.

## Legacy adapter

O adapter legado, se aprovado, roda em segmento isolado, recebe credenciais de secret manager, redige logs, restringe egress, possui kill switch e métricas próprias. Credenciais encontradas no APK são consideradas comprometidas e não podem ser reutilizadas.

## Governança pendente

Threat model, LGPD, PCI DSS, requisitos Bacen/PIX, retenção, RTO/RPO, resposta a incidentes, pentest e gestão de vulnerabilidades devem ser aprovados antes de produção.
