# PROGRESSO — vatech

> Estado partilhado do projecto. Actualizado pelo JOCA (/start · executar-projeto · /save).
> Contexto pessoal de cada colaborador vive no Brain do proprio JOCA.

## Estado actual
Entrevista do /start feita (produto, fluxos, stack, infra, direcção de design). Repo privado `arthrtx/vatech` com scaffold (Laravel 13 na raiz, Next.js 16 em `web/`), testes de fumo (Pest, Vitest) e CI verde na `main`. `iniciar.bat` na raiz faz pull da última versão, sobe API, BD e web e abre http://localhost:3000. Electron removido: o produto é só website (#31, D8). Próximo passo: PR de teste, issues da v0.1 e primeira versão básica (login, funcionários, pedidos, aprovação) conforme `docs/API-CONTRATO.md`.

## Workflows
tipo: [aplicacao]
| # | Workflow | Estado | Começa quando | Entrega | Prova |
|---|---|---|---|---|---|
| 1 | aplicacao (executar-projeto) | ⏳ E1 quase fechada (falta PR de teste) | — | app em produção (API Ploi + website) | E4 |

## Fases
| Fase | Estado | Prova |
|---|---|---|
| S1 Produto (PRD inicial)        | ✅ 2026-11-18 | docs/PRD.md (8 pontos em "Fora de âmbito") |
| S2 Fluxos e capacidades         | ✅ 2026-11-18 | PRD §Fluxos (6) · §Ecrãs · §Entidades |
| S3 Stack + ambiente local       | ✅ 2026-11-18 | PRD §Stack (tabela Ambiente local) + docs/DECISIONS.md D1-D4 |
| S4 Infraestrutura               | ✅ 2026-11-18 | repo arthrtx/vatech (privado, criado 2026-11-18) · deploy: Ploi (D5) |
| S5 Direccao de design           | ✅ 2026-11-18 | docs/DESIGN.md (referência HUROH; tokens por medir) |
| E1 Fundacao (scaffold+CI+hooks) | ⏳ | commit 8b86dd4 na main; CI Laravel e Next.js verdes; falta PR de teste, hooks e ruleset |
| E2 Design (via: directo)        | ⬜ | — |
| E3 Ponto de situacao            | ⬜ | — |
| E4 Desenvolvimento (ondas)      | ⬜ | — |
| Producao                        | ⬜ | — |

## Ondas (preenchido na E4)
| Onda | Issues | Estado | Portao |
|---|---|---|---|

## Diario (mais recente primeiro)
- 2026-11-18 · Windows · E1: scaffold commitado e enviado para o GitHub, CI verde, labels criadas, iniciar.bat e docs/API-CONTRATO.md adicionados
- 2026-11-18 · Windows · entrevista /start concluída; PRD, DECISIONS, DESIGN e PROGRESSO criados
