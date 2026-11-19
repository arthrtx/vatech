# DESIGN — vatech

**Estado:** direcção (do /start). Os tokens medidos e os componentes saem da execução (E2).
**Fonte da direcção:** capturas de ecrã do projecto HUROH do dono (`C:\Users\arthu\Documents\HUROH\Claude outputs\`: `01-dashboard.png`, `09-dashboard-claro.png`, `cal-claro.png`, `14-menu-lateral.png`). É só **referência de princípios**, nada se copia (logo, nome, cartão, ilustrações).
**Outras referências visuais:** imagens em `docs/referencias-design/`.

## Princípios observados na referência

- **Tema escuro e claro** em paridade, com alternador na barra de topo.
- **Layout:** barra lateral com secções ("Principal", "Conta"), ícones de linha + texto; área principal em painel arredondado.
- **Barra de topo** com relógio/data, pílula com a página actual, pesquisa, alternador de tema, notificações com contador, menu do utilizador.
- **Cartões grandes de cantos muito arredondados**, com efeito vidro e gradientes suaves de cor. Cada cartão responde a uma pergunta (saldo, próximos eventos).
- **Saudação personalizada** no topo do início ("Bom dia, <nome>") com a frase-resumo e as acções principais em botões grandes.
- **Número grande como protagonista** do cartão; legenda pequena por baixo; rótulos em maiúsculas pequenas.
- **Calendário em faixa de dias** com o dia actual destacado e pontos nos dias com eventos.
- **Menu lateral só com ícones** (aplicado, ver "Menu lateral").
- **Cor de acento verde** para estado positivo e acção principal; vermelho para o negativo.

## Regras do dono

- **Sem setas** na interface (parecem "feitas por IA"): ligações e acções só com texto. Ícones de seta e chevrons ficam de fora, inclusive nos menus. Fonte: preferência do Arthur.

## Adaptações para a vatech (a validar na execução)

- Os cartões da referência (saldo, cartão bancário) viram: saldo de dias de férias, próximos pedidos, estado do pedido, quem está fora hoje.
- Em ferramenta de RH, os gradientes fortes da referência podem cansar. Na E2 propõem-se variantes dentro desta direcção (`design-shotgun`) antes de fixar.
- Tema escuro e claro entram na v1 só se o custo for pequeno; senão, claro primeiro. `TODO: decisão do dono`.

## Tokens

Medidos (pixel) nas referências que o Arthur enviou a 19/11/2026: dashboard claro em lilás e dashboard escuro em azul. Aplicado o claro; o escuro em azul fica como base para o tema escuro. Declarados em `web/src/app/globals.css` (`@theme`).

| Token | Valor | Origem |
|---|---|---|
| `fundo` | `#cfd5e5` | medido (moldura à volta do painel) |
| `painel` | `#ffffff` | medido |
| `campo` | `#f3f3f3` | medido (caixa de pesquisa) |
| `trilho` / `linha` | `#e8e9ed` | medido (fundo das barras de progresso) |
| `primaria` | `#7163ba` | medido (menu lateral) |
| `primaria-forte` | `#55479f` | medido (cartão de destaque) |
| `primaria-escura` | `#5a5082` | medido (item activo do menu) |
| `primaria-suave` | `#f1e8ff` | medido (separador activo) |
| `rosa` | `#f1648f` | medido (cartão rosa); usado para o negativo |
| `rosa-suave` | `#fde3ec` | ajustado para texto escuro legível |
| `positivo` | `#16b53f` | medido (barra de progresso) |
| `texto` | `#3c3755` | medido (título) |
| `texto-suave` | `#625f78` | ajustado: o medido `#9998a0` não passa 4.5:1 |
| `linha-forte` | `#8f8aa8` | ajustado: borda de campo com 3:1 sobre branco |
| raios `controlo` / `cartao` / `barra` / `painel` | 12 / 24 / 32 / 40 px | medidos a olho na referência a 1200 px |
| sombra `suave` | `0 12px 32px -14px rgb(60 55 85 / .28)` | aproximada da referência |

`TODO: token em falta` — família de fonte (a referência usa uma sans geométrica não identificada; fica `system-ui`) e paleta do tema escuro.

## Menu lateral

Barra estreita em `primaria`, só ícones de linha (estilo "onyx icons": traço 1.75, pontas redondas), com dica ao passar o rato/focar e `aria-label`. Ordem: Dashboard, Pedidos, Agenda, Funcionários (admin); em baixo Definições e Sair (ícone de energia, porque o da referência é uma seta). Pesquisa na barra de topo, com Ctrl+K.
