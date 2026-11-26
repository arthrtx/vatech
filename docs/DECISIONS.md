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

## D11: Tipos personalizados de pessoa

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** só havia Funcionário e Estagiário; o admin quer perfis como «Responsável de RH» com permissões próprias.

**Decisão:** tabela `tipos` por empresa (nome único sem distinguir maiusculas, `base` funcionario|estagiario fixa, `permissoes` JSON por cima dos predefinidos da base). `users.tipo_id` e `convites.tipo_id` nullable (restrict, nunca apagam pessoas). `users.papel` continua a ser o papel-base, por isso nenhuma regra que testa o papel muda. Pessoa com tipo usa as permissões do tipo; sem tipo, as do papel (D10). Apagar um tipo em uso: 409. O tipo muda por `PUT /funcionarios/{id}/tipo`, que também permite mudar o papel de quem fica sem tipo.

**Alternativas consideradas:** tipos que substituem o papel (rejeitada: reescrevia as regras de estágio e férias); permissões em tabela pivô (rejeitada: catálogo fixo de 12).

**Consequências:** mudar a base exige criar outro tipo. Admin não tem tipo.

## D12: Férias fixas em 22 dias, máximo 25, sem limites configuráveis

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** o admin definia limites de dias por tipo de pedido (`PUT /limites`). Na prática só interessam as férias, e o direito é sempre o mesmo.

**Decisão:** férias fixas em 22 dias úteis por ano (`LimitesPedidoService::FERIAS_DIAS_POR_ANO`), com um máximo pedível de 25 (`FERIAS_DIAS_MAXIMO`). Os dias acima de 22 são excedente: cada pedido traz `dias_excedentes` para o admin ver ao aprovar. Pedir mais de 25 no ano dá 422. Ausência e licença ficam sem limite. Os transitados continuam calculados sobre 22 e não alargam o máximo. Removido `PUT /limites`; `GET /limites` mantém-se com `dias_max`.

**Alternativas consideradas:** manter os limites configuráveis (rejeitada: o admin pediu para sair); bloquear em 22 (rejeitada: a empresa aceita até 25 com aprovação).

**Consequências:** a tabela `limites_pedido` e o modelo `LimitePedido` ficam órfãos: já ninguém os lê nem escreve, e as linhas existentes são ignoradas. Não se apaga a tabela agora (migration destrutiva); pode sair numa limpeza futura. `dias_excedentes` custa uma query por pedido de férias serializado.

## D13: Fichas de RH por pessoa

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** o RH precisa de uma ficha por pessoa da empresa, com informações livres e documentos anexados.

**Decisão:** nova permissão `gerir_rh` (grupo gestão; só por tipo ou admin, fora das predefinições de funcionário e estagiário). Tabelas `rh_infos` (título + valor livres) e `rh_ficheiros` (metadados), ambas por empresa e pessoa, com FK em cascade. Os ficheiros ficam no disco privado `local` em `rh/{empresa_id}/{user_id}/` com nome gerado; o nome original (sanitizado), o mime e o tamanho ficam na BD. Tipos aceites: pdf, png, jpg, jpeg, docx, xlsx, txt, até 10 MB, validados por extensão e por conteúdo. A descarga é por rota autenticada e o `caminho` nunca sai na API. Tudo escopado pela empresa de quem pede (outra empresa: 404).

**Alternativas consideradas:** guardar os bytes na BD como nos anexos dos pedidos (rejeitada: 10 MB por ficheiro pesa demais); disco `public` (rejeitada: documentos pessoais).

**Consequências:** o catálogo passa a 13 permissões (o admin tem as 13). Apagar uma pessoa por hard delete apaga as linhas mas não os ficheiros em disco; hoje as contas só se apagam por soft delete.

## D14: Pedidos em nome de outras pessoas

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** a chefia precisa de marcar férias, ausências ou licenças por alguém que não as marcou (telefone, papel).

**Decisão:** nova permissão `pedir_por_outros` (grupo gestão; só por tipo ou admin, fora das predefinições). `POST /pedidos` aceita `user_id`: o pedido é da pessoa-alvo (mesma empresa, conta aprovada, não apagada; senão 404), fica sempre `pendente` e guarda `pedidos.criado_por` (FK a users, nullOnDelete; pedidos antigos null). Limites, sobreposições e anexos contam na pessoa-alvo; o tipo de pedido exige a permissão `pedir_*` do autor. O JSON traz `criado_por: {id, nome}` só quando o autor não é o dono. `GET /pedidos/pessoas` lista as pessoas elegíveis. Quem aprova continua a não decidir um pedido seu; o autor pode decidir o que criou por outro se tiver `aprovar_pedidos`. O autor edita e apaga esses pedidos enquanto pendentes.

**Alternativas consideradas:** aprovar logo o que o admin cria por outros (rejeitada: a pessoa não o confirmou); mudar o dono no PUT (rejeitada: o dono é fixo).

**Consequências:** o catálogo passa a 14 permissões (o admin tem as 14). Quem tem `pedir_por_outros` sem `aprovar_pedidos` passa a ver em GET `/pedidos` o que criou por outros (necessário para editar/cancelar). O autor com `aprovar_pedidos` pode aprovar o que ele próprio marcou por outra pessoa; é aceite porque o pedido não é dele. Anexos de um pedido por outro continuam só do dono.


## D15: Horário de funcionamento da empresa, personalizável por pessoa

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** cada pessoa definia o seu almoço (`PUT /me/almoco`, `users.almoco_inicio/fim`), o que dava horas inconsistentes entre colegas. O utilizador quer um horário definido pelo admin: 08:00 às 17:00 com 1 hora de almoço às 12:00, ajustável por funcionário.

**Decisão:** `empresas.horario_entrada`, `horario_saida`, `almoco_inicio` e `almoco_minutos` (predefinidos 08:00, 17:00, 12:00 e 60, hora de Lisboa). `users.horario_entrada`, `horario_saida`, `horario_almoco_inicio` e `almoco_minutos` são nullable: null segue a empresa, campo a campo (horário efectivo = o da pessoa ou o da empresa). Rotas: `GET /horario`, `PUT /definicoes/horario`, `GET /definicoes/horarios`, `PUT /definicoes/horarios/{user}` (admin nas três últimas). Validação: saída depois da entrada (sobre o efectivo), `almoco_min` 0-240, almoço até às 23:59; o almoço não tem de caber na jornada. `Presenca::minutosDeAlmoco()` é a sobreposição entre [entrada, saída] da presença e [almoco_inicio, almoco_inicio + almoco_min] do horário efectivo da pessoa; sem saída é 0. As listagens carregam o utilizador e a empresa por eager load: o nº de queries não depende do nº de presenças.

**`atrasada` não é derivada do horário:** `presencas.atrasada` continua a significar presença registada a posteriori, marcada à mão; entrar depois da hora do horário não a liga.

**Alternativas consideradas:** só duração do almoço, descontada quando a presença cobre metade da jornada (rejeitada: o utilizador quer a hora do almoço); reaproveitar `users.almoco_inicio` (rejeitada: os valores antigos passariam a valer como horário próprio); um horário por dia da semana (rejeitada: sem necessidade).

**Consequências:** `PUT /me/almoco` removido e `almoco_inicio/almoco_fim` saem do contrato de `User`. As colunas `users.almoco_inicio/almoco_fim` ficam órfãs: já ninguém as lê nem escreve, e os valores existentes são ignorados. Não se apagam agora (migration destrutiva); podem sair numa limpeza futura, como a tabela `limites_pedido` (D12). Quem tinha almoço próprio passa a seguir o da empresa até o admin o personalizar.


## D16: Vários períodos de presença por dia

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** a presença era uma linha por pessoa e dia (`unique(user_id, data)`), por isso quem saía ao almoço e voltava não podia registar a tarde.

**Decisão:** cada linha de `presencas` passa a ser um período (entrada, saída); uma pessoa pode ter vários por dia. A migration larga a unique e cria o índice `(user_id, data)` antes (em MySQL a unique serve a FK de `user_id`; largá-la sozinha dá ERROR 1553). `down()` só repõe a unique se não houver dias com mais de um período; senão falha com mensagem clara em vez de apagar dados. `POST /presencas/entrada`: 422 "Já tem uma entrada aberta. Marque primeiro a saída." se o dia tem um período sem saída; senão cria um novo. `POST /presencas/saida`: fecha o período aberto do dia, 422 "Marque primeiro a entrada." se não houver. `GET /presencas/hoje` devolve o último período do dia (aberto ou fechado) ou null. Entrada e saída correm numa transacção com `lockForUpdate` na linha da pessoa, para dois cliques em simultâneo não criarem dois períodos abertos (em SQLite o lock não actua; os testes provam a regra, não a concorrência real). `POST /presencas/atrasada` deixa de recusar "já existe presença nesse dia": recusa só um intervalo que se sobreponha a outro período da mesma pessoa nesse dia (422 em `entrada`); intervalos que apenas se tocam são válidos. `GET /presencas` ordena por data, entrada e id (decrescente).

**Turno a atravessar a meia-noite (revisto):** `saida` fecha o período aberto mais recente da pessoa, de qualquer dia; `entrada` recusa se houver qualquer período aberto (não só de hoje); `GET /presencas/hoje` devolve o aberto de um dia anterior, se existir. A duração usa os instantes; o almoço só conta no dia (`data`) do período.

**Almoço por período:** continua a ser a sobreposição entre o período e o almoço do horário efectivo (D15), calculada período a período; o forma JSON de `Presenca` não muda.

**Alternativas consideradas:** várias saídas/entradas numa só linha (rejeitada: não cabe em duas colunas); tabela filha de intervalos (rejeitada: complexidade sem ganho, a linha já é o intervalo).

**Consequências:** o que lia "a presença do dia" passa a ler "o último período". Um dia pode ter vários registos; somas de horas têm de somar períodos.


## D17: Feriados nacionais vêm da Nager.Date, com cache e fallback local

**Data:** 2026-11-26 · **Estado:** aceite · **Decidido por:** Arthur · **Proposto:** Claude

**Contexto:** a contagem de dias úteis (`LimiteFerias`) calculava os feriados à mão (Páscoa + datas fixas). O utilizador quer que venham de uma API pública gratuita, para não depender de manutenção em anos futuros.

**Decisão:** `FeriadosService::nacionais($ano)` lê `GET https://date.nager.at/api/v3/PublicHolidays/{ano}/PT` (sem chave; timeout 5 s, 2 tentativas) e só conta entradas com `global === true` e `'Public'` em `types` (ficam de fora Carnaval, "Optional", e os feriados regionais/municipais). Cache por ano 30 dias (`Cache::put`), só de respostas válidas e não vazias. Se a API falhar, der timeout ou devolver algo inválido, regista `Log::warning` e `LimiteFerias::feriadosNacionais` recorre ao cálculo local, mantido em `feriadosCalculados`: nunca lança excepção nem conta 0 feriados. Os testes usam `Http::preventStrayRequests()` (em `TestCase`), sem rede real: sem fake, caem no cálculo local.

**Cache negativa e validação (revisto):** falha da API cacheada 5 min por ano (vai direto ao cálculo local sem rede); só se cacheia 30 dias uma resposta com ≥8 datas do ano pedido em Y-m-d.

**Alternativas consideradas:** manter só o cálculo local (rejeitada: manutenção manual quando a lei muda); depender só da API sem fallback (rejeitada: uma falha de rede alterava os limites de férias).

**Consequências:** primeira contagem de cada ano pode fazer 1 pedido HTTP (até ~10 s no pior caso); depois vem da cache. O front-end continua com o seu próprio cálculo e pode divergir se a API mudar uma data.
