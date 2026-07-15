<p align="center">
  <img src="public/nuvyo.png" alt="NUVYO — Gestão Inteligente" width="280">
</p>

<h1 align="center">NUVYO — Gestão Inteligente</h1>

<p align="center">
  Projetos, tarefas, indicadores e colaboração em uma única plataforma.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0E1116">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-374A67">
</p>

NUVYO é uma aplicação web open source para organizar a execução do trabalho e dar visibilidade à gestão. Ela reúne projetos, tarefas, diário de bordo, clientes, equipes, áreas, KPIs, suporte, ideias e relatórios em uma interface responsiva.

## O que a plataforma oferece

- Painel geral com filtros por período, área, cliente, projeto e responsável.
- Projetos com fases, categorias, status, responsáveis, participantes, documentos, dependências e publicação controlada.
- Kanban por projeto e visão cruzada de tarefas, além de cronograma em Gantt.
- Tarefas com prioridade, prazo, progresso, apontamento de horas, comentários, tags e notificações.
- Diário de bordo para registrar atividades executadas e gerar histórico gerencial.
- KPIs configuráveis; a instalação começa com **Receita Bruta**, **Vendas** e **Novos Clientes**.
- Gestão de clientes, usuários, hierarquia de áreas, permissões e configurações operacionais.
- Portal de ideias, chamados de suporte, lixeira e recuperação de registros.
- Resumos com IA via Google Gemini, opcional e desativado quando não há chave configurada.
- Tema claro/escuro e experiência adaptada para desktop e dispositivos móveis.

### Perfis de acesso

| Perfil | Escopo principal |
| --- | --- |
| Administrador | Configuração global, segurança, MFA, clientes, usuários e auditoria |
| Gestor | Gestão de sua área e subáreas, equipe e registros dentro do escopo permitido |
| Colaborador | Próprias atividades e itens compartilhados ou atribuídos |

As verificações de acesso são feitas novamente pela API. Ocultar um botão no frontend nunca é tratado como autorização.

## Arquitetura

```text
Navegador
   │
   ▼
React + Vite ──────────────── Nginx ou Vercel
   │ HTTPS /api
   ▼
Express + TypeScript ──────── container/serviço Node persistente
   ├── PostgreSQL ─────────── Docker ou Supabase
   ├── volume de uploads ──── avatares e imagens
   └── Google Gemini ──────── integração opcional
```

O repositório possui três partes principais:

```text
.
├── components/                 interface React
├── services/                   cliente da API
├── backend/src/
│   ├── controllers/            regras da aplicação
│   ├── middlewares/            autenticação e autorização
│   ├── migrations/             estrutura e dados mínimos do PostgreSQL
│   ├── routes/                 endpoints Express
│   └── security/               sessão, MFA e auditoria
├── docker/                     configuração do Nginx
├── Dockerfile                  imagem do frontend
├── docker-compose.yml          aplicação completa
└── vercel.json                 publicação do frontend como SPA
```

## Escolha sua forma de instalação

| Opção | Indicada para | Componentes |
| --- | --- | --- |
| Docker Compose | Primeiro teste, servidor próprio e produção simples | Frontend + API + PostgreSQL |
| Desenvolvimento local | Quem vai alterar o código | Vite + API Node + PostgreSQL em Docker |
| Vercel + Supabase | Iniciantes que preferem serviços gerenciados | Frontend na Vercel + banco no Supabase + API em host Node |

> **Importante:** Supabase substitui o banco PostgreSQL, não a API Express. A API também grava uploads em disco. Por isso, a aplicação completa não deve ser colocada somente em Vercel Functions sem antes substituir o armazenamento local por um serviço de objetos.

Se você quiser delegar a instalação a um assistente de IA, peça para ele ler e seguir integralmente o arquivo [`Intall_By_Robo.md`](Intall_By_Robo.md). Ele contém o roteiro operacional para instalação local, VPS e Vercel + Supabase.

## Instalação rápida com Docker

### Requisitos

- Git;
- Docker Engine 24+ com Docker Compose v2;
- OpenSSL para gerar os segredos.

### 1. Baixe e configure

```bash
git clone https://github.com/seccors-86/Nuvyo.git
cd Nuvyo
cp .env.example .env
```

Gere valores diferentes para `POSTGRES_PASSWORD`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY` e `BOOTSTRAP_ADMIN_PASSWORD`:

```bash
openssl rand -hex 32
```

Edite `.env`, preencha os quatro valores e escolha o login inicial em `BOOTSTRAP_ADMIN_LOGIN`. Nenhum desses segredos deve ser enviado ao Git.

### 2. Inicie a aplicação

```bash
docker compose up -d --build
docker compose ps
```

Acesse [http://localhost:8088](http://localhost:8088). O endpoint de saúde fica em [http://localhost:8088/health](http://localhost:8088/health).

No primeiro início, as migrações criam o banco e a API provisiona o administrador informado no `.env`. Essas credenciais deixam de ser usadas para provisionamento assim que existe um administrador.

### 3. Operação básica

```bash
# acompanhar os logs
docker compose logs -f backend frontend postgres

# recriar as imagens depois de atualizar o código
git pull
docker compose up -d --build

# parar sem excluir os dados
docker compose down
```

Os volumes `postgres_data` e `uploads_data` preservam banco e arquivos. `docker compose down -v` apaga ambos e deve ser usado somente quando a perda desses dados for intencional.

### Modo de demonstração local

Para avaliar os três níveis de acesso sem cadastrar usuários manualmente, use o arquivo de demonstração:

```bash
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

Ele cria ou restaura estas contas somente no ambiente local:

| Perfil | Login | Senha |
| --- | --- | --- |
| Super Admin | `88888888888` | `88888888888` |
| Gestor | `88888888899` | `88888888899` |
| Colaborador | `88888888800` | `88888888800` |

Abra [http://localhost:8088](http://localhost:8088). Para excluir completamente os dados da demonstração:

```bash
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml down -v
```

> Essas credenciais são públicas e previsíveis. `DEMO_USERS_ENABLED=true` é recusado quando `NODE_ENV=production`; nunca altere essa proteção nem exponha o modo demo à internet.

## Desenvolvimento local

Use Node.js 22 e npm 10 ou superior.

### 1. Banco

Crie o `.env` da raiz como na instalação Docker e inicie somente o PostgreSQL:

```bash
cp .env.example .env
docker compose up -d postgres
```

O banco fica disponível apenas na máquina local, por padrão em `127.0.0.1:5437`.

### 2. API

```bash
cp backend/.env.example backend/.env
cd backend
npm ci
npm run dev
```

No `backend/.env`, use `DB_PORT=5437`, preencha os segredos e as credenciais do administrador inicial. A API inicia em `http://localhost:3001`.

### 3. Frontend

Em outro terminal:

```bash
npm ci
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173). Durante o desenvolvimento, o Vite encaminha `/api` para `http://127.0.0.1:3001`. Para usar outro endereço, defina `VITE_DEV_API_PROXY`.

## Implantação amigável com Vercel e Supabase

Este modelo reduz a administração de infraestrutura, mas ainda precisa de três serviços:

1. **Supabase:** PostgreSQL gerenciado;
2. **um host Node/container:** API Express e volume persistente de uploads;
3. **Vercel:** frontend React estático.

### 1. Crie e inicialize o banco no Supabase

Crie um projeto no Supabase e copie a conexão PostgreSQL na seção **Connect**. Para um backend persistente sem IPv6, prefira o **Session pooler**, porta `5432`. A conexão direta também funciona quando o host oferece IPv6. Consulte a [documentação oficial de conexões](https://supabase.com/docs/guides/database/connecting-to-postgres).

Com `psql` instalado, execute uma vez:

```bash
export DATABASE_URL='postgresql://USUARIO:SENHA@HOST:5432/postgres?sslmode=require'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/migrations/schema_complete.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/migrations/seed_minimal.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/migrations/schema_evolution.sql
```

O frontend não usa a Data API do Supabase. Não publique a conexão do banco nem chaves de serviço em variáveis `VITE_*`. Se decidir habilitar a Data API, configure Row Level Security antes de expor uma chave pública; a alternativa mais simples para esta arquitetura é não expor o schema da aplicação pela Data API.

### 2. Publique a API

Use um serviço que execute um container Node continuamente e permita montar um volume persistente, como Render, Railway, Fly.io ou uma VM. Configure:

- diretório raiz: `backend`;
- Dockerfile: `backend/Dockerfile`;
- porta interna: `3001`;
- verificação de saúde: `/health`;
- volume persistente: `/app/uploads`.

Variáveis mínimas da API:

```dotenv
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=<resultado de openssl rand -hex 32>
MFA_ENCRYPTION_KEY=<outro resultado de openssl rand -hex 32>
BOOTSTRAP_ADMIN_LOGIN=99999999999
BOOTSTRAP_ADMIN_PASSWORD=<senha forte com pelo menos 12 caracteres>
FRONTEND_URL=https://app.seudominio.com
CORS_ORIGINS=https://app.seudominio.com
```

Depois que o administrador existir, remova `BOOTSTRAP_ADMIN_LOGIN` e `BOOTSTRAP_ADMIN_PASSWORD` do ambiente do host. Configure backups do banco e do volume de uploads.

### 3. Publique o frontend na Vercel

Importe este repositório na Vercel e use:

| Campo | Valor |
| --- | --- |
| Framework | Vite |
| Root Directory | raiz do repositório |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Adicione a variável de build:

```dotenv
VITE_API_URL=https://api.seudominio.com/api
```

O `vercel.json` incluído preserva as rotas da SPA. Faça um novo deploy sempre que alterar `VITE_API_URL`, pois variáveis `VITE_*` são incorporadas ao bundle durante o build.

### Domínios e cookies

A sessão usa cookie `HttpOnly`, `Secure` e `SameSite=Strict`. Para manter esse controle sem enfraquecê-lo, use domínios irmãos:

```text
https://app.seudominio.com  → Vercel
https://api.seudominio.com  → backend
```

Os domínios padrão `*.vercel.app` e de outro provedor são sites diferentes e podem impedir o envio do cookie estrito. No backend, `CORS_ORIGINS` deve conter exatamente a origem do frontend, sem curingas.

## Variáveis de ambiente

### Frontend

| Variável | Padrão | Função |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | URL pública da API |
| `VITE_BASE_PATH` | `/` | Caminho base do frontend |
| `VITE_DEV_API_PROXY` | `http://127.0.0.1:3001` | Destino do proxy local |

Somente valores públicos podem usar o prefixo `VITE_`.

### Backend

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `DATABASE_URL` | em banco gerenciado | Conexão PostgreSQL completa; substitui `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` |
| `DB_SSL` | em Supabase | Ativa TLS para o banco |
| `DB_SSL_REJECT_UNAUTHORIZED` | recomendada | Mantém a validação do certificado TLS |
| `DB_POOL_MAX` | não | Máximo de conexões; padrão `20` |
| `JWT_SECRET` | sim | Assina as sessões; mínimo de 32 caracteres |
| `MFA_ENCRYPTION_KEY` | sim | Protege segredos TOTP com AES-256-GCM |
| `FRONTEND_URL` / `CORS_ORIGINS` | sim | Origens autorizadas, separadas por vírgula |
| `BOOTSTRAP_ADMIN_LOGIN` | primeiro início | Login do administrador inicial |
| `BOOTSTRAP_ADMIN_PASSWORD` | primeiro início | Senha inicial, mínimo de 12 caracteres |
| `DEMO_USERS_ENABLED` | não | Cria as contas previsíveis de demonstração; proibido em produção |
| `GEMINI_API_KEY` | não | Habilita os recursos de IA |

Veja todos os campos em [`.env.example`](.env.example) e [`backend/.env.example`](backend/.env.example).

## Segurança e MFA

Entre os controles implementados estão:

- sessão em cookie `HttpOnly`, `Secure` e `SameSite=Strict`, sem JWT no `localStorage`;
- senhas com bcrypt, comparação resistente à enumeração, bloqueio progressivo e rate limiting;
- autorização no servidor por perfil, área, propriedade e compartilhamento;
- MFA TOTP compatível com Microsoft Authenticator, Google Authenticator, Duo e outros aplicativos RFC 6238;
- segredos TOTP cifrados com AES-256-GCM e códigos de recuperação de uso único;
- revogação global de sessões quando a política de MFA é alterada;
- CORS por allowlist, Helmet, limites de requisição, CSP no Nginx e auditoria de eventos;
- uploads validados, recodificados em WebP, limitados em tamanho e sem metadados;
- varredura de dependências e segredos no GitHub Actions.

O administrador ativa ou desativa a exigência global em **Configurações de Gestão → Segurança e MFA**. Ao ativar, usuários ainda não cadastrados recebem um QR Code no próximo acesso.

Leia a [política de segurança](SECURITY.md) antes de publicar. Os controles técnicos ajudam em auditorias, mas uma certificação ISO 27001 depende também do SGSI da organização: processos, análise de riscos, responsáveis, evidências, backups, continuidade e resposta a incidentes.

## Verificação antes de publicar

```bash
npm run typecheck
npm run build
npm audit --audit-level=moderate

npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend audit --audit-level=moderate

docker compose config
docker compose build
```

O workflow em `.github/workflows/security.yml` repete as verificações essenciais em pushes e pull requests.

## Contribuindo

1. Faça um fork do projeto.
2. Crie uma branch curta e descritiva: `git switch -c feat/minha-melhoria`.
3. Implemente e execute as verificações acima.
4. Não inclua `.env`, dumps, uploads, credenciais ou dados pessoais.
5. Abra um pull request explicando problema, solução e como testar.

Vulnerabilidades não devem ser publicadas em issues. Siga o canal descrito em [SECURITY.md](SECURITY.md).

## Licença

Distribuído sob a licença [Apache 2.0](LICENSE). Você pode usar, modificar e redistribuir o projeto conforme os termos da licença, preservando os avisos aplicáveis.
