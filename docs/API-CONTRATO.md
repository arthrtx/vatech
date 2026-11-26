# Contrato da API v0.1 (fatia minima)

Fonte unica para backend (Laravel) e frontend (Next.js). Nomes literais: nao mudar sem actualizar este ficheiro.
Base: `/api`. Auth: Sanctum, token Bearer. Respostas JSON. Erros de validacao: 422 `{message, errors}`. Sem token: 401. Papel errado: 403.

## Modelos
- `empresas`: id, nome
- `users`: id, empresa_id, nome, email (unico), email_verified_at (nullable), termos_aceites_em (nullable), password, papel (`admin` | `funcionario` | `estagiario`)
- `pedidos`: id, empresa_id, user_id, tipo (`ferias` | `ausencia` | `licenca`), subtipo (nullable; ausencia: `medica` | `documentacao` | `falta_justificada`), data_inicio, data_fim (date, `data_fim >= data_inicio`), observacao (nullable), estado (`pendente` | `aprovado` | `recusado`, default `pendente`), decidido_por (nullable), decidido_em (nullable), motivo_recusa (nullable)
- Tudo filtrado pela `empresa_id` do utilizador autenticado (multi-empresa). Nunca devolver dados de outra empresa.

## Endpoints
| Metodo e rota | Papel | Corpo | Resposta |
|---|---|---|---|
| POST `/api/login` | publico | `{email, password}` | 200 `{token, user}`; 422 em `email` se a conta tem o email por confirmar (sem token); 403 `{message}` se a conta esta pendente ou recusada |
| GET `/api/convites/{token}` | publico, throttle 30/min | - | 200 `{data:{nome,email,texto}}`; 404 se o convite for invalido, expirado ou ja usado |
| POST `/api/convites/{token}/aceitar` | publico, throttle 10/min | `{password, password_confirmation, aceita_termos: true}` | 201 `{message}`; cria a conta em estado `pendente` (sem token); o convite fica usado |
| POST `/api/email/reenviar` | publico, throttle 5/min | `{email}` | 200 `{message}` sempre igual, exista ou nao a conta |
| GET `/api/email/verificar/{id}/{hash}` | link assinado (email) | - | 302 para `FRONTEND_URL/login?verificado=1`; link invalido ou expirado: 302 para `FRONTEND_URL/login?verificado=0` |
| POST `/api/logout` | autenticado | - | 204 |
| GET `/api/me` | autenticado | - | 200 `{user}` |
| GET `/api/funcionarios` | admin | - | 200 `{data: [user]}`. Lista so de leitura: as contas nascem de convites do admin (ver abaixo); POST/PUT/DELETE `/api/funcionarios` nao existem |
| POST/GET `/api/funcionarios/convites`, POST `.../{id}/reenviar`, DELETE `.../{id}` | admin | `{nome, email, papel: funcionario\|estagiario}` | convite `{id,nome,email,papel,expira_em,link}` (7 dias; `link` tambem mostrado ao admin enquanto nao houver SMTP) |
| POST `/api/funcionarios/{id}/aprovar` e `/recusar` | admin | - | 200 `{data: user}` com `estado_conta` `aprovado`\|`recusado`; recusar revoga os tokens; 422 se o admin recusa a propria conta |
| GET/PUT `/api/definicoes/convite` | admin | `{texto: string\|null}` (max 1000; vazio repoe o predefinido) | 200 `{data:{texto,predefinido}}` |
| GET `/api/pedidos` | autenticado | query `?estado=` opcional | 200 `{data: [pedido]}`; admin ve todos da empresa (com `user: {id, nome}`), funcionario so os seus; pedidos de funcionarios apagados ficam ocultos |
| GET `/api/agenda` | autenticado | query `?de=AAAA-MM-DD&ate=AAAA-MM-DD` obrigatorios (`ate >= de`) | 200 `{data: [...]}` dos pedidos da empresa pendentes/aprovados que intersectam o intervalo (`data_inicio <= ate` e `data_fim >= de`, limites inclusivos); admin: pedidos completos com `user: {id, nome}`; funcionario: os seus completos + aprovados dos colegas so com `{id, user: {id, nome}, tipo, data_inicio, data_fim, estado}`; exclui recusados, apagados e outras empresas; 422 se parametros invalidos |
| GET `/api/compromissos` | autenticado | query `?de=AAAA-MM-DD&ate=AAAA-MM-DD` obrigatorios | 200 `{data: [{id, data, hora_inicio, hora_fim, titulo, tipo, descricao}]}` so dos compromissos de quem pede (agenda pessoal, privada), por dia e hora |
| POST `/api/compromissos` | autenticado | `{data, hora_inicio?, hora_fim?, titulo, tipo (reuniao, chamada, lembrete ou outro), descricao?}`; `data` >= hoje (Lisboa); `hora_fim` obrigatoria com `hora_inicio` e depois dela | 201 `{data: compromisso}`; 422 validacao |
| DELETE `/api/compromissos/{id}` | autenticado | - | 204; 404 se for de outra pessoa |
| POST `/api/pedidos` | funcionario | `{tipo, subtipo?, data_inicio, data_fim, observacao?}` | 201 `{data: pedido}` (estado pendente) |
| POST `/api/pedidos/{id}/aprovar` | admin | - | 200 `{data: pedido}`; so se pendente, senao 409; 404 se for de outra empresa ou de funcionario apagado |
| POST `/api/pedidos/{id}/recusar` | admin | `{motivo_recusa}` obrigatorio | 200 `{data: pedido}`; so se pendente, senao 409; 404 se for de outra empresa ou de funcionario apagado |

`user` = `{id, nome, email, papel, empresa_id}`. Sobreposicao de datas do mesmo utilizador: aviso (campo `avisos: ["..."]` na resposta do POST), nunca bloqueio.

## Seed de desenvolvimento
Uma empresa "Empresa Demo", admin `admin@vatech.test`, funcionario `funcionario@vatech.test`; password de dev `password` (so local, nunca em producao).

## Frontend
Next.js `web/`, variavel `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api`). Ecras (PT): `/login`, `/` (funcionario: os meus pedidos + novo pedido; admin: pedidos pendentes + aprovar/recusar), `/convite/[token]` (formulario do convidado), `/funcionarios` (admin: lista, convites, contas por autorizar). Token em memoria + localStorage. Sem setas na UI; sem cores/fontes inventadas (`TODO: token em falta`, Tailwind neutro).
