# vatech desktop (Electron)

Janela Electron que abre o web (`VATECH_URL`, por omissão `http://localhost:3000`).

```
npm install
npm start      # electron .
npm test       # node --test (testes do atualizador)
```

## Atualização automática

Os updates do dono chegam sozinhos: ao arrancar e a cada `INTERVALO_MIN` minutos (10, em `atualizador.js`) a app verifica a `main` no GitHub.

Só actua se:

- a branch actual é `main`;
- a árvore está limpa (`git status --porcelain` vazio).

Se alguma condição falhar, não faz nada e não incomoda.

Quando está atrás da origin:

1. `git fetch origin` e `git pull --ff-only origin main` (nunca `reset`, `stash`, `checkout`, `clean` nem `--force`).
2. Com base em `git diff --name-only <antes> <depois>`:
   - `web/package-lock.json` ou `desktop/package-lock.json` mudou: `npm ci` nessa pasta.
   - mudaram ficheiros em `app/`, `routes/`, `database/`, `config/`, `docker/`, `composer.json` ou `composer.lock`: `docker compose restart api` (o entrypoint corre migrate/seed). Só se o Docker responder; senão é ignorado.
   - o web dev server recarrega sozinho.
3. Mostra o diálogo "Há uma versão nova. Atualizada. Reiniciar agora?" com os botões "Reiniciar agora" e "Mais tarde". "Reiniciar agora" faz `app.relaunch()`.

Sem rede, sem acesso ao GitHub ou pull que não seja fast-forward: silencioso, uma linha de log na consola, sem diálogo de erro. Nunca há duas verificações em simultâneo.

O repo é privado: o colaborador precisa de git instalado e com acesso (as credenciais do próprio git dele).

A lógica está em `atualizador.js`, com `git`/`npm`/`docker` injectados (`criarAtualizador({ raiz, exec, log })`), e é testada em `atualizador.test.js`.
