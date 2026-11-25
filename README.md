# vatech

Gestão de férias, ausências e licenças da equipa. Só website: Next.js (`web/`) a falar com uma API Laravel (raiz do repositório), base de dados MySQL.

## Usar

**Site:** https://vatech-eight.vercel.app

É o endereço para funcionários, estagiários e chefe. Todos veem os mesmos dados, porque a base de dados está online. O `iniciar.bat` só abre este endereço no browser.

Na primeira abertura do dia o site pode demorar cerca de um minuto a responder: a API está num plano grátis e adormece quando ninguém a usa.

## Onde está alojado

| Parte | Serviço | Endereço |
|---|---|---|
| Site (Next.js) | Vercel | https://vatech-eight.vercel.app |
| API (Laravel) | Render | https://vatech-api.onrender.com |
| Base de dados (MySQL) | TiDB Cloud Starter | instância `vatech`, região Frankfurt |

Tudo em planos grátis. Configuração e passos em `docs/DEPLOY.md`; o porquê está na decisão D8 de `docs/DECISIONS.md`.

- As palavras-passe e ligações à base de dados ficam nas variáveis de ambiente do Render, nunca no repositório.
- A conta de admin de produção é criada no primeiro arranque a partir de `ADMIN_EMAIL` e `ADMIN_PASSWORD` (Render). As contas de teste não existem online.

## Atualizações

Cada commit que chega ao `main` é publicado sozinho: o Vercel atualiza o site (1 a 2 minutos) e o Render reconstrói a API (3 a 5 minutos), correndo as migrações da base de dados no arranque. Se uma publicação falhar, fica no ar a última versão que funcionava.

Testem no PC antes de enviar para o `main`: o que lá entra vai para o site que toda a gente usa.

## Programar no PC

Precisa de Git, Node e Docker Desktop. Duplo clique em `iniciar-local.bat` na raiz: faz `git pull`, instala as dependências, sobe a API e um MySQL local em Docker, sobe o web e abre http://localhost:3000.

A versão local usa a sua própria base de dados, separada da online. O que se cria no PC não aparece no site e vice-versa.

### Contas de teste (só local)

| Papel | Email | Password |
|---|---|---|
| Admin (dono) | `admin@vatech.test` | `password` |
| Funcionário | `funcionario@teste.com` | `password` |
| Estagiário | `estagiario@teste.com` | `password` |

Criadas pelo seeder (`database/seeders/DatabaseSeeder.php`) quando a API local arranca.

### Endereços locais

- Web: http://localhost:3000
- API: http://localhost:8000/api (contrato em `docs/API-CONTRATO.md`)
- phpMyAdmin: http://localhost:8080 (MySQL no host em `127.0.0.1:3307`). O `iniciar-local.bat` não o sobe; para o iniciar: `docker compose up -d phpmyadmin`

## Documentação

- `docs/PRD.md`: o produto
- `docs/DECISIONS.md`: decisões e porquês
- `docs/DESIGN.md`: design
- `docs/DEPLOY.md`: produção
- `PROGRESSO.md`: estado atual
