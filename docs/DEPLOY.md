# Deploy em produção

Tudo em planos grátis (D8). O site fica no Vercel, a API no Render e a base de dados no TiDB Cloud Starter. Toda a gente usa o mesmo endereço e vê os mesmos dados.

```
browser -> site (Vercel) -> API (Render) -> base de dados (TiDB)
```

## 1. Base de dados (TiDB Cloud Starter)

1. Criar conta em tidbcloud.com (dá para entrar com o GitHub).
2. Criar uma instância **Starter**, compatível com **MySQL**, numa região na Europa (Frankfurt).
3. Em **Connect**, gerar a palavra-passe e anotar host, porta (4000), utilizador e palavra-passe.
4. No **SQL Editor**, correr `CREATE DATABASE vatech;`.

## 2. API (Render)

1. Criar conta em render.com com o GitHub e dar acesso ao repositório `arthrtx/vatech`.
2. **New > Blueprint**, escolher o repositório. O Render lê o `render.yaml` e cria o serviço `vatech-api`.
3. Preencher as variáveis que ficam em branco:

| Variável | Valor |
|---|---|
| `DB_HOST` | host do TiDB |
| `DB_USERNAME` | utilizador do TiDB |
| `DB_PASSWORD` | palavra-passe do TiDB |
| `FRONTEND_URL` | endereço do site no Vercel (destino dos links do convite, de verificação e de recuperação; se ficar vazio os links saem com `http://localhost:3000`) |
| `APP_URL` | endereço do serviço no Render, ex. `https://vatech-api.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | endereço do site no Vercel, ex. `https://vatech.vercel.app` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOME` | a primeira conta de admin |
| `MAIL_*` (`MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`) | `TODO: credencial SMTP em falta (MAIL_*)`; sem isto o email do convite não chega (o admin copia o link que aparece ao convidar) (em dev `MAIL_MAILER=log`) |

4. Ao arrancar, a API cria as tabelas e a conta de admin. As contas de teste (`admin@vatech.test`) não existem em produção.
5. Confirmar que `https://<endereço-da-api>/up` responde.
6. Confirmar `APP_ENV=production` e `APP_DEBUG=false` (o `render.yaml` já os define; não os sobrepor no painel). Com `APP_DEBUG` ligado, as respostas de erro devolvem trace e caminhos do servidor. Verificar com um pedido que dê erro (ex. `https://<endereço-da-api>/api/rota-inexistente`, com `Accept: application/json`): a resposta não pode conter `trace`, `file` nem caminhos.

## 3. Site (Vercel)

1. No projeto `vatech` do Vercel, em **Settings > Environment Variables**, criar `NEXT_PUBLIC_API_URL` = `https://<endereço-da-api>/api` para **Production**.
2. Fazer **Redeploy** da última versão do `main`.

### Deploy do site pela CLI (colaboradores sem plano Vercel)

No plano grátis (Hobby) o Vercel só publica commits do dono da conta. O workflow `.github/workflows/deploy-web.yml` publica a `main` com o token do dono, por isso qualquer pessoa que faça merge consegue publicar.

Passos manuais, feitos uma vez pelo dono da conta Vercel:

1. No Vercel, **Settings > Tokens**: criar um token. Nunca o colar em conversas nem em ficheiros.
2. Em `web/`, correr `vercel link` e ler `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` de `.vercel/project.json` (a pasta `.vercel` não vai para o git).
3. No GitHub, **Settings > Secrets and variables > Actions**: criar `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`.
4. No Vercel, **Settings > Git**: desligar o deploy automático (senão cada push gera dois deploys).

Sem os secrets, o workflow termina com um aviso e não publica. Os previews por PR deixam de existir.

## Atualizações

Cada merge no `main` faz o Render e o Vercel publicarem a versão nova sozinhos. As migrações correm no arranque da API.

## Limitações do plano grátis

- A API adormece após 15 minutos sem pedidos. O primeiro pedido a seguir demora cerca de um minuto.
- O disco do Render apaga-se a cada arranque. Os anexos dos pedidos ficam na base de dados (tabela `anexo_conteudos`, máximo 5 MB por ficheiro; o TiDB limita a linha a 6 MB). As fotos de perfil ainda perdem-se até passarem também para a base de dados.
