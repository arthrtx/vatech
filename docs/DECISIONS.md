# DECISIONS — vatech

## D1: Stack: Next.js + Laravel + MySQL

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur

**Contexto:** aplicação web de gestão de férias, ausências e licenças para pequenas empresas, com crescimento futuro. O dono exigiu Next.js, Laravel e MySQL e delegou o resto.

**Decisão:** frontend **Next.js 16**, backend **Laravel 13** (API), base de dados **MySQL 8.4** (phpMyAdmin), backoffice **Filament v5**, auth **Laravel Sanctum** (tokens).

**Alternativas consideradas:**
- Livewire 4 + Flux — prós: uma só base de código, stack da casa para apps — rejeitada porque o dono exigiu Next.js.
- PostgreSQL 17 — rejeitada: o dono exigiu MySQL e a produção no Ploi corre MySQL.

**Consequências:** front e back separados (dois deploys, CORS/tokens a tratar); Filament serve só o super-admin. Risco: PHP local 8.2.12 pode não cumprir o requisito do Laravel 13, mitigado com Docker/Sail (D3).

## D2: Electron para empacotar a app (fora da stack da casa)

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur

**Contexto:** o dono quer uma aplicação instalável, sem depender de um domínio para a abrir.

**Decisão:** o **Electron** embrulha o frontend Next.js numa janela desktop. A lógica fica no Laravel; o Electron só carrega a interface e fala com a API. Razão para sair da stack da casa: app instalável sem domínio.

**Alternativas consideradas:**
- Só web em browser — rejeitada porque o dono quer app sem domínio.
- Tauri — mais leve, mas o dono pediu Electron.

**Consequências:** o Electron **não elimina o servidor**: precisa de uma API alojada com endereço fixo (IP ou domínio). Auth por tokens, não cookies de domínio. Distribuição e actualizações do instalador a tratar na execução. Fica aberto como Q2 do PRD onde corre a API.

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

**Data:** 2026-11-18 · **Estado:** aceite · **Decidido por:** Arthur

**Contexto:** distribuição privada; a API tem de estar num servidor acessível ao Electron.

**Decisão:** deploy no **Ploi** (skill `deploy-ploi`); repo privado `arthrtx/vatech`. Nada se configura no /start: a execução fecha o deploy ⛔.

**Alternativas consideradas:** VPS com Docker, cPanel — rejeitadas: Ploi dá Laravel + MySQL geridos.

**Consequências:** custo do servidor Ploi; domínio/IP a decidir (PRD Q2).
