# PROGRESSO — vatech

> Estado partilhado do projecto. Actualizado pelo JOCA (/start · executar-projeto · /save).
> Contexto pessoal de cada colaborador vive no Brain do proprio JOCA.

## Estado actual
Versão funcional completa para uso interno, só website (D2; o Electron foi removido, #31/#35). Em `main`: login, funcionários (editar/apagar), pedidos com aprovação, agenda da equipa com privacidade para colegas (D7), dashboard para admin e funcionário, filtros e pesquisa global, menu lateral de ícones, paleta Setuptech, Definições editáveis (`PUT /api/me`, palavra-passe atual exigida) e API com opcache. CI (Pint + Pest, web, Vercel) verde. Faltam o deploy em Ploi e a limpeza das issues abertas (#7, #9, #10, #11, #12, #17, #24). `desktop/` ainda existe no disco (não versionado) e só se apaga quando o Electron for fechado.

## Workflows
tipo: [aplicacao]
| # | Workflow | Estado | Começa quando | Entrega | Prova |
|---|---|---|---|---|---|
| 1 | aplicacao (executar-projeto) | ⏳ E4 em curso (v1 funcional em `main`, falta produção) | — | app em produção (API Ploi + website) | E4 |

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
- 2026-11-19 · Windows · fundidos #44 menu lateral, #45 filtros, #47 paleta Setuptech, #48 Definições editáveis (`PUT /api/me`); API reiniciada; worktrees antigos removidos; dev server web reiniciado com cache limpo
- 2026-11-19 · Windows · fundidos #36 (sem Electron), #39 (opcache/workers), #42 (dashboard), #34 (busca sempre visível)
- 2026-11-18 · Windows · agenda, funcionários CRUD, pedidos e aprovação, privacidade D7 (#4 a #32)
- 2026-11-18 · Windows · E1: scaffold commitado e enviado para o GitHub, CI verde, labels criadas, iniciar.bat e docs/API-CONTRATO.md adicionados
- 2026-11-18 · Windows · entrevista /start concluída; PRD, DECISIONS, DESIGN e PROGRESSO criados
