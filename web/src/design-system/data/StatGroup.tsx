import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Faixa de métricas com divisórias — a barra de números do topo de um painel.
|
| As divisórias deixaram de ser `divide-*`: `divide-y` põe borda de topo em
| TODOS os filhos menos o primeiro, o que numa grelha de várias linhas desenha
| uma borda a meio da primeira linha. Em vez disso, cada célula traz a sua
| borda de topo e de esquerda, e a grelha recua 1px (`-mt-px -ml-px`) para que
| a primeira linha e a primeira coluna caiam por baixo da borda da moldura e
| sejam cortadas pelo `overflow-hidden`. Funciona para qualquer número de
| linhas e não pinta nada nas células que sobram na última linha.
*/
const grelha = cva('grid -mt-px -ml-px [&>*]:border-t [&>*]:border-l [&>*]:border-line', {
  variants: {
    /*
    | Classes literais completas: o Tailwind lê o ficheiro como texto e nunca
    | veria `grid-cols-${n}`.
    |
    | Todas as rampas partem de uma coluna (o base da grelha) e só abrem a
    | partir de `sm` — mobile-first, acrescentar e não desfazer. Cinco e seis
    | métricas só passam a linha única em `xl`: a 1000px, seis colunas dão
    | ~118px de conteúdo por célula, menos do que um valor em euros a 24px
    | ocupa.
    */
    columns: {
      /** Empilha até `md` e a partir daí é uma linha só, seja qual for o número. */
      auto: 'md:grid-flow-col md:auto-cols-fr',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-2 lg:grid-cols-3',
      4: 'sm:grid-cols-2 lg:grid-cols-4',
      5: 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
      6: 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
    },
  },
  defaultVariants: { columns: 'auto' },
});

export type StatGroupProps = React.ComponentProps<'div'> & VariantProps<typeof grelha>;

export function StatGroup({ className, columns, children, ...props }: StatGroupProps) {
  return (
    /*
    | `className` fica na moldura, que é o que quem consome quer posicionar
    | (margem, largura). A grelha é interna e não se sobrepõe por fora.
    */
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface-1', className)} {...props}>
      <div className={grelha({ columns })}>{children}</div>
    </div>
  );
}
