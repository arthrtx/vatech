# DECISIONS — vatech

## D1: Stack: Next.js + Laravel + MySQL

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur

**Contexto:** aplicação web de gestão de férias, ausências e licenças para pequenas empresas, com crescimento futuro. O dono exigiu Next.js, Laravel e MySQL e delegou o resto.

**Decisão:** frontend **Next.js 16**, backend **Laravel 13** (API), base de dados **MySQL 8.4** (phpMyAdmin), backoffice **Filament v5**, auth **Laravel Sanctum** (tokens).

**Alternativas consideradas:**
- Livewire 4 + Flux — prós: uma só base de código, stack da casa para apps — rejeitada porque o dono exigiu Next.js.
- PostgreSQL 17 — rejeitada: o dono exigiu MySQL e a produção no Ploi corre MySQL.

**Consequências:** front e back separados (dois deploys, CORS/tokens a tratar); Filament serve só o super-admin. Risco: PHP local 8.2.12 pode não cumprir o requisito do Laravel 13, mitigado com Docker/Sail (D3).

## D2: Só website

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur

**Contexto:** o produto é um website, sem aplicação instalável.

**Decisão:** o produto é o `web/` (Next.js) a falar com a API Laravel; volta a ficar dentro da stack da casa. `iniciar.bat` sobe API, base de dados e web e abre `http://localhost:3000`.

**Consequências:** a API tem de estar acessível ao website alojado (domínio ou IP, CORS a configurar; ver D5). Auth Sanctum por tokens. Q2 do PRD fica a decidir onde corre a API.

## D3: Ambiente local em Docker / Sail

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur (delegou) · **Proposto:** Claude

**Contexto:** máquina Windows 11 com PHP 8.2.12, sem composer, MySQL, Laragon ou Herd no PATH; Docker Desktop instalado.

**Decisão:** desenvolvimento no **Docker / Sail** (PHP e MySQL 8.4 em containers). O motor local é o mesmo de produção.

**Alternativas consideradas:**
- Laragon — exige instalar; rejeitada por haver Docker já.
- XAMPP — PHP possivelmente abaixo do exigido pelo Laravel 13 — rejeitada.

**Consequências:** sem instalar PHP e MySQL na máquina; o primeiro arranque faz download das imagens.

## D4: Base de dados MySQL 8.4, gerida por phpMyAdmin, multi-empresa por tenancy

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur

**Contexto:** várias empresas isoladas desde o dia 1, mais crescimento futuro.

**Decisão:** MySQL 8.4 em dev e produção; isolamento por empresa (tenancy). Modelo único de `Pedido` com tipo (férias, ausência, licença).

**Alternativas consideradas:**
- Uma BD por empresa — isolamento forte, mas operação cara — rejeitada para o arranque com 5 a 20 funcionários por cliente.
- Três tabelas (férias, ausências, licenças) — rejeitada: mesmo ciclo, duplicaria calendário e notificações.

**Consequências:** toda a consulta filtra por empresa; testes de isolamento obrigatórios.

## D5: Alojamento no Ploi, repositório privado

**Data:** 2026-11-18 · **Estado:** substituída por D8 · **Decidido por:** Arthur

**Contexto:** distribuição privada; a API tem de estar num servidor acessível ao website alojado.

**Decisão:** deploy no **Ploi** (skill `deploy-ploi`); repo privado `arthrtx/vatech`. Nada se configura no /start: a execução fecha o deploy ⛔.

**Alternativas consideradas:** VPS com Docker, cPanel — rejeitadas: Ploi dá Laravel + MySQL geridos.

**Consequências:** custo do servidor Ploi; domínio/IP a decidir para o website e a API (Q2 do PRD, em aberto).

## D6: Apagar funcionários por soft delete, não por cascade

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur (issue #13) · **Proposto:** Claude

**Contexto:** `pedidos.user_id` tem `cascadeOnDelete`: apagar um utilizador apagaria o histórico de pedidos da empresa. O admin precisa de remover funcionários que saem.

**Decisão:** `users` passa a ter `deleted_at` (`SoftDeletes`). `DELETE /api/funcionarios/{id}` marca o utilizador como apagado e revoga os tokens Sanctum; os pedidos mantêm-se na BD mas `GET /api/pedidos` oculta os de utilizadores apagados. A FK de `pedidos` não se altera (migração aplicada).

**Alternativas consideradas:**
- Apagar de vez (cascade) — rejeitada: perde histórico de pedidos.
- `restrictOnDelete` — rejeitada: impediria apagar quem já fez pedidos.

**Consequências:** o email de um funcionário apagado continua ocupado (índice único da BD); reutilizá-lo exige restaurar ou anonimizar, fora do âmbito desta decisão. Restaurar é possível (`restore()`), sem endpoint por agora.

## D7: Agenda da equipa por endpoint dedicado, sem dados sensiveis

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur (issue #16) · **Proposto:** Claude

**Contexto:** o funcionario deve ver a equipa na agenda (PRD F6), mas `subtipo` (ex.: medica), `observacao` e `motivo_recusa` nao podem chegar a colegas.

**Decisao:** `GET /api/agenda?de&ate`. Admin recebe pedidos completos; funcionario recebe os seus completos e, dos colegas, so pedidos aprovados com `{id, user:{id,nome}, tipo, data_inicio, data_fim, estado}`. A reducao e feita por lista explicita de campos no servidor, nunca por omissao no cliente.

**Alternativas consideradas:**
- Alargar `GET /api/pedidos` a colegas: rejeitada, exporia campos sensiveis por omissao.

**Consequencias:** campos novos do pedido nao chegam a colegas ate serem acrescentados a lista; `GET /api/pedidos` mantem-se so com os proprios pedidos.

## D8: Produção grátis com TiDB Cloud Starter e Render

**Data:** 2026-11-19 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** cada PC corria a sua base de dados, por isso os pedidos de uma pessoa não apareciam aos outros. Funcionários e chefe precisam de ver os mesmos dados. O Ploi (D5) custa dinheiro e não há conta da empresa para isto.

**Decisão:** base de dados no **TiDB Cloud Starter** (compatível com MySQL, grátis até 5 GiB por instância), API no **Render** (plano grátis, imagem `docker/api/Dockerfile.prod`, definida em `render.yaml`), site no **Vercel** como já estava. Passos em `docs/DEPLOY.md`.

**Alternativas consideradas:**
- Ploi: rejeitada por custo.
- Supabase: rejeitada, é PostgreSQL (D1 pede MySQL) e o plano grátis pausa projetos com pouca atividade.
- Aiven MySQL grátis: deixou de aceitar serviços novos em novembro de 2026.

**Consequências:** a API adormece após 15 minutos sem pedidos e o primeiro pedido a seguir demora cerca de um minuto. O disco do Render apaga-se a cada arranque, por isso as fotos de perfil guardadas no disco perdem-se até passarem para a base de dados ou para um armazenamento externo. O TiDB não suporta procedimentos guardados nem triggers (o vatech não usa).

## D9: Contas por convite do admin com aprovação

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** o auto-registo (#89) deixava qualquer pessoa criar conta. O admin quer controlar quem entra.

**Decisão:** o admin convida (nome, email, papel). O convidado abre o link, define a palavra-passe e aceita os termos; a conta nasce `pendente` e só entra depois de o admin a aprovar. Convite com token de uso único e 7 dias. O link também aparece ao admin porque produção ainda não tem SMTP. O texto do formulário é editável por empresa em Definições. Utilizadores existentes ficam `aprovado`.

**Alternativas consideradas:** manter o registo público com aprovação (rejeitada: o admin quer partir do email que conhece); aprovar já ao aceitar o convite (rejeitada: o admin pediu o passo de autorização).

**Consequências:** sem SMTP em produção (`MAIL_*`) o email não chega e o admin copia o link. Em dev os emails caem no Mailpit (`docker compose`, http://localhost:8025).

## D10: Permissões por papel definidas pelo admin

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** as capacidades de Funcionário e Estagiário estavam fixas no código (por exemplo, o estagiário não pedia férias). O admin quer ajustar o que cada papel pode fazer, e delegar tarefas de gestão.

**Decisão:** catálogo fixo de 12 permissões (8 do dia a dia, 4 de gestão) guardado como JSON `permissoes` na empresa, por papel, por cima de predefinidos em código (funcionário: dia a dia; estagiário: o mesmo sem férias). O admin tem sempre tudo. Middleware `permissao:<chave>` nas rotas; os pedidos validam-se por tipo em `StorePedidoRequest`. `/me` devolve `permissoes`. Aprovar e recusar contas, limites e definições ficam só do admin. Quem tem `aprovar_pedidos` não decide pedidos seus.

**Alternativas consideradas:** tabela de papéis e permissões (rejeitada: o catálogo é pequeno e fixo, e os papéis são só dois editáveis); manter regras fixas no código (rejeitada: o admin pediu controlo).

**Consequências:** `aprovar_pedidos` alarga a leitura de pedidos e da agenda a todos os da empresa, e dos anexos deles; `ver_presencas_empresa` faz o mesmo com presenças e ocorrências. Sem permissão, a API responde 403 «Sem permissão.» (o pedido de férias do estagiário deixou de ser 422). Chaves novas no catálogo ficam com o predefinido até o admin as editar.
