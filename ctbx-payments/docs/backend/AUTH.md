# Autenticação e sessão

## Endpoints

| Método | Recurso | Finalidade |
|---|---|---|
| POST | `/v1/auth/login` | Autenticar e resolver estado de acesso |
| POST | `/v1/auth/refresh` | Rotacionar refresh token e access token |
| POST | `/v1/auth/logout` | Revogar a sessão atual |
| GET | `/v1/auth/session` | Obter usuário, contas e sessão atuais |

## Tokens

- access token de curta duração, com expiração explícita;
- refresh token opaco e rotacionado a cada uso;
- detecção de reutilização de refresh token;
- revogação por sessão, dispositivo e usuário;
- armazenamento somente em Keystore/Keychain equivalente;
- tokens nunca aparecem em logs, analytics ou mensagens de erro.

Algoritmo, IdP e formato do token são decisões de implementação. JWT não é requisito; se adotado, validação de emissor, audiência, expiração e rotação de chaves é obrigatória.

## Login

Entrada mínima:

```json
{
  "username": "identificador informado pelo usuário",
  "password": "senha",
  "device": {
    "installationId": "identificador opaco da instalação",
    "name": "nome amigável",
    "platform": "ANDROID"
  }
}
```

`installationId` não é fingerprint invasivo e não autentica sozinho. Push token é registrado por canal separado e protegido.

## Estados modernos recuperados do legado

| Estado | Significado | Próxima ação tipada |
|---|---|---|
| `AUTHENTICATED` | Acesso liberado | usar sessão |
| `ACCOUNT_SELECTION_REQUIRED` | PF/PJ ou múltiplas contas | selecionar `accountId` |
| `ACCOUNT_UNDER_REVIEW` | Conta em análise | aguardar/suporte |
| `FIRST_ACCESS_REQUIRED` | Primeiro acesso | concluir ativação |
| `REGISTRATION_INCOMPLETE` | Cadastro PF/PJ incompleto | continuar cadastro |
| `PASSWORD_CHANGE_REQUIRED` | Senha inicial/expirada | alterar senha |
| `CHALLENGE_REQUIRED` | Confirmação adicional | verificar challenge |
| `ACCOUNT_BLOCKED` | Acesso indisponível | suporte/processo definido |

O app decide a tela por `state` e `nextAction.type`, nunca por texto do servidor.

## Seleção de conta

O login pode devolver uma sessão restrita e `availableAccounts`. A seleção de conta deve gerar ou atualizar o contexto da sessão no servidor. O `accountId` público identifica contexto/autorização; não funciona como credencial.

## Refresh e logout

- refresh token é de uso único;
- rotação atômica invalida o anterior;
- reutilização revoga a família da sessão;
- logout é idempotente e revoga refresh/access conforme capacidade do IdP;
- troca de senha, fraude ou remoção de dispositivo pode revogar todas as sessões.

## Device binding

O servidor associa a sessão a um registro de instalação/dispositivo. Para ações sensíveis pode exigir prova baseada em chave não exportável gerada no dispositivo. Biometria apenas libera essa chave localmente; senha nunca é persistida.

## Compatibilidade legada

`token_api`, `contaid`, `chave` e fingerprint AES ficam, quando formalmente necessários, exclusivamente dentro de `LegacyBankingAdapter`. Não são claims públicos e nunca chegam ao app.
