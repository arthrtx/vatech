# PRD — vatech

**Versão:** 0.1
**Estado:** Rascunho (saída do /start; stack e design por fechar)
**Actualizado:** 2026-11-18
**North Star Metric:** `<pendente: o dono não definiu>`

---

## 1. Visão geral

### Problema
Pequenas empresas gerem hoje as férias, licenças e ausências dos funcionários em folhas de Excel. O processo é confuso, sem estado de aprovação claro nem histórico de comprovativos. [fonte: operador (entrevista /start), 2026-11-18]

### Solução
Aplicação web onde o admin da empresa cria os funcionários, os funcionários pedem férias, licenças e ausências, e o admin aprova ou recusa. Mais intuitiva do que o Excel que substitui.

### Como é resolvido hoje
Excel / folha de cálculo.

### Fora de âmbito (v1)
- Processamento salarial e facturação
- Controlo de assiduidade / picagem de ponto
- App móvel nativa (só web responsiva; o produto é só website, D2)
- Gestão de turnos e escalas
- Integração com a Segurança Social e com o Portal das Finanças
- Aprovação em várias etapas (só o admin aprova)
- Sistema de RH completo (recrutamento, avaliações, contratos)
- Multi-idioma (só PT na v1)

### Distribuição
**Privada** (só o dono e clientes directos). Sem restrições de licença de assets para já.

---

## 2. Utilizadores

| Persona | Descrição | Dor principal |
|---|---|---|
| Admin da empresa | Dono de uma pequena empresa (5 a 20 funcionários) | Aprovar e acompanhar férias e ausências sem Excel |
| Funcionário | Trabalhador da empresa | Marcar férias e ausências e saber o estado do pedido |
| Super-admin | Dono do produto (Arthur) | Criar e gerir as empresas clientes sem mexer na BD |

Arranque para pequenas empresas; crescimento futuro para empresas grandes (papéis intermédios — chefe de equipa, RH — ficam para depois).

---

## 3. Capacidades transversais

- **Login por convite** (email e password): o admin cria o funcionário, que define a password.
- **Multi-empresa desde o dia 1** (multi-tenancy): empresas isoladas entre si.
- **Notificações por email** (pedido, aprovação, recusa).
- **Uploads** de comprovativos (PDF e imagem).
- **Backoffice** do super-admin em Filament.
- Fora: multi-idioma, pagamentos, offline.

---

## 4. Primeira versão utilizável (corte completo)

Férias, ausências e faltas justificadas com comprovativo, licenças, calendário da equipa e notificações por email. Âmbito grande: a execução divide-o em ondas.

---

## 5. Fluxos

### F1. Admin cria funcionários
- Quem: admin. Passos: cria o funcionário (nome, email, dias de férias do ano) → o funcionário recebe convite → define a password.
- Erros: email repetido, convite expirado.

### F2. Funcionário marca férias
- Passos: abre o calendário → escolhe datas → vê o saldo → envia o pedido → fica `pendente`.
- Erros: pedir mais dias que o saldo, datas sobrepostas com outro pedido do próprio.
- Muita gente fora ao mesmo tempo: **aviso** ao admin na aprovação, sem bloquear.

### F3. Admin aprova ou recusa
- Passos: recebe notificação → vê o pedido e o calendário da equipa → aprova ou recusa (com motivo) → o funcionário é notificado.
- Erros: recusa sem motivo, aprovação de pedido já ultrapassado.

### F4. Ausências e faltas justificadas
- Passos: o funcionário (ou o admin) regista a ausência → anexa o comprovativo → o admin valida ou rejeita.
- Tipos (lista fixa): doença/consulta médica · assistência a familiar · assuntos oficiais/documentos · outra.
- Erros: comprovativo em falta.

### F5. Licenças
- Passos: como as férias, mas por tipo, com duração e documento.
- Tipos (lista fixa): parentalidade · casamento · luto · outra.
- Os dias de cada licença são indicados no pedido; **nenhum valor legal vem pré-definido** (não se inventam números da lei).

### F6. Calendário da equipa
- Vista mensal com todos, filtro por tipo (férias, ausência, licença).

---

## 6. Ecrãs

**App (admin e funcionário):** 1 Login e definir password · 2 Início (saldo, próximos pedidos) · 3 Calendário (pessoal e equipa) · 4 Novo pedido · 5 Os meus pedidos · 6 Detalhe do pedido com comprovativo · 7 *Admin:* pedidos pendentes · 8 *Admin:* funcionários · 9 Notificações.
**Super-admin (Filament):** empresas, utilizadores, visão geral.

---

## 7. Entidades

- **Empresa**: nome, dados básicos.
- **Utilizador**: nome, email, papel (admin | funcionário), empresa, dias de férias do ano.
- **Pedido** (único modelo): tipo (férias | ausência | licença), subtipo, data início, data fim, estado (pendente | aprovado | recusado), motivo de recusa, quem decidiu.
- **Anexo**: ficheiro, pedido.
- **Notificação**: destinatário, texto, lida.

Decisão: um único modelo `Pedido` com tipo, em vez de três tabelas (mesmo ciclo pedir/aprovar/anexar; calendário e notificações uma vez só).

---

## 8. Stack

| Camada | Escolha |
|---|---|
| Frontend | Next.js 16 |
| Backend | Laravel 13 (API) |
| Base de dados | MySQL 8.4 (phpMyAdmin), multi-empresa |
| Backoffice | Filament v5 (super-admin) |
| Auth | Laravel Sanctum (tokens) |
| Deploy | Ploi (D5); repo privado `arthrtx/vatech` |

**Ambiente local**

| Máquina | SO | Ambiente | BD local |
|---|---|---|---|
| Arthur (principal) | Windows 11 | Docker / Sail (D3) | MySQL 8.4 |

Razões das escolhas: `docs/DECISIONS.md` (D1 a D5).

## 9. Design

Direcção registada em `docs/DESIGN.md` (referência: capturas do projecto HUROH; tokens por medir na execução). Sem setas na interface.

---

## 10. Perguntas em aberto

| # | Pergunta | Dono | Prazo | Estado |
|---|---|---|---|---|
| Q1 | North Star Metric | Arthur | TBD | Aberta |
| Q2 | Onde corre a API (servidor, IP ou domínio) para o website alojado | Arthur | Fase 4 | Aberta (ver D5) |

---

## 11. Histórico

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 2026-11-18 | ADDED: rascunho da entrevista /start (produto, fluxos, capacidades, ecrãs, entidades) |
