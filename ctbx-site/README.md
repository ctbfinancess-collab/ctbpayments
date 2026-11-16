# CTBX Payments — Site institucional

Site estático (Astro + Tailwind), **independente** do aplicativo em `../ctbx-payments`.
Não importa nenhum código do app; cores e logo foram copiados.

## Rodar localmente

```sh
cd ctbx-site
npm install
npm run dev        # abre em http://localhost:4321 (ou a próxima porta livre)
```

Português em `/`, inglês em `/en/`. Páginas:

| Página | PT | EN | Arquivo |
|---|---|---|---|
| Início | `/` | `/en/` | `src/views/HomeView.astro` |
| Conta Digital | `/conta-digital/` | `/en/digital-account/` | `src/views/AccountView.astro` |
| Empresas | `/empresas/` | `/en/business/` | `src/views/BusinessView.astro` |
| Soluções | `/solucoes/` | `/en/solutions/` | `src/views/SolutionsView.astro` |
| Segurança | `/seguranca/` | `/en/security/` | `src/views/SecurityView.astro` |
| Quem Somos | `/quem-somos/` | `/en/about/` | `src/views/AboutView.astro` |
| Contato | `/contato/` | `/en/contact/` | `src/views/ContactView.astro` |

Cada página é escrita uma vez em `src/views/` e serve aos dois idiomas; os
arquivos em `src/pages/` só escolhem o idioma. Rotas: `src/i18n/routes.ts`.
Banner de cada página: componente `PageHero` (prop `image`; sem imagem mostra um ícone).

## Onde editar

| O quê | Arquivo |
|---|---|
| Textos (PT e EN) | `src/i18n/ui.ts` |
| Status dos serviços (Disponível / Em breve / oculto) | `src/config/services.ts` |
| Destino do "Abrir conta", razão social, CNPJ, contatos | `src/config/site.ts` |
| Cores e fontes | `src/styles/global.css` |

Regra: só marcar um serviço como disponível quando ele funcionar para clientes reais.
Nunca publicar taxas, rendimentos, limites ou parcerias não confirmadas.

## Formulário de contato (Resend)

O formulário envia para `/api/contact` (`src/pages/api/contact.ts`), que roda
**no servidor** do site: a chave do Resend nunca vai para o navegador.
Cada mensagem chega à equipe com "responder para" o visitante, e o visitante
recebe uma confirmação automática (`src/lib/confirmationEmail.ts`).
Proteções: validação no servidor, honeypot, limite de 5 envios a cada 10 min
por IP, escape de HTML e bloqueio de envios vindos de outros sites.

Variáveis de ambiente (veja `.env.example`):

| Variável | Uso |
|---|---|
| `RESEND_API_KEY` | Chave do Resend ("Sending access") |
| `CONTACT_FROM_EMAIL` | Remetente em domínio verificado no Resend |
| `CONTACT_TO_EMAIL` | Caixa(s) que recebem as mensagens |

Sem elas, o formulário avisa que o envio "ainda está sendo configurado".

## Publicação (ainda NÃO configurada)

Build: `npm run build` · Start: `npm start` (Node 22+, escuta em `PORT`).

Plano: serviço novo no Railway, com Root Directory `ctbx-site` e Watch Paths
`ctbx-site/**`, para não interferir no app nem na API. `railway.json` já está
pronto para isso. Domínio previsto: `ctbxpayments.com` (nenhum DNS foi alterado).

Antes de publicar: preencher os dados legais em `src/config/site.ts` e criar as
páginas de Privacidade e Termos.
