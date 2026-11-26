import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Duas colunas que empilham abaixo de `md` (860px, tablet retrato). É o padrão
| mais repetido do site — texto ao lado de imagem, conteúdo ao lado de barra
| lateral — e empilhar cedo é deliberado: duas colunas num tablet retrato
| deixam cada uma abaixo da medida de leitura.
|
| As proporções são fracções (`fr`), não medidas: uma coluna de 2fr não tem
| valor em píxeis que se possa guardar num token. Uma barra lateral de largura
| fixa é outro componente — vive no shell, não aqui.
*/
const split = cva('grid', {
  variants: {
    ratio: {
      /** 50/50. */
      even: 'md:grid-cols-2',
      /** 2:1 — conteúdo à esquerda, apoio à direita. */
      wide: 'md:grid-cols-[2fr_1fr]',
      /** 1:2 — apoio à esquerda, conteúdo à direita. */
      narrow: 'md:grid-cols-[1fr_2fr]',
      /** 3:2 — desequilíbrio suave, para texto ao lado de imagem. */
      golden: 'md:grid-cols-[3fr_2fr]',
    },
    gap: {
      none: 'gap-0',
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
      stretch: 'items-stretch',
    },
  },
  defaultVariants: { ratio: 'even', gap: 'xl', align: 'start' },
});

export type SplitProps = React.ComponentProps<'div'> & VariantProps<typeof split>;

export function Split({ className, ratio, gap, align, ...props }: SplitProps) {
  return <div className={cn(split({ ratio, gap, align }), className)} {...props} />;
}
