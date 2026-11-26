import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';

/*
| Linha que quebra. A quebra não é opcional: uma fila de botões ou de tags que
| não quebra é a causa número um de scroll horizontal no telemóvel — e o
| `overflow-x` do body não é detectável por `scrollWidth` quando alguém já
| tapou o sintoma com `overflow-x: clip`.
|
| `items-center` por omissão porque o uso normal é ícone + texto + botão; para
| texto de tamanhos diferentes na mesma linha, `align="baseline"`.
*/
const inline = cva('flex flex-wrap', {
  variants: {
    gap: {
      none: 'gap-0',
      '2xs': 'gap-1',
      xs: 'gap-2',
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-gutter',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: { gap: 'sm', align: 'center', justify: 'start' },
});

export type InlineProps = React.ComponentProps<'div'> & VariantProps<typeof inline> & ComAsChild;

/*
| `asChild` para a fila poder ser o que já é: uma <ul> de etiquetas, uma <nav>
| de atalhos, um <fieldset> de opções. Mesmo motivo do Stack.
*/
export function Inline({ className, gap, align, justify, asChild, ...props }: InlineProps) {
  const Elemento = asChild ? Raiz : 'div';
  return <Elemento className={cn(inline({ gap, align, justify }), className)} {...props} />;
}
