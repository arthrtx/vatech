'use client';

import { createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Accordion as RadixAccordion } from 'radix-ui';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

/*
| Acordeão. A mecânica é do Radix — `aria-expanded`, `aria-controls`, a região
| do painel, as setas entre cabeçalhos e Home/End. É detalhe demasiado fácil de
| errar à mão, e não é onde o sistema acrescenta valor.
|
| A API de abertura é a do Radix e não uma nossa: `type="single"` com
| `collapsible`, ou `type="multiple"`. Quem já conhece a primitiva não reaprende
| nada, e o dia em que for preciso controlar por `value`/`onValueChange` já está
| resolvido.
*/

/** Nível do cabeçalho que envolve cada gatilho. */
export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

const CABECALHO_POR_NIVEL = { 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

/** Tratamento de superfície do acordeão inteiro. */
export type AccordionVariant = 'plain' | 'card';

/*
| Variante e nível de cabeçalho decidem-se UMA vez, na raiz, e chegam aos
| subcomponentes por contexto. A alternativa — repetir `variant` em cada item,
| gatilho e painel — dá ao consumidor quatro sítios onde a mesma decisão pode
| divergir dentro do mesmo acordeão.
*/
const Contexto = createContext<{ variant: AccordionVariant; headingLevel: AccordionHeadingLevel }>({
  variant: 'plain',
  headingLevel: 3,
});

const acordeao = cva('w-full', {
  variants: {
    variant: {
      /** Só linhas separadoras — para dentro de uma superfície que já existe. */
      plain: 'border-y border-line',
      /** Cada item na sua própria superfície com raio, separados entre si. */
      card: 'flex flex-col gap-3',
    },
  },
  defaultVariants: { variant: 'plain' },
});

const item = cva('', {
  variants: {
    variant: {
      plain: 'border-b border-line last:border-b-0',
      card: 'rounded-lg border border-line bg-surface-1',
    },
  },
  defaultVariants: { variant: 'plain' },
});

const gatilho = cva(
  [
    /*
    | `min-h-touch` no gatilho INTEIRO, e não só à volta do ícone: a barra toda
    | é o alvo, e é isso que dá os 44px da WCAG 2.5.5 num telemóvel.
    */
    'group/gatilho flex min-h-touch w-full items-center justify-between gap-4 py-4 text-left',
    'text-md font-semibold text-text-1',
    'transition-colors duration-[var(--ds-motion-base)] ease-ds hover:text-accent-ink',
    'disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:text-text-3',
  ],
  {
    variants: {
      variant: { plain: 'px-0', card: 'px-6' },
    },
    defaultVariants: { variant: 'plain' },
  },
);

const conteudo = cva('pb-6 text-text-2', {
  variants: {
    variant: { plain: 'px-0', card: 'px-6' },
  },
  defaultVariants: { variant: 'plain' },
});

export type AccordionProps = React.ComponentProps<typeof RadixAccordion.Root> &
  VariantProps<typeof acordeao> & {
    /**
     * Nível do cabeçalho que envolve cada gatilho. Por omissão 3, como no Radix.
     *
     * É um prop e não uma constante porque o nível certo depende de onde o
     * acordeão está: numa secção com `<h2>` pede `<h3>`, dentro de um cartão que
     * já tem `<h3>` pede `<h4>`. Um `<h3>` fixo salta níveis metade das vezes, e
     * saltar níveis estraga a navegação por títulos do leitor de ecrã.
     */
    headingLevel?: AccordionHeadingLevel;
  };

export function Accordion({ className, variant, headingLevel = 3, ...props }: AccordionProps) {
  const variante: AccordionVariant = variant ?? 'plain';

  return (
    <Contexto.Provider value={{ variant: variante, headingLevel }}>
      <RadixAccordion.Root className={cn(acordeao({ variant: variante }), className)} {...props} />
    </Contexto.Provider>
  );
}

export type AccordionItemProps = React.ComponentProps<typeof RadixAccordion.Item>;

export function AccordionItem({ className, ...props }: AccordionItemProps) {
  const { variant } = useContext(Contexto);

  return <RadixAccordion.Item className={cn(item({ variant }), className)} {...props} />;
}

export type AccordionTriggerProps = React.ComponentProps<typeof RadixAccordion.Trigger>;

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  const { variant, headingLevel } = useContext(Contexto);
  const Cabecalho = CABECALHO_POR_NIVEL[headingLevel];

  return (
    /*
    | O gatilho é um `<button>` DENTRO de um cabeçalho — é o que permite saltar
    | de secção em secção pela lista de títulos. `asChild` troca o `<h3>` fixo do
    | Radix pelo nível pedido sem perder os `data-*` que ele põe no cabeçalho.
    */
    <RadixAccordion.Header asChild>
      <Cabecalho className="flex">
        <RadixAccordion.Trigger className={cn(gatilho({ variant }), className)} {...props}>
          <span>{children}</span>
          <SetaDeEstado />
        </RadixAccordion.Trigger>
      </Cabecalho>
    </RadixAccordion.Header>
  );
}

/*
| Aberto ou fechado lê-se pela FORMA da seta, não por tinta: a rotação de 180°
| sobrevive a um ecrã sem cor e a quem não distingue os dois tons. O
| `aria-expanded` do Radix é a terceira via, para quem não vê nenhuma das duas.
*/
function SetaDeEstado() {
  return (
    <Icone
      de={ICONES.expandir}
      className={cn(
        'transition-transform duration-[var(--ds-motion-base)] ease-ds',
        // Grupo com nome: sem ele, um `.group` do consumidor mais acima com o seu
        // próprio `data-state` também rodava esta seta.
        'group-data-[state=open]/gatilho:rotate-180',
      )}
    />
  );
}

export type AccordionContentProps = React.ComponentProps<typeof RadixAccordion.Content>;

export function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  const { variant } = useContext(Contexto);

  return (
    /*
    | ALTURA ANIMADA — a excepção registada à regra "só `transform` e `opacity`"
    | (CONVENÇÕES §6). Não há alternativa: o painel tem altura desconhecida e
    | variável, e `transform: scaleY()` esmagaria o texto em vez de o revelar.
    |
    | Os keyframes vivem em `styles.css` e leem a altura que o Radix mede e
    | publica em `--radix-accordion-content-height`. É o caminho que a primitiva
    | espera, e por isso o painel monta e desmonta normalmente: fechado, sai do
    | DOM, sai da ordem de tabulação e sai da árvore de acessibilidade sem
    | ninguém ter de o esconder à mão.
    |
    | A primeira versão animava `grid-template-rows: 0fr -> 1fr` com o painel
    | sempre montado por `forceMount`, escondido por `visibility: hidden` — só
    | com utilidades, sem tocar na folha partilhada. Funcionava, mas mantinha um
    | segundo mecanismo a fazer o trabalho do primeiro: era a `visibility` a
    | tirar o painel fechado da ordem de tabulação, e bastava alguém mexer nessa
    | classe para o conteúdo invisível voltar a receber foco.
    |
    | Medido depois da troca: um painel fechado fica com `hidden`, `display:none`
    | e os filhos por renderizar. Nada disso é nosso — é o que a primitiva faz
    | quando a deixam trabalhar.
    |
    | ⚠ O que NÃO muda com isto: o Radix só escreve `aria-controls` no gatilho
    | quando o item está aberto (`context.open ? contentId : undefined`, em
    | `@radix-ui/react-collapsible`). Cinco dos oito gatilhos da página de
    | showcase não dizem o que controlam, e isso é comportamento do upstream,
    | igual nas duas técnicas. Fica registado para não ser diagnosticado outra
    | vez como defeito nosso.
    |
    | `motion-reduce`: um `@keyframes` traz duração própria e não passa pelos
    | tokens `--ds-motion-*`, ao contrário de uma transição. Tem de ser dito
    | aqui — é a mesma armadilha que o `animate-spin` do Spinner.
    */
    <RadixAccordion.Content
      className={cn(
        'overflow-hidden',
        'motion-safe:data-[state=open]:animate-[ds-acordeao-abre_var(--ds-motion-base)_var(--ds-motion-ease-out)]',
        'motion-safe:data-[state=closed]:animate-[ds-acordeao-fecha_var(--ds-motion-base)_var(--ds-motion-ease-out)]',
        className,
      )}
      {...props}
    >
      {/*
        | O espaçamento fica num filho e não no painel: um padding no elemento
        | que anima de altura zero continua a desenhar-se, e deixava uma faixa
        | aberta por baixo de um acordeão fechado.
      */}
      <div className={conteudo({ variant })}>{children}</div>
    </RadixAccordion.Content>
  );
}
