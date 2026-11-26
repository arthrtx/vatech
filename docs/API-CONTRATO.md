# Contrato da API v0.1 (fatia minima)

Fonte unica para backend (Laravel) e frontend (Next.js). Nomes literais: nao mudar sem actualizar este ficheiro.
Base: `/api`. Auth: Sanctum, token Bearer. Respostas JSON. Erros de validacao: 422 `{message, errors}`. Sem token: 401. Papel errado: 403.

## Modelos
- `empresas`: id, nome
- `users`: id, empresa_id, nome, email (unico), email_verified_at (nullable), termos_aceites_em (nullable), password, papel (`admin` | `funcionario` | `estagiario`)
- `pedidos`: id, empresa_id, user_id, tipo (`ferias` | `ausencia` | `licenca`), subtipo (nullable; ausencia: `medica` | `documentacao` | `falta_justificada`), data_inicio, data_fim (date, `data_fim >= data_inicio`), observacao (nullable), estado (`pendente` | `aprovado` | `recusado`, default `pendente`), decidido_por (nullable), decidido_em (nullable), motivo_recusa (nullable), cor (nullable; `verde` | `violeta` | `laranja` | `pessego` | `escuro`)
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
| GET `/api/me` | autenticado | - | 200 `{user}`; `user.tipo` = `{id,nome}` ou null |
| GET `/api/funcionarios` | admin | - | 200 `{data: [user + tipo_id, tipo_nome]}`. Lista so de leitura: as contas nascem de convites do admin (ver abaixo); POST/PUT/DELETE `/api/funcionarios` nao existem |
| POST/GET `/api/funcionarios/convites`, POST `.../{id}/reenviar`, DELETE `.../{id}` | admin | `{nome, email, papel: funcionario\|estagiario, tipo_id?}` (com `tipo_id` o papel e o `base` do tipo; papel diferente: 422) | convite `{id,nome,email,papel,tipo_id,tipo_nome,expira_em,link}` (7 dias; `link` tambem mostrado ao admin enquanto nao houver SMTP) |
| POST `/api/funcionarios/{id}/aprovar` e `/recusar` | admin | - | 200 `{data: user}` com `estado_conta` `aprovado`\|`recusado`; recusar revoga os tokens; 422 se o admin recusa a propria conta |
| GET/POST `/api/definicoes/tipos`, PUT/DELETE `/api/definicoes/tipos/{id}` | admin | POST `{nome (<=40, unico por empresa sem distinguir maiusculas; nao Administrador/Funcionario/Estagiario), base: funcionario\|estagiario, permissoes?: {chave:bool}}`; PUT `{nome?, permissoes?}` (`base` diferente: 422) | GET 200 `{data:[{id,nome,base,permissoes:{<12 chaves>:bool},em_uso}]}`; POST 201 `{data:tipo}`; PUT 200 `{data:tipo}`; DELETE 204, ou 409 `{message:"Há pessoas com este tipo. Passe-as para outro tipo antes de apagar."}` se ha pessoas ou convites pendentes; outra empresa: 404. Chaves em falta ficam com o predefinido do papel-base (D11) |
| PUT `/api/funcionarios/{id}/tipo` | admin | `{tipo_id: int\|null, papel?: funcionario\|estagiario}` | 200 `{data: user + tipo_id, tipo_nome}`. Com `tipo_id`: `papel` = base do tipo (o enviado e ignorado). `tipo_id` null: fica sem tipo; o papel so muda se `papel` for enviado. 422 em contas admin; 404 se a pessoa ou o tipo forem de outra empresa |
| GET/PUT `/api/definicoes/convite` | admin | `{texto: string\|null}` (max 1000; vazio repoe o predefinido) | 200 `{data:{texto,predefinido}}` |
| GET/PUT `/api/definicoes/permissoes` | admin | PUT `{papeis:{funcionario:{chave:bool}, estagiario:{chave:bool}}}`; so chaves do catalogo e booleans (senao 422); chaves em falta ficam com o predefinido | 200 `{data:{catalogo:[{chave,rotulo,grupo}], papeis:{funcionario:{chave:bool}, estagiario:{chave:bool}}}}` |
| GET `/api/pedidos` | autenticado | query `?estado=` opcional | 200 `{data: [pedido]}`; admin ve todos da empresa (com `user: {id, nome}`), funcionario so os seus; pedidos de funcionarios apagados ficam ocultos |
| GET `/api/agenda` | autenticado | query `?de=AAAA-MM-DD&ate=AAAA-MM-DD` obrigatorios (`ate >= de`) | 200 `{data: [...]}` dos pedidos da empresa pendentes/aprovados que intersectam o intervalo (`data_inicio <= ate` e `data_fim >= de`, limites inclusivos); admin: pedidos completos com `user: {id, nome}`; funcionario: os seus completos + aprovados dos colegas so com `{id, user: {id, nome}, tipo, data_inicio, data_fim, estado, cor}`; exclui recusados, apagados e outras empresas; 422 se parametros invalidos |
| GET `/api/compromissos` | autenticado | query `?de=AAAA-MM-DD&ate=AAAA-MM-DD` obrigatorios | 200 `{data: [{id, data, hora_inicio, hora_fim, titulo, tipo, descricao}]}` so dos compromissos de quem pede (agenda pessoal, privada), por dia e hora |
| POST `/api/compromissos` | autenticado | `{data, hora_inicio?, hora_fim?, titulo, tipo (reuniao, chamada, lembrete ou outro), descricao?}`; `data` >= hoje (Lisboa); `hora_fim` obrigatoria com `hora_inicio` e depois dela | 201 `{data: compromisso}`; 422 validacao |
| DELETE `/api/compromissos/{id}` | autenticado | - | 204; 404 se for de outra pessoa |
| POST `/api/pedidos` | funcionario | `{tipo, subtipo?, data_inicio, data_fim, observacao?, cor?}` (`cor` opcional: verde, violeta, laranja, pessego ou escuro, senao 422; em falta fica null; visivel aos colegas na agenda) | 201 `{data: pedido}` (estado pendente) |
| POST `/api/pedidos/{id}/aprovar` | admin | - | 200 `{data: pedido}`; so se pendente, senao 409; 404 se for de outra empresa ou de funcionario apagado |
| POST `/api/pedidos/{id}/recusar` | admin | `{motivo_recusa}` obrigatorio | 200 `{data: pedido}`; so se pendente, senao 409; 404 se for de outra empresa ou de funcionario apagado |

**Permissoes por papel (D10).** O admin define o que Funcionario e Estagiario podem fazer; o admin tem sempre tudo. Catalogo (`chave`, grupo): `dia_a_dia`: `pedir_ferias`, `pedir_ausencia`, `pedir_licenca`, `anexar_documentos`, `marcar_presenca`, `registar_ocorrencias`, `criar_compromissos`, `melhorar_texto`; `gestao`: `aprovar_pedidos`, `ver_presencas_empresa`, `gerir_pontes`, `convidar_pessoas`. Predefinido: funcionario = todo o `dia_a_dia`, sem `gestao`; estagiario igual mas sem `pedir_ferias`. `user.permissoes` (em `/me` e no login) e `string[]` com as chaves concedidas (admin: as 12). Sem permissao: 403 `{message: "Sem permissão."}`.
Rotas: `pedir_*` em POST/PUT `/pedidos` (por `tipo`); `anexar_documentos` em POST/DELETE `/pedidos/{id}/anexos/...`; `marcar_presenca` em `/presencas/hoje|entrada|saida|atrasada` e PUT `/me/almoco`; `registar_ocorrencias` em POST `/ocorrencias`; `criar_compromissos` em POST/DELETE `/compromissos`; `melhorar_texto` em POST `/texto/melhorar`; `aprovar_pedidos` em POST `/pedidos/{id}/aprovar|visto|recusar`; `gerir_pontes` em POST/DELETE `/pontes`; `convidar_pessoas` em `/funcionarios/convites*`.
Leitura alargada: `ver_presencas_empresa` faz GET `/presencas` e `/ocorrencias` devolver os da empresa (com `user_id` opcional); `aprovar_pedidos` faz GET `/pedidos` e `/agenda` devolver os pedidos de todos (completos, como ao admin) e permite descarregar os anexos deles. Quem aprova nunca decide um pedido seu (403). Continuam so admin: aprovar/recusar contas, PUT `/limites`, GET `/funcionarios`, `/ferias-resumo`, `/definicoes/*`.

`user` = `{id, nome, email, papel, empresa_id}`. Sobreposicao de datas do mesmo utilizador: aviso (campo `avisos: ["..."]` na resposta do POST), nunca bloqueio.

## Seed de desenvolvimento
Uma empresa "Empresa Demo", admin `admin@vatech.test`, funcionario `funcionario@vatech.test`; password de dev `password` (so local, nunca em producao).

## Frontend
Next.js `web/`, variavel `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api`). Ecras (PT): `/login`, `/` (funcionario: os meus pedidos + novo pedido; admin: pedidos pendentes + aprovar/recusar), `/convite/[token]` (formulario do convidado), `/funcionarios` (admin: lista, convites, contas por autorizar). Token em memoria + localStorage. Sem setas na UI; sem cores/fontes inventadas (`TODO: token em falta`, Tailwind neutro).
