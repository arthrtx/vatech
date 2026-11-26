# PROGRESSO — vatech

> Estado partilhado do projecto. Actualizado pelo JOCA (/start · executar-projeto · /save).
> Contexto pessoal de cada colaborador vive no Brain do proprio JOCA.

## Estado actual
Versão funcional completa para uso interno, só website (D2; o Electron foi removido, #31/#35). Em `main`: login, contas por convite do admin com aprovação (#101, D9; substitui o cadastro próprio do #89), funcionários só de leitura para o admin (cada pessoa gere a sua conta), erros da API em português (#87), pedidos com aprovação, agenda da equipa com privacidade para colegas (D7), dashboard para admin e funcionário, filtros e pesquisa global, menu lateral de ícones, paleta Setuptech, Definições editáveis (`PUT /api/me`, palavra-passe atual exigida) e API com opcache. CI (Pint + Pest, web) verde; o check Vercel falha por limite de deploys. Produção grátis no ar (D8): site em https://vatech-eight.vercel.app, API em https://vatech-api.onrender.com, base de dados no TiDB Cloud Starter (passos em `docs/DEPLOY.md`). Depois: data de nascimento e aniversários na agenda, anexos com pré-visualização (#77), pedido urgente, limites de dias por tipo e cúmulo de férias/ausências/licenças (#80, #83), pontes da empresa, ecrãs sem altura fixa em janelas baixas. Limpeza das issues abertas fundida nos PRs #84 e #86 (#7, #9, #10, #11, #17, #24); #12 confirmada em produção (APP_DEBUG desligado, sem trace nas respostas de erro) e #85 fechada como não reproduzível. Sem issues abertas. Falta configurar o SMTP em produção (`MAIL_*`; sem ele os convites não chegam por email e o admin copia o link), testar o link assinado atrás do proxy do Render, rever os termos genéricos (`TODO: contacto em falta`), guardar as fotos de perfil fora do disco do Render e o Vercel, que falha por limite diário de deploys (Ignored Build Step por configurar no painel).

## Workflows
tipo: [aplicacao]
| # | Workflow | Estado | Começa quando | Entrega | Prova |
|---|---|---|---|---|---|
| 1 | aplicacao (executar-projeto) | ⏳ E4 em curso (v1 em produção grátis, D8) | — | app em produção (API Ploi + website) | E4 |

## Fases
| Fase | Estado | Prova |
|---|---|---|
| S1 Produto (PRD inicial)        | ✅ 2026-11-18 | docs/PRD.md (8 pontos em "Fora de âmbito") |
| S2 Fluxos e capacidades         | ✅ 2026-11-18 | PRD §Fluxos (6) · §Ecrãs · §Entidades |
| S3 Stack + ambiente local       | ✅ 2026-11-18 | PRD §Stack (tabela Ambiente local) + docs/DECISIONS.md D1-D4 |
| S4 Infraestrutura               | ✅ 2026-11-18 | repo arthrtx/vatech (privado, criado 2026-11-18) · deploy: Ploi (D5) |
| S5 Direccao de design           | ✅ 2026-11-18 | docs/DESIGN.md (referência HUROH; tokens por medir) |
| E1 Fundacao (scaffold+CI+hooks) | ✅ 2026-11-18 | scaffold, CI verde, hooks (#5) e PRs a fundir com CI verde |
| E2 Design (via: directo)        | ✅ 2026-11-19 | redesenho (#44), paleta Setuptech (#47), filtros (#45), dashboard (#42) |
| E3 Ponto de situacao            | ⬜ | não feito formalmente |
| E4 Desenvolvimento (ondas)      | ⏳ | PRs #4 a #48 fundidos; abertas #7, #9, #10, #11, #12, #17, #24 |
| Producao                        | ⬜ | — |

## Ondas (preenchido na E4)
| Onda | Issues | Estado | Portao |
|---|---|---|---|

## Diario (mais recente primeiro)
- 2026-11-25 · Windows · PR #90 fundido (#89): cadastro próprio (/registo, /termos genéricos a rever), verificação de email por link assinado, login bloqueado sem verificar, admin sem criar/editar/apagar funcionários (lista só de leitura); produção sem SMTP (contas novas não recebem o link)
- 2026-11-25 · Windows · PR #88 fundido (#87): erros 401/403/404/405/429 da API em português
- 2026-11-19 · Windows · PR #86 fundido (#11); #85 fechada (não reproduz); #12 fechada com teste em produção; web/vercel.json não travou os builds fora da main
- 2026-11-19 · Windows · PR #84 fundido (5 issues fechadas); Vercel só constrói a main (web/vercel.json) por causa do limite de deploys
- 2026-11-19 · Windows · retoma via /start: PROGRESSO sincronizado com o git (main em 70a444b, até #83); 7 issues abertas, nenhum PR aberto
- 2026-11-19 · Windows · fundidos #44 menu lateral, #45 filtros, #47 paleta Setuptech, #48 Definições editáveis (`PUT /api/me`); API reiniciada; worktrees antigos removidos; dev server web reiniciado com cache limpo
- 2026-11-19 · Windows · fundidos #36 (sem Electron), #39 (opcache/workers), #42 (dashboard), #34 (busca sempre visível)
- 2026-11-18 · Windows · agenda, funcionários CRUD, pedidos e aprovação, privacidade D7 (#4 a #32)
- 2026-11-18 · Windows · E1: scaffold commitado e enviado para o GitHub, CI verde, labels criadas, iniciar.bat e docs/API-CONTRATO.md adicionados
- 2026-11-18 · Windows · entrevista /start concluída; PRD, DECISIONS, DESIGN e PROGRESSO criados
