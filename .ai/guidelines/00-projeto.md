# Contexto do projeto

<!--
Ficheiro nosso, vai para o git. O Laravel Boost inclui tudo o que estiver em
`.ai/guidelines/` no CLAUDE.md que gera. Manter curto; detalhe vive em docs/.
-->

## O que é

Aplicação de gestão de férias, ausências e licenças para pequenas empresas (5 a 20 funcionários), em substituição das folhas de Excel. O admin da empresa cria funcionários e aprova ou recusa pedidos; o funcionário pede e acompanha o estado; o super-admin gere as empresas no Filament. Multi-empresa (tenancy) desde o dia 1. Só PT na v1.

Detalhe em `docs/PRD.md`.

## Estrutura

- Raiz: **Laravel 13** (API, Sanctum por tokens) + **Filament v5** (backoffice do super-admin)
- `web/`: **Next.js 16** (frontend da app; projecto Node independente)
- BD: **MySQL 8.4** em dev e produção (phpMyAdmin). Deploy: Ploi (D5)

## Comandos

**Laravel (raiz)**
- Testes: `php artisan test` · um só: `--filter=<nome>`
- Formatação: `./vendor/bin/pint`
- Dev: `composer run dev` (ou `php artisan serve`, porta 8000)

**Next.js (`web/`)**
- Lint: `npm run lint` · Tipos: `npx next typegen && npx tsc --noEmit`
- Dev: `npm run dev` (porta 3000) · Build: `npm run build`

## Ambiente local

| Máquina / SO | Ambiente | BD local | URL de dev |
|---|---|---|---|
| Arthur / Windows 11 | Docker (D3): `mysql:8.4` via `docker-compose.yml` na raiz | MySQL 8.4 (container) | API http://localhost:8000 · web http://localhost:3000 · phpMyAdmin http://localhost:8080 |

- **O motor de BD local é o mesmo da produção.** Divergência só com entrada em `docs/DECISIONS.md`.
- Arranque da BD: `docker compose up -d mysql phpmyadmin`.
- Máquina nova: acrescenta a tua linha, não substituas a de ninguém.
- Sem paths pessoais nem portas de terceiros aqui.

## Documentos de referência

Ler quando o trabalho os tocar:

- `docs/PRD.md` — problema, fronteiras, fluxos, entidades
- `docs/DESIGN.md` — direcção visual (obrigatório antes de mexer em UI)
- `docs/DECISIONS.md` — porquê das decisões (D1 a D5)
- `PROGRESSO.md` — estado do projecto

## Convenções deste projeto

- Um único modelo `Pedido` com tipo (férias | ausência | licença) e subtipo.
- Toda a consulta filtra por empresa (tenancy); testes de isolamento obrigatórios.
- Auth por tokens Sanctum, não cookies de domínio.
- Interface só em PT. **Sem setas na UI** (nem ícones de seta nem chevrons): ligações e acções só com texto.
- Valores legais de licenças nunca pré-definidos: indicam-se no pedido.
- Design: tokens (cores, fontes, raios, espaçamentos) por medir, `TODO: token em falta`; não inventar valores.

## Nunca fazer

- Alterar migrações já aplicadas em produção — criar uma nova
- Introduzir cores, tamanhos ou raios fora do `docs/DESIGN.md`
- Escrever testes na mesma sessão em que se implementou o código
- Commitar diretamente na `main`
