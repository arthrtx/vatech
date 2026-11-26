import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';

/*
| Grelha com os cortes do sistema já decididos.
|
| O número de colunas é o do desktop; o caminho até lá é fixo e igual em todo o
| lado. Deixar cada ecrã escolher os seus cortes é como o mesmo bloco acaba a
| ser 2 colunas a 640px numa página e 3 noutra.
|
| Os cortes são os da casa: `sm` 640px, `lg` 1000px (o corte principal, onde a
| navegação vira menu). Não são os do Tailwind por omissão — ver breakpoints.css.
*/
const grid = cva('grid', {
  variants: {
    cols: {
      /** Uma coluna sempre. Serve para usar só o `gap`. */
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      /*
      | Seis é para blocos pequenos (logótipos, ícones, métricas curtas): já
      | começa a duas no telemóvel porque cada célula tem pouco conteúdo.
      */
      6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    },
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
  },
  defaultVariants: { cols: 3, gap: 'lg' },
});

export type GridProps = React.ComponentProps<'div'> & VariantProps<typeof grid> & ComAsChild;

/*
| `asChild` porque uma grelha de cartões é quase sempre uma lista, e uma
| grelha de resultados de pesquisa quase sempre uma <section> com nome
| acessível. Mesmo motivo do Stack.
*/
export function Grid({ className, cols, gap, asChild, ...props }: GridProps) {
  const Elemento = asChild ? Raiz : 'div';
  return <Elemento className={cn(grid({ cols, gap }), className)} {...props} />;
}
