# Mapeamento legado para BFF

Classificações: **adaptar** (conceito reutilizável por adapter), **substituir** (novo serviço/provider), **validar** (contrato incompleto ou regulado) e **descartar** (mecanismo inseguro/white-label).

| Endpoint/mecanismo legado | Endpoint BFF | Componente | Classificação |
|---|---|---|---|
| `usuario/login` | `POST /v1/auth/login` | AuthService | substituir |
| ausência de refresh | `POST /v1/auth/refresh` | AuthService | substituir |
| sessão local | `POST /v1/auth/logout` | AuthService | substituir |
| `conta/saldo` | `GET /v1/accounts/current/balances` | AccountAdapter | adaptar |
| dados de login/conta | `GET /v1/accounts/current` | AccountAdapter | adaptar |
| `conta/extrato` | `GET /v1/accounts/current/statement` | AccountAdapter | adaptar |
| `conta/lancamentos-futuros` | `.../statement/future` | AccountAdapter | adaptar |
| `pix-bloqueados/extrato-pix-bloqueados` | `.../statement/blocked` | Account/PixAdapter | adaptar |
| `conta/comprovante-pdf` | `.../transactions/{id}/receipt` | ReceiptAdapter | adaptar |
| `pix/pix/consultar-chave` | `POST /v1/pix/keys/lookup` | PixProviderAdapter | validar/substituir |
| `pix/pix/consultar-qrcode` | `POST /v1/pix/qr/lookup` | PixProviderAdapter | validar/substituir |
| `pix/pix/consultar-chaves` | `GET /v1/pix/keys` | PixProviderAdapter | validar |
| `pix/pix/criar-chave` | `POST /v1/pix/keys` | PixProviderAdapter | validar |
| `pix/pix/excluir-chave` | `DELETE /v1/pix/keys/{id}` | PixProviderAdapter | validar |
| `pix/pix/gera-qrcode-estatico` | `POST /v1/pix/receive/qr` | PixProviderAdapter | adaptar |
| `pix/pix/enviar-pix` | `POST /v1/pix/transfers` | PixProviderAdapter | substituir/validar |
| `pix/pix/agendar-pix` | `POST /v1/pix/transfers/schedule` | PixProviderAdapter | substituir/validar |
| buscas `conta/busca-por-*` | `POST /v1/transfers/beneficiaries/lookup` | TransferAdapter | adaptar |
| `favorecido/lista` | `GET /v1/transfers/favorites` | FavoriteRepository | adaptar |
| `transferencia/nova` | `POST /v1/transfers` | TransferProviderAdapter | validar/adaptar |
| `tarifa/consulta` | resposta de `validate` | PricingAdapter | adaptar |
| `pagamento/consulta` | `POST /v1/payments/bills/lookup` | BillProviderAdapter | adaptar |
| `pagamento/novo` | `POST /v1/payments/bills` | PaymentProviderAdapter | validar/adaptar |
| `gateway/*simulacao*` | `POST /v1/payments/installments/simulate` | InstallmentProvider | substituir |
| `gateway/*pagamento*` | `POST /v1/payments/installments` | InstallmentProvider | substituir |
| `cartao/consultar` | `GET /v1/cards` | CardProviderAdapter | adaptar |
| `cartao/codigo-validacao` | `POST /v1/cards/{id}/activation/challenge` | CardProviderAdapter | substituir/adaptar |
| desbloqueios legados | `POST /v1/cards/{id}/activate` ou `/unblock` | CardProviderAdapter | validar |
| `cartao/bloqueio-cartao` | `POST /v1/cards/{id}/block` | CardProviderAdapter | adaptar |
| `cartao/trocar-senha` | `POST /v1/cards/{id}/password` | CardProviderAdapter | validar |
| `cartao/transacoes` | `GET /v1/cards/{id}/transactions` | CardProviderAdapter | adaptar |
| `pedido-cartao/novo` | `POST /v1/cards/requests` | CardProviderAdapter | adaptar |
| `cartao/gerar-boleto` | `POST /v1/cards/{id}/recharge` | CardProviderAdapter | substituir/adaptar |
| `investimento/lista` | `GET /v1/investments/products` | InvestmentAdapter | validar |
| `investimento/simulacao` | `POST /v1/investments/simulations` | InvestmentAdapter | validar |
| `conta-investimento/investimento` | `POST /v1/investments/orders` | InvestmentAdapter | substituir/validar |
| `sacado/*` | `/v1/billing/payers` | BillingAdapter | adaptar |
| `boleto/boleto/boleto-cobranca` | `POST /v1/billing/bills` | BillingAdapter | adaptar/validar |
| endpoints de consignado | `/v1/consigned/*` | ConsignedAdapter | substituir/validar |
| upload + `nova-foto-perfil` | `POST /v1/profile/photo` | ProfileMediaService | substituir |
| `termos/texto` | `GET /v1/profile/terms` | TermsService | adaptar |
| `token2f/*`, push e OTP legados | `/v1/security/challenges*` | ChallengeService | substituir |
| headers `token/contaid/chave/token2f` | nenhum contrato público | LegacyBankingAdapter | descartar do app |
| senha persistida para biometria | prova de chave do dispositivo | DeviceSecurityService | descartar |

## Estados legados

Mapeamento seguro:

| Evidência legada | Estado novo |
|---|---|
| sucesso explicitamente confirmado | `COMPLETED` |
| agendamento explicitamente aceito | `SCHEDULED` |
| análise de segurança explicitamente indicada | `UNDER_REVIEW` |
| challenge solicitado | `REQUIRES_ACTION` |
| falha explicitamente terminal | `FAILED` |

Códigos numéricos sem semântica inequívoca não são mapeados. O adapter os registra internamente como resposta não reconhecida e falha de forma segura.

## White-label

Matarazzo, EccBank/Eccentric, Wib e Percapital ficam fora deste mapa até existir autorização e contrato próprios. `4736_pix.js` é POS/maquininha e não integra o domínio PIX bancário CTBX.
