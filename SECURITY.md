# Política de Segurança

Não abra issues públicas para relatar vulnerabilidades ou expor dados pessoais.

Use **Security → Report a vulnerability** no GitHub ou acesse o [formulário privado de vulnerabilidade](https://github.com/seccors-86/Nuvyo/security/advisories/new). Inclua impacto, passos de reprodução e uma sugestão de correção quando possível.

## Requisitos para implantação

- Nunca versione `.env`, backups, uploads ou dados reais.
- Use senhas exclusivas e um `JWT_SECRET` aleatório com pelo menos 32 caracteres.
- Mantenha banco e backend fora da exposição direta à internet.
- Atualize dependências e execute `npm audit` antes de cada release.
- Remova dados pessoais de fixtures, logs e exemplos.

## Controles técnicos implementados

- Autorização no servidor por usuário, papel, área, propriedade e compartilhamento; o frontend nunca é fonte de autorização.
- Sessão em cookie `HttpOnly`, `Secure` e `SameSite=Strict`; JWT não é devolvido ao navegador nem persistido em `localStorage`.
- Revogação de sessões por `token_version` quando o perfil é alterado.
- Rate limiting de autenticação e da API, limites de corpo JSON e validação de tipos/tamanhos.
- CORS com allowlist, CSP, HSTS, anti-clickjacking, anti-sniffing e Permissions Policy.
- Uploads com nomes aleatórios, tipos permitidos e limite de 5 MB; SVG é bloqueado.
- Imagens são decodificadas pelo servidor, limitadas a 40 megapixels, redimensionadas e convertidas para WebP sem metadados.
- Sanitização de HTML com DOMPurify antes da renderização.
- Eventos de autenticação e mutações são persistidos em `security_audit_events`; somente administradores podem consultá-los.
- Falhas de senha são contabilizadas por conta e provocam bloqueio temporário progressivo.
- MFA TOTP pode ser exigido globalmente pelo administrador e funciona com aplicativos autenticadores compatíveis com RFC 6238.
- Segredos TOTP são protegidos com AES-256-GCM usando `MFA_ENCRYPTION_KEY`; códigos de recuperação são de uso único e armazenados como HMAC.
- Ativar ou desativar a política global de MFA revoga todas as sessões; códigos TOTP não podem ser reutilizados na mesma janela temporal.

## MFA

Gere uma chave exclusiva para cada instalação:

```text
openssl rand -hex 32
```

Defina o resultado em `MFA_ENCRYPTION_KEY`. Nunca altere essa chave enquanto houver usuários com MFA cadastrado; uma rotação exige recadastrar os autenticadores. O administrador controla a exigência geral em **Configurações de Gestão → Segurança e MFA**. Ao ativar, todos entram novamente e usuários ainda não cadastrados recebem um QR Code. Os dez códigos de recuperação são exibidos somente uma vez.
- Respostas de usuários não incluem `password_hash`; dados de contato são limitados por perfil.
- CI executa typecheck, build, auditoria de dependências e varredura de segredos.

## Evidências de release

Antes de liberar uma versão, arquive o resultado de:

```text
npm run typecheck
npm run build
npm audit --audit-level=moderate
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend audit --audit-level=moderate
```

Além dos testes automatizados, faça testes negativos com os quatro perfis (`admin`, `manager`, `member` e usuário sem sessão), tentando ler, alterar e excluir registros de outra área. Registre a data, versão, ambiente, resultado e responsável.

## Operação e governança

Para uma auditoria ISO 27001/27002, este arquivo não substitui o SGSI. Mantenha também inventário de ativos, matriz de riscos, revisão trimestral de acessos, política de retenção, backups criptografados testados, plano de resposta a incidentes, gestão de fornecedores, treinamento e evidência de correções.
