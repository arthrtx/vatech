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
| `APP_URL` | endereço do serviço no Render, ex. `https://vatech-api.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | endereço do site no Vercel, ex. `https://vatech.vercel.app` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOME` | a primeira conta de admin |

4. Ao arrancar, a API cria as tabelas e a conta de admin. As contas de teste (`admin@vatech.test`) não existem em produção.
5. Confirmar que `https://<endereço-da-api>/up` responde.

## 3. Site (Vercel)

1. No projeto `vatech` do Vercel, em **Settings > Environment Variables**, criar `NEXT_PUBLIC_API_URL` = `https://<endereço-da-api>/api` para **Production**.
2. Fazer **Redeploy** da última versão do `main`.

## Atualizações

Cada merge no `main` faz o Render e o Vercel publicarem a versão nova sozinhos. As migrações correm no arranque da API.

## Limitações do plano grátis

- A API adormece após 15 minutos sem pedidos. O primeiro pedido a seguir demora cerca de um minuto.
- O disco do Render apaga-se a cada arranque: as fotos de perfil perdem-se até passarem para a base de dados ou para um armazenamento externo.
