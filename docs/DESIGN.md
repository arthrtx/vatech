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
- **Menu lateral recolhível** (versão só ícones).
- **Cor de acento verde** para estado positivo e acção principal; vermelho para o negativo.

## Regras do dono

- **Sem setas** na interface (parecem "feitas por IA"): ligações e acções só com texto. Ícones de seta e chevrons ficam de fora, inclusive nos menus. Fonte: preferência do Arthur.

## Adaptações para a vatech (a validar na execução)

- Os cartões da referência (saldo, cartão bancário) viram: saldo de dias de férias, próximos pedidos, estado do pedido, quem está fora hoje.
- Em ferramenta de RH, os gradientes fortes da referência podem cansar. Na E2 propõem-se variantes dentro desta direcção (`design-shotgun`) antes de fixar.
- Tema escuro e claro entram na v1 só se o custo for pequeno; senão, claro primeiro. `TODO: decisão do dono`.

## Tokens

`TODO: token em falta`. Cores, famílias de fontes, raios, espaçamentos e sombras **não foram medidos** (só havia capturas de imagem, sem código nem `DESIGN.md` da HUROH). A execução mede-os a partir da referência ou o dono fornece-os. Nenhum valor é inventado aqui.
