# Arquitetura do backend CTBX Payments

## Objetivo

Esta especificação define a fronteira entre o aplicativo CTBX Payments e os provedores financeiros. O backend legado é apenas uma fonte funcional; seus hosts, credenciais, headers e códigos numéricos não fazem parte do contrato novo.

```text
React Native App
  -> HTTPS /v1
CTBX BFF / API Gateway
  -> Auth, autorização, validação, idempotência, auditoria e normalização
Application services
  -> Account | Pix | Transfer | Payment | Card | Investment | Billing | Consigned
Provider ports
  -> Core | DICT/SPI | Boletos | Cards | Investments | Billing | Consigned
Provider adapters
  -> provedores homologados
  -> LegacyBankingAdapter (opcional, temporário e somente com autorização formal)
```

## Responsabilidades

### Aplicativo

- consumir somente contratos `/v1`;
- manter access/refresh tokens em armazenamento seguro da plataforma;
- gerar uma `Idempotency-Key` por intenção financeira;
- apresentar estados e ações solicitados pelo BFF;
- nunca implementar regra antifraude ou traduzir código de provedor.

### BFF

- autenticar usuário e vincular sessão a conta e dispositivo;
- aplicar autorização por usuário, conta e operação;
- validar schemas e regras de orquestração;
- selecionar adapter sem expor o provedor;
- normalizar dinheiro, datas, status e erros;
- coordenar challenges, idempotência e auditoria;
- redigir logs e respostas.

### Adapters

- traduzir modelos canônicos para contratos do provedor;
- aplicar timeouts e classificação segura de falhas;
- não repetir automaticamente comandos financeiros ambíguos;
- ocultar identificadores internos, credenciais e estados proprietários.

## Limites de domínio

| Domínio | Dono do contrato público | Dependência externa |
|---|---|---|
| Auth/session | CTBX AuthService | IdP a definir |
| Conta/extrato | AccountService | Core bancário |
| PIX | PixService | DICT, SPI e antifraude |
| Transferências | TransferService | Core/CIP/provedor |
| Pagamentos | PaymentService | Boleto e processadora |
| Cartões | CardService | Emissor/processador |
| Investimentos | InvestmentService | Plataforma homologada |
| Cobrança | BillingService | Emissor de boletos |
| Consignado | ConsignedService | Originador/esteira |

## Regras arquiteturais

1. Valores monetários usam inteiro em centavos e código ISO 4217.
2. Datas e horários usam ISO 8601; instantes incluem offset/UTC.
3. IDs públicos são opacos e não revelam IDs do provedor.
4. Toda resposta inclui `requestId`; operações incluem `operationId`.
5. Estado público usa o modelo comum documentado em `API-CONTRACTS.md`.
6. Evolução compatível ocorre dentro de `/v1`; quebra de contrato exige nova versão.
7. O BFF não é um proxy transparente: ele valida, autoriza e normaliza.

## Observabilidade e auditoria

Cada chamada recebe `requestId` e `correlationId`. Uma operação financeira registra, em trilha imutável e com acesso restrito: `operationId`, ator, conta, dispositivo, instante, estado anterior/posterior, adapter e referência do provedor redigida. Senha, CVV, OTP, tokens, PAN e payload integral sensível são proibidos.

## Resiliência

- leitura idempotente pode ter retry limitado com jitter;
- comando financeiro só pode ser repetido por idempotência e reconciliação;
- timeout após envio produz estado indeterminado interno e consulta/reconciliação, nunca repetição cega;
- circuit breaker é isolado por provider;
- recibos e estados devem poder ser consultados posteriormente.

## Fora do escopo desta fase

Servidor, banco de dados, cloud, fila, IdP, algoritmos criptográficos, provedores e SLAs ainda não foram escolhidos.
