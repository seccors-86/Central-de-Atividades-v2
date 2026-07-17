# Instalação assistida por robô — NUVYO

Este arquivo é um roteiro operacional para assistentes de IA, agentes de código e ferramentas de automação. Se você é uma pessoa sem experiência técnica, envie este arquivo ao assistente e diga:

> Leia `INSTALL_BY_ROBO.md` integralmente, identifique meu tipo de instalação e conduza o processo até todos os testes finais passarem. Não exponha senhas nem apague dados existentes.

O assistente deve ler também o [`README.md`](README.md), o [`.env.example`](.env.example), o [`backend/.env.example`](backend/.env.example) e o [`SECURITY.md`](SECURITY.md) da mesma versão do repositório antes de executar qualquer alteração.

## Objetivo do agente

Entregar uma destas instalações funcionando:

1. **Local com Docker:** aplicação completa na máquina do usuário;
2. **Demonstração local:** aplicação completa com três usuários previsíveis e dados fictícios em todos os módulos;
3. **VPS:** aplicação completa em servidor, com domínio, HTTPS, banco e uploads persistentes;
4. **Vercel + Supabase:** frontend na Vercel, PostgreSQL no Supabase e backend em um serviço Node persistente.

O trabalho só está concluído quando a URL abre, `/health` responde, o login administrativo funciona e nenhum segredo foi versionado ou exibido em logs públicos.

## Regras obrigatórias para o agente

- Nunca imprimir, enviar ao chat, versionar ou incluir em PR valores de `.env`, senhas, tokens, chaves ou strings de conexão.
- Ao verificar um `.env`, mostrar somente se cada variável está configurada e se o formato é válido. Nunca usar comandos que imprimam a linha completa de uma variável secreta.
- Nunca sobrescrever um `.env` existente. Primeiro verificar quais variáveis faltam e preservar os valores atuais.
- Nunca executar `docker compose down -v`, apagar volumes, recriar banco, alterar DNS, firewall ou proxy de uma instalação existente sem confirmação expressa.
- Nunca habilitar `DEMO_USERS_ENABLED=true` em ambiente público. O backend deve recusar essa configuração quando `NODE_ENV=production`.
- Nunca usar as credenciais de demonstração como credenciais reais.
- Não declarar a recuperação de senha como ativa antes de configurar e testar SMTP, TLS e o e-mail de cada usuário.
- Não usar uma chave Supabase `service_role`, `anon`, senha do banco ou `DATABASE_URL` em variável com prefixo `VITE_`.
- Não expor PostgreSQL ou a porta `3001` da API diretamente à internet.
- Em uma atualização, fazer backup verificável do PostgreSQL e do volume de uploads antes de recriar serviços.
- Usar versões e arquivos presentes no repositório. Se este documento divergir do código, interromper e explicar a divergência.
- Pedir ao usuário apenas decisões ou autenticações que não possam ser descobertas localmente. Nunca pedir que ele cole um segredo no chat se puder inseri-lo diretamente no painel do provedor.

## Etapa 1 — Descobrir o cenário

Antes de executar comandos, o agente deve responder internamente às perguntas abaixo e perguntar ao usuário somente o que estiver faltando:

1. É uma instalação nova ou uma atualização?
2. O destino é local, demonstração local, VPS ou Vercel + Supabase?
3. O sistema operacional é Linux, macOS ou Windows com WSL2?
4. Docker e Docker Compose estão disponíveis?
5. Para VPS: qual é o domínio, qual IP deve receber o DNS e o usuário possui `sudo`?
6. Para nuvem: quais contas estão disponíveis na Vercel, Supabase e no host do backend?
7. Já existe banco, `.env`, container, volume ou instalação NUVYO no destino?

Se houver dados existentes, mudar para o fluxo de atualização e não seguir como instalação nova.

## Etapa 2 — Verificações comuns

Na máquina que fará o build, verificar:

```bash
git --version
docker --version
docker compose version
openssl version
```

Para desenvolvimento sem Docker, verificar também:

```bash
node --version
npm --version
```

Versões esperadas:

- Docker Engine 24 ou superior;
- Docker Compose v2;
- Node.js 22 quando houver execução fora dos containers;
- PostgreSQL 15 ou compatível.

Se uma ferramenta estiver ausente, instalar pela documentação oficial do sistema operacional ou do provedor. Não executar instaladores remotos sem informar ao usuário o que será alterado.

## Etapa 3 — Obter o código

Para uma instalação nova:

```bash
git clone https://github.com/seccors-86/Nuvyo.git
cd Nuvyo
```

Se o diretório já existir:

```bash
git status --short
git remote -v
git branch --show-current
```

Não executar `git pull` se houver mudanças locais sem antes explicar e preservar essas mudanças.

## Segredos e primeiro administrador

Uma instalação real não possui senha pública padrão. Copiar o exemplo sem sobrescrever arquivos existentes:

```bash
test -f .env || cp .env.example .env
chmod 600 .env
```

Gerar um valor diferente para cada segredo:

```bash
openssl rand -hex 32
```

Preencher no `.env` sem mostrar os valores na saída:

```dotenv
POSTGRES_PASSWORD=<segredo exclusivo>
JWT_SECRET=<segredo exclusivo com pelo menos 32 caracteres>
MFA_ENCRYPTION_KEY=<outro segredo exclusivo>
BOOTSTRAP_ADMIN_LOGIN=<CPF ou telefone com 11 a 20 dígitos>
BOOTSTRAP_ADMIN_PASSWORD=<senha exclusiva com pelo menos 12 caracteres>
DEMO_USERS_ENABLED=false
```

O login administrativo deve conter somente dígitos porque a interface aceita CPF ou telefone. Depois que o primeiro administrador existir, remover `BOOTSTRAP_ADMIN_LOGIN` e `BOOTSTRAP_ADMIN_PASSWORD` do ambiente e recriar somente o backend.

Não trocar `MFA_ENCRYPTION_KEY` em uma instalação com MFA ativo sem planejar o recadastro dos autenticadores.

## Recuperação de senha e SMTP

Este recurso é opcional, mas deve ser configurado antes de declarar a instalação pronta quando o usuário solicitar recuperação de senha. Ele exige SMTP no backend e um e-mail único cadastrado no perfil de cada usuário.

### SMTP genérico

Obter do usuário ou do provedor os seguintes valores, pedindo que os segredos sejam inseridos diretamente no `.env` ou no painel privado do host:

```dotenv
SMTP_HOST=<servidor SMTP>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=<conta autenticada>
SMTP_PASSWORD=<segredo inserido diretamente pelo usuário>
SMTP_FROM="NUVYO <remetente-autorizado@seudominio.com>"
```

Para STARTTLS na porta 587, usar `SMTP_SECURE=false` e `SMTP_REQUIRE_TLS=true`. Para TLS direto na porta 465, usar `SMTP_SECURE=true`. Manter a validação do certificado TLS; não sugerir `rejectUnauthorized=false`.

### Gmail para testes

Uma conta Gmail comum pode ser usada para testes. O agente deve orientar o usuário a:

1. ativar a verificação em duas etapas na conta Google;
2. abrir [Senhas de app do Google](https://support.google.com/accounts/answer/185833?hl=pt-BR);
3. criar uma senha de app chamada `NUVYO`;
4. inserir os 16 caracteres diretamente no `.env`, sem espaços;
5. nunca fornecer ao agente a senha normal da conta Google.

Configuração esperada:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=seuemail@gmail.com
SMTP_PASSWORD=<senha-de-app-sem-espacos>
SMTP_FROM="NUVYO <seuemail@gmail.com>"
```

No Gmail, usar o mesmo endereço em `SMTP_USER` e `SMTP_FROM`. Se uma senha de app aparecer em terminal compartilhado, log, chat ou ferramenta de diagnóstico, interromper o teste, removê-la do ambiente, pedir ao usuário que a revogue no Google e continuar somente com uma nova senha.

### Aplicar e validar

Em Docker Compose:

```bash
chmod 600 .env
docker compose up -d --force-recreate backend
curl -fsS http://localhost:8088/api/auth/recover/config
```

Em produção, substituir a URL local pela URL pública. O resultado esperado é:

```json
{"enabled":true}
```

Depois:

1. confirmar pela interface administrativa que o usuário de teste possui um e-mail único e correto;
2. abrir **Esqueci minha senha** na tela de login;
3. usar o CPF ou telefone do próprio usuário de teste;
4. pedir que o usuário confira caixa de entrada e spam e digite o código diretamente no navegador;
5. confirmar que a nova senha possui pelo menos 12 caracteres e é diferente do login;
6. validar que a senha antiga e as sessões anteriores deixaram de funcionar.

O agente não deve pedir que o usuário envie o código de recuperação pelo chat. Um `202` na solicitação é deliberadamente neutro e não comprova entrega. A validação só termina após o backend não registrar erro SMTP e o usuário confirmar o recebimento. Para produção, recomendar remetente exclusivo ou provedor transacional, além de SPF, DKIM e DMARC.

## Relatórios com Inteligência Artificial

O módulo é opcional e suporta Google Gemini, OpenAI e Anthropic Claude. A configuração recomendada é feita pelo frontend depois do primeiro login administrativo. A chave é enviada diretamente ao backend, validada no provedor e armazenada cifrada no PostgreSQL; ela não deve ser adicionada a variáveis `VITE_*` nem enviada ao chat.

### Pré-requisitos

- `MFA_ENCRYPTION_KEY` válida, estável e protegida;
- saída HTTPS do backend para o provedor escolhido;
- chave de API com permissão para consultar e usar modelos;
- aprovação do responsável sobre custos, retenção, região e envio dos dados ao provedor.

O agente deve explicar que projetos, tarefas e diários autorizados no escopo do relatório serão transmitidos ao provedor selecionado. Não habilitar o recurso com dados reais sem essa ciência.

### Configuração assistida

1. autenticar como superadmin;
2. abrir **Configurações → Configurar Inteligência Artificial**;
3. pedir que o usuário cole a chave diretamente no campo da interface, sem mostrá-la ao agente;
4. selecionar Google Gemini, OpenAI ou Anthropic Claude;
5. clicar em **Carregar modelos disponíveis**;
6. escolher um modelo de texto disponível para aquela chave;
7. salvar a configuração;
8. fechar e abrir novamente a tela, confirmando apenas que existe uma chave armazenada, nunca seu conteúdo.

### Templates e Gestor de Projetos Sênior

Depois de configurar o provedor, o agente deve abrir **Configurações → Templates de Relatórios IA** e confirmar:

1. existência do template destacado **Gestor de Projetos Sênior**;
2. possibilidade de criar, duplicar, editar e excluir um template;
3. possibilidade de adicionar, remover e reordenar até 12 seções;
4. seleção das variáveis específicas de cada seção;
5. restauração dos templates padrão sem excluir os templates personalizados.

O editor não controla as regras globais de segurança. Escopo, autorização, proteção contra instruções contidas nos dados e sanitização do HTML permanecem no backend. Somente o superadmin pode alterar templates. A exclusão preserva o histórico de relatórios.

A aplicação consulta os endpoints oficiais de modelos do [Gemini](https://ai.google.dev/api/models), da [OpenAI](https://developers.openai.com/api/reference/resources/models/methods/list) e da [Anthropic](https://platform.claude.com/docs/en/api/models/list). Não manter uma lista manual de modelos no `.env` nem assumir que uma chave possui acesso a todos os modelos do provedor.

`GEMINI_API_KEY` no ambiente funciona somente como compatibilidade legada. Quando presente e ainda não existir configuração no banco, ativa Gemini com o modelo legado. Para instalações novas, preferir o frontend. Nunca mover essa chave para `VITE_GEMINI_API_KEY`.

### Teste funcional

1. abrir **Gerar Relatório com IA** como administrador ou gestor;
2. escolher um período curto e o template **Gestor de Projetos Sênior**;
3. testar os escopos permitidos: empresa/estrutura, área, cliente e colaborador;
4. escrever uma pergunta adicional sem inserir dados secretos;
5. confirmar que o resultado aparece como HTML formatado;
6. abrir **Histórico de Relatórios IA** e localizar o item;
7. usar **Exportar PDF** e confirmar a visualização de impressão em A4;
8. confirmar que um colaborador comum recebe HTTP 403 nas rotas de IA;
9. confirmar que um gestor não consegue configurar o provedor nem gerar relatórios fora de sua área.
10. confirmar que um gestor recebe HTTP 403 ao tentar criar, editar, excluir ou restaurar templates;

O agente não deve considerar um HTTP 200 isolado como validação suficiente: deve confirmar a aparência do relatório, o histórico, o escopo e a exportação. Se a chave for exposta em terminal, log ou chat, interromper, removê-la da configuração e orientar sua revogação no provedor.

---

# Caminho A — Instalação local com Docker

Este é o caminho recomendado para usuários iniciantes que querem dados persistentes e credenciais próprias.

## A1. Configurar

No `.env`:

```dotenv
APP_PORT=8088
POSTGRES_PORT=5437
FRONTEND_URL=http://localhost:8088
CORS_ORIGINS=http://localhost:8088
DEMO_USERS_ENABLED=false
```

Confirmar que as portas estão livres. No Linux:

```bash
ss -lnt | grep -E ':(8088|5437)\b' || true
```

Se estiverem ocupadas, escolher outras portas em `APP_PORT` e `POSTGRES_PORT`. Ajustar `FRONTEND_URL` e `CORS_ORIGINS` para a nova porta do frontend.

## A2. Construir e iniciar

```bash
docker compose config -q
docker compose up -d --build
docker compose ps
```

Não usar `docker compose config` sem `-q` em uma sessão pública, pois a saída expandida pode mostrar segredos.

## A3. Validar

```bash
curl -fsS http://localhost:8088/health
docker compose ps
docker compose logs --tail=100 backend
```

Resultado esperado de saúde:

```json
{"status":"ok","message":"NUVYO API is running"}
```

Abrir `http://localhost:8088` para validar a landing page e `http://localhost:8088/app` para autenticar com `BOOTSTRAP_ADMIN_LOGIN` e `BOOTSTRAP_ADMIN_PASSWORD`. Confirmar que o Painel Geral carrega sem erros 404/500.

## A4. Após o primeiro login

1. Criar ou confirmar o administrador definitivo.
2. Remover `BOOTSTRAP_ADMIN_LOGIN` e `BOOTSTRAP_ADMIN_PASSWORD` do `.env`.
3. Executar `docker compose up -d --force-recreate backend`.
4. Ativar MFA em **Configurações de Gestão → Segurança e MFA** quando desejado.

---

# Caminho B — Demonstração local

Este caminho serve somente para avaliação na máquina local. Ele não deve ser usado em VPS, Vercel ou qualquer URL pública.

## B1. Iniciar

Ainda é necessário preencher `POSTGRES_PASSWORD`, `JWT_SECRET` e `MFA_ENCRYPTION_KEY` no `.env`.

```bash
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml config -q
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

## B2. Contas

| Perfil | Login | Senha |
| --- | --- | --- |
| Super Admin | `88888888888` | `88888888888` |
| Gestor | `88888888899` | `88888888899` |
| Colaborador | `88888888800` | `88888888800` |

Validar os três perfis em `http://localhost:8088/app`.

## B3. Encerrar e apagar somente a demonstração

Depois de confirmar com o usuário que os dados demo podem ser perdidos:

```bash
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml down -v
```

O uso de `-p nuvyo-demo` separa os volumes demo dos volumes da instalação padrão.

## B4. Conteúdo esperado da demonstração

Confirmar que a carga criou áreas, clientes, seis projetos, dezoito tarefas, chamados, diário de bordo, comentários, notificações, gamificação, campanhas, resumo gerencial e sugestões. A carga está em `backend/src/migrations/seed_demo.sql`, usa apenas IDs com prefixo `demo-` e pode ser executada novamente para restaurar os dados e recalcular as datas relativas:

```bash
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml \
  exec -T postgres psql -U postgres -d central_atividades -v ON_ERROR_STOP=1 \
  < backend/src/migrations/seed_demo.sql
```

---

# Caminho C — VPS com domínio e HTTPS

Arquitetura esperada:

```text
Internet → HTTPS 443 → Caddy/Nginx externo → 127.0.0.1:8088
                                               ├── frontend Nginx
                                               ├── backend Node
                                               └── PostgreSQL em volume Docker
```

## C1. Pré-requisitos

- VPS Linux atualizada;
- usuário com `sudo`;
- Docker e Compose v2;
- domínio com registro `A` apontando para o IPv4 da VPS;
- portas públicas `80/tcp` e `443/tcp` liberadas;
- portas `3001` e `5432/5437` não expostas publicamente.

O agente deve confirmar o domínio antes de alterar DNS, proxy ou CORS.

## C2. Diretório e arquivos

Um local sugerido é `/opt/nuvyo`. Ajustar proprietário sem tornar o `.env` legível por outros usuários:

```bash
sudo mkdir -p /opt/nuvyo
sudo chown "$USER":"$USER" /opt/nuvyo
git clone https://github.com/seccors-86/Nuvyo.git /opt/nuvyo
cd /opt/nuvyo
cp .env.example .env
chmod 600 .env
```

No `.env`, além dos segredos:

```dotenv
APP_PORT=8088
POSTGRES_PORT=5437
FRONTEND_URL=https://nuvyo.seudominio.com
CORS_ORIGINS=https://nuvyo.seudominio.com
DEMO_USERS_ENABLED=false
```

Não colocar barra no final de `FRONTEND_URL` ou `CORS_ORIGINS`.

## C3. Iniciar containers

```bash
docker compose config -q
docker compose up -d --build
curl -fsS http://127.0.0.1:8088/health
```

## C4. Proxy HTTPS

Se a VPS já possui proxy reverso, adicionar apenas uma rota para `127.0.0.1:8088` e preservar as demais aplicações.

Exemplo mínimo de Caddy para `/etc/caddy/Caddyfile`:

```caddyfile
nuvyo.seudominio.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8088
}
```

Validar e recarregar sem derrubar outros sites:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Se Caddy não estiver instalado, seguir a documentação oficial. Não substituir Nginx, Traefik ou painel de hospedagem já existente sem autorização.

## C5. Validar externamente

```bash
curl -fsS https://nuvyo.seudominio.com/health
curl -fsSI https://nuvyo.seudominio.com/
```

Confirmar:

- certificado TLS válido;
- frontend com HTTP 200;
- `/health` com HTTP 200;
- `/api/project-config` sem sessão com HTTP 401, que é o resultado seguro esperado;
- login e logout funcionando;
- cookie `nuvyo_session` com `HttpOnly`, `Secure` e `SameSite=Strict`;
- nenhuma porta de PostgreSQL acessível pelo IP público.

## C6. Backups e operação

Criar rotina de backup criptografado fora da VPS para:

1. banco `central_atividades`;
2. volume `uploads_data`;
3. `.env`, armazenado em cofre separado.

Testar restauração periodicamente. Um arquivo de backup que nunca foi restaurado não é evidência suficiente de continuidade.

---

# Caminho D — Vercel + Supabase

Esta opção exige **três serviços**. Não tentar hospedar tudo somente na Vercel:

```text
app.seudominio.com → Vercel → frontend React
api.seudominio.com → host Node/container persistente → backend Express + volume /app/uploads
                                                    └→ Supabase PostgreSQL
```

## D1. Decisões obrigatórias

Antes de continuar, obter do usuário:

- projeto Supabase;
- projeto Vercel;
- serviço para o backend persistente: Render, Railway, Fly.io, VPS ou equivalente;
- domínio próprio que permita `app.seudominio.com` e `api.seudominio.com`.

Sem um host persistente para o backend e sem volume para `/app/uploads`, interromper. Vercel Functions não substituem essa parte da arquitetura atual.

## D2. Supabase

1. Criar o projeto.
2. Abrir **Connect** e obter a string PostgreSQL.
3. Para backend persistente sem IPv6, preferir o **Session pooler** na porta `5432`.
4. Manter TLS com `sslmode=require`.
5. Não compartilhar a string em logs ou commits.

Executar na raiz do repositório, em uma sessão privada:

```bash
export DATABASE_URL='postgresql://USUARIO:SENHA@HOST:5432/postgres?sslmode=require'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/migrations/schema_complete.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/migrations/seed_minimal.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/migrations/schema_evolution.sql
unset DATABASE_URL
```

Se `psql` não estiver instalado, instalar o cliente PostgreSQL oficial. Não colar a URL no histórico de tickets, chat ou CI.

O frontend NUVYO não precisa de chave Supabase. Não configurar `VITE_SUPABASE_*`. Se a Data API do Supabase for exposta, habilitar RLS antes; para esta arquitetura, preferir não expor o schema da aplicação pela Data API.

## D3. Backend persistente

Configuração esperada no provedor:

| Item | Valor |
| --- | --- |
| Root directory | `backend` |
| Dockerfile | `backend/Dockerfile` ou `Dockerfile` quando o root já for `backend` |
| Porta interna | `3001` |
| Health check | `/health` |
| Volume persistente | `/app/uploads` |

Variáveis mínimas:

```dotenv
NODE_ENV=production
PORT=3001
DATABASE_URL=<string privada do Supabase>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=<segredo aleatório>
MFA_ENCRYPTION_KEY=<outro segredo aleatório>
BOOTSTRAP_ADMIN_LOGIN=<11 a 20 dígitos>
BOOTSTRAP_ADMIN_PASSWORD=<senha forte>
FRONTEND_URL=https://app.seudominio.com
CORS_ORIGINS=https://app.seudominio.com
DEMO_USERS_ENABLED=false
```

Publicar e validar:

```bash
curl -fsS https://api.seudominio.com/health
```

Depois do primeiro administrador, remover as duas variáveis `BOOTSTRAP_ADMIN_*` e publicar novamente o backend.

## D4. Vercel

Importar `seccors-86/Nuvyo` com:

| Campo | Valor |
| --- | --- |
| Framework | Vite |
| Root Directory | raiz do repositório |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Variável pública de build:

```dotenv
VITE_API_URL=https://api.seudominio.com/api
```

Não adicionar `DATABASE_URL`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY` ou chaves Supabase à Vercel do frontend.

Associar `app.seudominio.com` ao projeto Vercel e `api.seudominio.com` ao host do backend. Esses domínios irmãos são necessários para a política `SameSite=Strict`. Usar apenas `*.vercel.app` junto com o domínio padrão de outro provedor pode impedir o cookie de sessão.

Fazer um novo deploy depois de alterar `VITE_API_URL`, pois valores `VITE_*` são incorporados no build.

## D5. Validação completa

```bash
curl -fsS https://api.seudominio.com/health
curl -fsSI https://app.seudominio.com/
```

No navegador:

1. abrir `https://app.seudominio.com`;
2. autenticar com o administrador inicial;
3. confirmar que as chamadas vão para `https://api.seudominio.com/api`;
4. confirmar que não há erros CORS;
5. confirmar o cookie seguro;
6. enviar uma imagem e verificar que ela continua disponível após reiniciar o backend;
7. remover as variáveis de bootstrap e testar novo login.

---

# Desenvolvimento sem container para frontend e backend

Usar apenas quando o objetivo for alterar código. Manter o PostgreSQL em Docker:

```bash
cp .env.example .env
docker compose up -d postgres
cp backend/.env.example backend/.env
```

No `backend/.env`, usar `DB_HOST=localhost`, `DB_PORT=5437`, preencher os segredos e manter `NODE_ENV=development`.

Terminal da API:

```bash
cd backend
npm ci
npm run dev
```

Terminal do frontend, na raiz:

```bash
npm ci
npm run dev
```

Abrir `http://localhost:5173`.

## Atualização de uma instalação existente

O agente deve adaptar os comandos ao ambiente e seguir esta ordem:

1. registrar a versão/commit atual;
2. confirmar que o repositório não possui mudanças locais não salvas;
3. criar e verificar backup do PostgreSQL e uploads;
4. ler as novas migrações e notas de segurança;
5. executar `git pull --ff-only` somente quando for seguro;
6. executar typecheck, builds e auditorias;
7. recriar containers sem remover volumes;
8. validar saúde, login e recursos essenciais;
9. manter um plano de rollback para o commit e as imagens anteriores.

Comandos que não apagam volumes:

```bash
git pull --ff-only
docker compose config -q
docker compose up -d --build
docker compose ps
```

## Testes técnicos obrigatórios

Quando Node/npm estiver disponível:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=moderate

npm --prefix backend ci
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend audit --audit-level=moderate
```

Para Docker:

```bash
docker compose config -q
docker compose build
```

Não considerar avisos de bundle grande como falha funcional, mas registrá-los como oportunidade futura de divisão de código. Vulnerabilidades, erros TypeScript, falhas de build, migração ou saúde bloqueiam a conclusão.

## Diagnóstico rápido

### Backend não inicia

Verificar sem imprimir segredos:

```bash
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=100 postgres
```

Causas frequentes:

- `JWT_SECRET` menor que 32 caracteres;
- `MFA_ENCRYPTION_KEY` ausente;
- login bootstrap não numérico;
- senha bootstrap menor que 12 caracteres;
- banco indisponível ou `DATABASE_URL` incorreta;
- `DEMO_USERS_ENABLED=true` em produção.

### Erro CORS

Comparar a origem exata exibida pelo navegador com `CORS_ORIGINS`. Protocolo, domínio e porta precisam coincidir. Não resolver usando `*` quando cookies estão ativos.

### Login funciona na API, mas não no navegador

Verificar:

- `VITE_API_URL` termina em `/api`;
- frontend e API usam HTTPS;
- domínios são irmãos sob o mesmo domínio registrável;
- cookie não foi bloqueado por `SameSite=Strict`;
- proxy preserva `X-Forwarded-Proto`.

### Erros 500 em instalação nova

Confirmar que as três migrações foram executadas na ordem documentada e que o usuário do banco pode criar/alterar tabelas.

### Upload desaparece após reinício

O backend está sem volume persistente em `/app/uploads`. Corrigir o volume antes de colocar a aplicação em produção.

## Critérios de conclusão

O agente deve entregar ao usuário um resumo sem segredos contendo:

- cenário instalado;
- URL do frontend e URL de saúde;
- commit/versão implantada;
- containers ou serviços ativos;
- perfil do primeiro usuário, mostrando o login somente se o usuário autorizou;
- resultado de typecheck, build, auditoria e saúde;
- localização e data do backup, quando aplicável;
- itens ainda dependentes do usuário, como DNS ou ativação de MFA.

Checklist final:

- [ ] `.env` não está versionado e possui permissão restrita;
- [ ] `DEMO_USERS_ENABLED=false` em qualquer ambiente público;
- [ ] frontend abre com HTTPS em produção;
- [ ] `/health` responde HTTP 200;
- [ ] endpoint protegido sem sessão responde HTTP 401;
- [ ] login, logout e permissões básicas funcionam;
- [ ] PostgreSQL não está exposto à internet;
- [ ] uploads sobrevivem ao reinício;
- [ ] bootstrap foi removido depois do primeiro administrador;
- [ ] backups foram configurados e testados;
- [ ] MFA e política de segurança foram apresentados ao administrador;
- [ ] SMTP foi testado, o código chegou e os usuários possuem e-mails únicos, quando a recuperação estiver habilitada;
- [ ] IA foi configurada sem expor a chave, escopos foram validados e histórico/PDF funcionam, quando o módulo estiver habilitado;
- [ ] nenhum segredo apareceu no Git, CI, logs compartilhados ou resposta final.
