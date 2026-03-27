# Vet Empreendedor — Painel de Funis

Dashboard de análise de funis de marketing digital com integração Google Sheets, Facebook Ads e insights via IA.

## Stack Técnica

- **Next.js 14** (App Router + TypeScript)
- **Tailwind CSS** + **Shadcn/ui**
- **Recharts** (gráficos)
- **Prisma + SQLite** (banco local)
- **Google Sheets API v4**
- **Facebook Marketing API v18**
- **Anthropic Claude** (insights automáticos)
- **NextAuth.js** (autenticação)

---

## Setup Inicial

### 1. Clone e instale dependências

```bash
git clone <repo-url>
cd vet-empreendedor-painel-funis
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais (veja abaixo como obter cada uma).

### 3. Configure o banco de dados

```bash
npx prisma migrate dev --name init
```

### 4. Inicie o servidor

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Como obter as credenciais

### Google Sheets API (Service Account)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto (ou use um existente)
3. Ative a **Google Sheets API**: APIs & Services → Library → pesquise "Google Sheets API" → Ativar
4. Crie uma Service Account: APIs & Services → Credentials → Create Credentials → Service Account
   - Nome: `vet-empreendedor-sheets`
   - Role: Viewer
5. Gere uma chave JSON: Service Account → Keys → Add Key → Create new key → JSON
6. Baixe o arquivo JSON e cole **todo o conteúdo** como valor de `GOOGLE_SERVICE_ACCOUNT_JSON` (em uma linha, sem quebras de linha)
7. Compartilhe a planilha com o email da Service Account com permissão de **Viewer**

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GOOGLE_SPREADSHEET_ID=1J2bfYxxz-XoG0EaFBHZ5L6GTH2fHJ8RBeCckzmB6-8w
GOOGLE_SHEET_NAME=Report
```

### Facebook Marketing API

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um novo App: My Apps → Create App → Business
3. Adicione o produto **Marketing API**
4. Anote o **App ID** e **App Secret**
5. Gere um token de longa duração via [Graph API Explorer](https://developers.facebook.com/tools/explorer/) com permissões: `ads_read`, `ads_management`
6. Converta para token de longa duração:
   ```
   GET /oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={TOKEN}
   ```
7. Encontre seu Ad Account ID no [Business Manager](https://business.facebook.com) — formato: `act_XXXXXXXXXX`

```env
FACEBOOK_APP_ID=seu_app_id
FACEBOOK_APP_SECRET=seu_app_secret
FACEBOOK_ACCESS_TOKEN=seu_token_de_longa_duracao
FACEBOOK_AD_ACCOUNT_ID=act_XXXXXXXXXX
```

### Anthropic API (Insights com IA)

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Autenticação (NextAuth)

Gere um secret seguro:
```bash
openssl rand -base64 32
```

```env
NEXTAUTH_SECRET=sua_string_secreta_gerada
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=fernanda@livenegociosdigitais.com
ADMIN_PASSWORD=sua_senha_segura
```

---

## Estrutura do Projeto

```
app/
  page.tsx              # Lista de funis (/)
  login/page.tsx        # Tela de login
  funil/
    novo/page.tsx       # Criar funil
    [id]/
      page.tsx          # Detalhe do funil
      editar/page.tsx   # Editar funil
  api/
    auth/               # NextAuth
    funis/              # CRUD de funis + métricas
    sheets/vendas/      # Google Sheets API
    facebook/           # Facebook Marketing API
    insights/           # Anthropic IA

components/
  ui/                   # Componentes base (Shadcn/ui)
  dashboard/            # Componentes do painel

lib/
  prisma.ts             # Cliente Prisma
  auth.ts               # Configuração NextAuth
  google-sheets.ts      # Integração Google Sheets
  facebook-api.ts       # Integração Facebook API
  metrics.ts            # Cálculo de métricas
  utils.ts              # Utilitários
```

---

## Estrutura da Planilha (Google Sheets)

Aba: **Report** | Linha 1 = cabeçalho

| Coluna | Campo |
|--------|-------|
| A | Data de Venda (DD/MM/YYYY HH:MM:SS) |
| B | Nome do Produto |
| C | Origem UTM (ex: `ig\|campanha\|undefined\|conjunto\|criativo`) |
| D | Preço do Produto (ex: R$ 19,90) |
| E | Nome do Comprador |
| F | Documento (CPF/CNPJ) |
| G | Email |
| H | DDI |
| I | Telefone |
| J | País |
| K | Código do Produto Hotmart |
| L | Código de Oferta |
| M | Tipo de Pagamento |
| N | utm_source |
| O | utm_campaign |
| P | utm_medium |
| Q | utm_content |
| R | utm_term |

---

## Deploy na Vercel

1. Push para GitHub
2. Conecte em [vercel.com](https://vercel.com)
3. Configure todas as variáveis de ambiente
4. Para SQLite em produção, use **Turso** (SQLite distribuído) ou migre para PostgreSQL

---

## Scripts

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npx prisma studio    # Interface visual do banco
npx prisma migrate dev --name <nome>  # Nova migration
```
