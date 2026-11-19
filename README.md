# vatech

Gestão de férias, ausências e licenças. Next.js (`web/`), Laravel (API, raiz), MySQL. Produto só website.

**Site:** https://vatech-eight.vercel.app

A versão online atualiza-se sozinha sempre que há alterações no `main`. Na primeira abertura do dia pode demorar cerca de um minuto, porque a API acorda (plano grátis). Como está montada: `docs/DEPLOY.md`.

## Arrancar (qualquer máquina com Git, Node e Docker Desktop)

Duplo clique em `iniciar-local.bat` na raiz (o `iniciar.bat` só abre o site online). Cada vez que corre, faz `git pull` da última versão, instala as dependências, sobe a API e a base de dados em Docker, sobe o web e abre http://localhost:3000 no browser.

## Contas de desenvolvimento (só local, nunca em produção)

| Papel | Email | Password |
|---|---|---|
| Admin (dono) | `admin@vatech.test` | `password` |
| Funcionário | `funcionario@vatech.test` | `password` |

Criadas pelo seeder (`database/seeders/DatabaseSeeder.php`) quando a API arranca.

## Endereços locais

- Web: http://localhost:3000
- API: http://localhost:8000/api (contrato em `docs/API-CONTRATO.md`)
- phpMyAdmin: http://localhost:8080 (MySQL no host em `127.0.0.1:3307`). O `iniciar-local.bat` não o sobe; para o iniciar: `docker compose up -d phpmyadmin`
