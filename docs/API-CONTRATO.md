# Contrato da API v0.1 (fatia minima)

Fonte unica para backend (Laravel) e frontend (Next.js). Nomes literais: nao mudar sem actualizar este ficheiro.
Base: `/api`. Auth: Sanctum, token Bearer. Respostas JSON. Erros de validacao: 422 `{message, errors}`. Sem token: 401. Papel errado: 403.

## Modelos
- `empresas`: id, nome
- `users`: id, empresa_id, nome, email (unico), password, papel (`admin` | `funcionario`)
- `pedidos`: id, empresa_id, user_id, tipo (`ferias` | `ausencia` | `licenca`), subtipo (nullable; ausencia: `medica` | `documentacao` | `falta_justificada`), data_inicio, data_fim (date, `data_fim >= data_inicio`), observacao (nullable), estado (`pendente` | `aprovado` | `recusado`, default `pendente`), decidido_por (nullable), decidido_em (nullable), motivo_recusa (nullable)
- Tudo filtrado pela `empresa_id` do utilizador autenticado (multi-empresa). Nunca devolver dados de outra empresa.

## Endpoints
| Metodo e rota | Papel | Corpo | Resposta |
|---|---|---|---|
| POST `/api/login` | publico | `{email, password}` | 200 `{token, user}` |
| POST `/api/logout` | autenticado | - | 204 |
| GET `/api/me` | autenticado | - | 200 `{user}` |
| GET `/api/funcionarios` | admin | - | 200 `{data: [user]}` |
| POST `/api/funcionarios` | admin | `{nome, email, password}` (papel=funcionario, empresa do admin) | 201 `{data: user}` |
| PUT `/api/funcionarios/{id}` | admin | `{nome, email, password?}` (email unico ignorando o proprio; password so muda se enviada) | 200 `{data: user}`; 422 validacao; 404 se nao existir, for de outra empresa ou nao for funcionario |
| DELETE `/api/funcionarios/{id}` | admin | - | 204 (soft delete, tokens revogados); 404 nos mesmos casos do PUT |
| GET `/api/pedidos` | autenticado | query `?estado=` opcional | 200 `{data: [pedido]}`; admin ve todos da empresa (com `user: {id, nome}`), funcionario so os seus; pedidos de funcionarios apagados ficam ocultos |
| GET `/api/agenda` | autenticado | query `?de=AAAA-MM-DD&ate=AAAA-MM-DD` obrigatorios (`ate >= de`) | 200 `{data: [...]}` dos pedidos da empresa pendentes/aprovados que intersectam o intervalo (`data_inicio <= ate` e `data_fim >= de`, limites inclusivos); admin: pedidos completos com `user: {id, nome}`; funcionario: os seus completos + aprovados dos colegas so com `{id, user: {id, nome}, tipo, data_inicio, data_fim, estado}`; exclui recusados, apagados e outras empresas; 422 se parametros invalidos |
| POST `/api/pedidos` | funcionario | `{tipo, subtipo?, data_inicio, data_fim, observacao?}` | 201 `{data: pedido}` (estado pendente) |
| POST `/api/pedidos/{id}/aprovar` | admin | - | 200 `{data: pedido}`; so se pendente, senao 409 |
| POST `/api/pedidos/{id}/recusar` | admin | `{motivo_recusa}` obrigatorio | 200 `{data: pedido}`; so se pendente, senao 409 |

`user` = `{id, nome, email, papel, empresa_id}`. Sobreposicao de datas do mesmo utilizador: aviso (campo `avisos: ["..."]` na resposta do POST), nunca bloqueio.

## Seed de desenvolvimento
Uma empresa "Empresa Demo", admin `admin@vatech.test`, funcionario `funcionario@vatech.test`; password de dev `password` (so local, nunca em producao).

## Frontend
Next.js `web/`, variavel `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api`). Ecras (PT): `/login`, `/` (funcionario: os meus pedidos + novo pedido; admin: pedidos pendentes + aprovar/recusar), `/funcionarios` (admin: lista + criar). Token em memoria + localStorage. Sem setas na UI; sem cores/fontes inventadas (`TODO: token em falta`, Tailwind neutro).
