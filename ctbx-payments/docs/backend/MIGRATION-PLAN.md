# Plano de migração

## Princípio

Não há migração direta do app para o host legado. O contrato `/v1` nasce independente; integrações são habilitadas atrás de adapters após validação jurídica, técnica, de segurança e compliance.

## Fases

### 0. Decisões e governança

- confirmar titularidade dos serviços e dados;
- escolher IdP e política de sessão;
- aprovar threat model, LGPD, PCI/PIX e auditoria;
- selecionar provedores e ambientes de sandbox;
- definir SLO, RTO/RPO e resposta a incidentes.

### 1. Contract-first

- revisar e versionar OpenAPI;
- gerar mocks contratuais sem dados reais;
- criar testes de contrato consumidor;
- definir catálogo final de erros e state machine.

### 2. BFF básico

- auth, perfil, conta e leitura de extrato;
- secret management, observabilidade e auditoria;
- autorização por usuário/conta/dispositivo;
- nenhuma operação financeira antes da base de segurança.

### 3. Operações financeiras

- challenges e idempotência;
- PIX, transferências e boletos em sandbox;
- reconciliação, comprovantes e tratamento de timeout;
- testes de concorrência, repetição e falhas parciais.

### 4. Produtos

- cartões;
- investimentos, cobrança e consignado após aprovação regulatória;
- adapters independentes e kill switch por provider.

### 5. Migração do aplicativo

- services atuais passam a implementar os contratos `/v1`;
- modo demo permanece como fallback controlado de desenvolvimento;
- rollout por feature flag e conta piloto;
- telemetria sem PII e rollback testado.

### 6. Legacy adapter opcional

Somente após autorização formal: ambiente isolado, credenciais novas, allowlist de endpoints, redaction, timeouts, sem retry cego, reconciliação e prazo de desativação. Ele nunca define o contrato público.

## Critérios de saída para produção

- pentest e threat model aprovados;
- contratos e testes de provider aprovados;
- idempotência/reconciliação testadas;
- auditoria e alertas operacionais ativos;
- runbooks e kill switches exercitados;
- consentimento, termos e retenção aprovados;
- nenhuma credencial ou URL recuperada do APK reutilizada.

## Decisões pendentes

- IdP e política de MFA;
- BFF runtime/cloud e armazenamento;
- providers por domínio;
- fonte de verdade de perfil/conta;
- retenção de idempotência e auditoria;
- formato e distribuição de recibos;
- requisitos de agendamento/cancelamento;
- política offline e de indisponibilidade no app.
