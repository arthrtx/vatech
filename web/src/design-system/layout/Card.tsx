import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz } from '../lib/asChild';

/*
| A superfície da casa. Três registos:
|
|  - plain     linha simples. O que se usa quando há muitos numa grelha.
|  - offset    a assinatura: a borda de 1px deslocada 8px, desenhada por
|              ::after em .ds-offset. É o que dá o ar de impressão em papel.
|  - elevated  sombra em vez de linha. Para o cartão que se destaca de todos
|              os outros — um por ecrã, não doze.
|
| ⚠ Nunca pôr `overflow-hidden` num cartão `offset`: a borda vive FORA da
| caixa (translate de 8px) e um overflow corta-a sem deixar erro nenhum.
|
| Três eixos, e não um só, porque respondem a perguntas diferentes:
|   variant      que superfície é           (plain · offset · elevated)
|   interactive  o cartão inteiro é alvo?   (afordância + alvo táctil)
|   hover        como reage ao rato         (none · lift · wash)
*/
const card = cva('rounded-lg bg-surface-1', {
  variants: {
    variant: {
      plain: 'border border-line',
      offset: 'ds-offset border border-line',
      elevated: 'border border-line shadow-surface',
    },
    /*
    | «O cartão inteiro é um alvo.» Só afordância e geometria: ocupa a linha
    | toda, alinha o texto à esquerda (um <button> centra por omissão) e
    | garante 44px de altura mínima — o mínimo táctil da WCAG 2.5.5, que numa
    | grelha densa não vem de graça.
    |
    | Deixou de trazer o levantamento amarrado: ser clicável e levantar são
    | duas decisões, e uma lista de 40 linhas que saltam lê-se como ruído.
    */
    interactive: {
      true: 'block min-h-touch w-full text-left',
      false: '',
    },
    /*
    | O registo de resposta ao rato. Dois legítimos, e a escolha é de densidade:
    |
    |  - lift  levanta 4px (.ds-offset-lift). Para cartões soltos e de
    |          destaque — meia dúzia por ecrã, com espaço à volta para o
    |          movimento se ler como movimento.
    |  - wash  realce de fundo. Para linhas de lista densas; é exactamente o
    |          mesmo tratamento que o `TableRow` neutro usa, de propósito —
    |          uma linha clicável não muda de linguagem por estar num Card em
    |          vez de numa <table>.
    |
    | O `wash` anima só a cor: numa lista longa, animar `transform` linha a
    | linha é trabalho de composição que não paga o que dá.
    */
    hover: {
      none: '',
      lift: 'ds-offset-lift',
      wash: 'transition-colors duration-[var(--ds-motion-base)] ease-ds hover:bg-wash',
    },
  },
  defaultVariants: { variant: 'plain', interactive: false, hover: 'none' },
});

type CardOwnProps = VariantProps<typeof card>;

/*
| Quem decide o elemento — e a precedência, porque agora há duas formas de o
| dizer e podiam contradizer-se.
|
|   asChild  → o filho. GANHA sempre, e por isso `href` e `onClick` ficam
|              proibidos NO TIPO quando `asChild` está ligado. Não é um caso
|              para resolver em silêncio: o `href` iria parar ao Slot, o filho
|              (um <Link>) traria o seu, e ficavam dois — com o do filho a
|              ganhar por regra do Radix, sem ninguém perceber porquê. Assim o
|              compilador diz o que há a dizer: com `asChild`, o destino vai
|              no filho.
|   href     → <a>
|   onClick  → <button type="button">
|   nenhum   → <div>
|
| `div` com onClick não passa em review — não é focável nem responde a Enter.
|
| ⚠ Com `asChild` o cartão NÃO consegue saber se o filho é clicável: um <a>
| sem href, um <span> e um <Link> chegam-lhe iguais. Por isso o `interactive`
| não se auto-liga aí — quem usa `asChild` num alvo declara-o
| (`asChild interactive hover="wash"`). Com `href`/`onClick` o cartão sabe, e
| liga sozinho como sempre ligou.
|
| `asChild` exige exactamente um filho elemento — ver `lib/asChild.ts`.
*/
export type CardProps =
  | ({
      /**
       * Funde as props e as classes no filho único em vez de render o elemento
       * próprio — para o cartão ser um `<Link>` do Next, um `<a>` ou um
       * `<article>` sem perder a superfície.
       *
       * Exige exactamente um filho elemento — não um texto, não dois irmãos.
       *
       * Com `asChild` o destino vai NO FILHO: `href` e `onClick` no Card ficam
       * proibidos, e o cartão não adivinha que é alvo — declara-se
       * `interactive` (e o `hover` que se quiser).
       */
      asChild: true;
      href?: never;
      onClick?: never;
    } & CardOwnProps &
      React.ComponentProps<'div'>)
  | ({ asChild?: false; href: string; onClick?: never } & CardOwnProps &
      Omit<React.ComponentProps<'a'>, 'href'>)
  | ({
      asChild?: false;
      href?: never;
      onClick: React.MouseEventHandler<HTMLButtonElement>;
    } & CardOwnProps &
      Omit<React.ComponentProps<'button'>, 'onClick'>)
  | ({ asChild?: false; href?: never; onClick?: never } & CardOwnProps &
      React.ComponentProps<'div'>);

/*
| O `hover` por omissão sai do que o cartão faz: um alvo levanta, uma caixa
| parada não. Explícito manda sempre — é o que permite a linha de lista pedir
| `wash` e o cartão desactivado pedir `none`.
*/
function registoHover(
  interactive: CardOwnProps['interactive'],
  hover: CardOwnProps['hover'],
): NonNullable<CardOwnProps['hover']> {
  return hover ?? (interactive ? 'lift' : 'none');
}

export function Card(props: CardProps) {
  if (props.asChild) {
    /* O `asChild` fica fora do spread: é instrução para este componente, não prop de DOM. */
    const { asChild: _asChild, className, variant, interactive, hover, ...resto } = props;
    const Elemento = Raiz;
    return (
      <Elemento
        className={cn(
          card({ variant, interactive, hover: registoHover(interactive, hover) }),
          className,
        )}
        {...resto}
      />
    );
  }

  if (props.href !== undefined) {
    const { href, className, variant, interactive = true, hover, ...resto } = props;
    return (
      <a
        href={href}
        className={cn(
          card({ variant, interactive, hover: registoHover(interactive, hover) }),
          className,
        )}
        {...resto}
      />
    );
  }

  if (props.onClick !== undefined) {
    const { className, variant, interactive = true, hover, ...resto } = props;
    return (
      <button
        type="button"
        className={cn(
          card({ variant, interactive, hover: registoHover(interactive, hover) }),
          className,
        )}
        {...resto}
      />
    );
  }

  const { className, variant, interactive, hover, ...resto } = props;
  return (
    <div
      className={cn(
        card({ variant, interactive, hover: registoHover(interactive, hover) }),
        className,
      )}
      {...resto}
    />
  );
}

/*
| O Card não traz padding próprio: o espaço vem das secções. É o que permite
| um rodapé com fundo diferente a sangrar até à borda, sem lutar contra um
| padding do pai.
|
| As secções encaixam por ordem (cabeçalho → corpo → rodapé) e o corpo repõe
| o padding de topo/base quando é o primeiro ou o último — assim um
| `<Card><CardBody/></Card>` sozinho também fica certo.
|
| ---
|
| `padding` — a densidade, e porque é um eixo próprio.
|
| 32px é a medida de um cartão de conteúdo e a medida errada de uma linha de
| lista: numa lista de 30 leads, o padding come mais ecrã do que os dados. O
| eixo chama-se `padding` e não `tone` (que é significado semântico) nem
| `variant` (que é superfície ou forma).
|
|   comfortable  32px lateral — cartão de conteúdo. O que já existia.
|   compact      16px lateral, 12px vertical — o MESMO ritmo do `TableCell`,
|                para uma linha de Card e uma linha de <table> não se lerem
|                com densidades diferentes na mesma aplicação.
|
| Os valores não são os `sm/md/lg` do `padding` do Panel, de propósito: o
| Panel é uma caixa só, com pad uniforme, e escolhe um degrau da escala. As
| secções do Card têm um ritmo assimétrico (o corpo aperta contra o cabeçalho
| e abre contra a borda) que se tem de manter coordenado — o nome descreve o
| registo, não um degrau.
|
| A densidade escolhe-se por secção e não no Card porque não há forma de a
| propagar sem `use client`: um contexto de React arrastava o Card inteiro
| para o cliente, e um Card não leva estado nenhum.
*/
const cabecalho = cva('flex flex-col gap-1', {
  variants: {
    padding: {
      comfortable: 'px-card pt-card pb-4',
      compact: 'px-4 pt-4 pb-2',
    },
  },
  defaultVariants: { padding: 'comfortable' },
});

export type CardHeaderProps = React.ComponentProps<'div'> & VariantProps<typeof cabecalho>;

export function CardHeader({ className, padding, ...props }: CardHeaderProps) {
  return <div className={cn(cabecalho({ padding }), className)} {...props} />;
}

const corpo = cva('', {
  variants: {
    padding: {
      comfortable: 'px-card py-4 first:pt-card last:pb-card',
      compact: 'px-4 py-2 first:pt-3 last:pb-3',
    },
  },
  defaultVariants: { padding: 'comfortable' },
});

export type CardBodyProps = React.ComponentProps<'div'> & VariantProps<typeof corpo>;

export function CardBody({ className, padding, ...props }: CardBodyProps) {
  return <div className={cn(corpo({ padding }), className)} {...props} />;
}

const rodape = cva('flex flex-wrap items-center gap-3', {
  variants: {
    padding: {
      comfortable: 'px-card pt-4 pb-card',
      compact: 'px-4 pt-2 pb-3',
    },
  },
  defaultVariants: { padding: 'comfortable' },
});

export type CardFooterProps = React.ComponentProps<'div'> & VariantProps<typeof rodape>;

export function CardFooter({ className, padding, ...props }: CardFooterProps) {
  return <div className={cn(rodape({ padding }), className)} {...props} />;
}
