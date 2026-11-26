'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

/** Direcção de ordenação de uma coluna. `null` = coluna ordenável, mas não ordenada. */
export type SortDirection = 'asc' | 'desc' | null;

/*
| O cabeçalho é um eyebrow: peso, tracking e tinta vêm de `.ds-eyebrow` e não
| de utilidades soltas. Só o tamanho desce um degrau (`text-xs`) — uma tabela
| densa não aguenta o eyebrow geral, e este é o único eixo que diverge.
*/
const cabecalhoDeColuna = cva(
  'ds-eyebrow border-b border-line bg-surface-2 px-4 py-3 align-middle text-xs',
  {
    variants: {
      align: { start: 'text-start', center: 'text-center', end: 'text-end' },
      numeric: { true: 'ds-tabular', false: '' },
    },
    defaultVariants: { align: 'start', numeric: false },
  },
);

export type TableHeaderCellProps = Omit<React.ComponentProps<'th'>, 'onClick'> &
  VariantProps<typeof cabecalhoDeColuna> & {
    /** Estado de ordenação desta coluna. Só passar em colunas ordenáveis. */
    sort?: SortDirection;
    /** Chamado com a direcção seguinte. A presença desta prop é o que torna a coluna ordenável. */
    onSortChange?: (proxima: Exclude<SortDirection, null>) => void;
  };

export function TableHeaderCell({
  className,
  align,
  numeric,
  sort,
  onSortChange,
  children,
  ...props
}: TableHeaderCellProps) {
  const alinhamento = align ?? (numeric ? 'end' : 'start');

  if (!onSortChange) {
    return (
      <th
        scope="col"
        className={cn(cabecalhoDeColuna({ align: alinhamento, numeric }), className)}
        {...props}
      >
        {children}
      </th>
    );
  }

  /*
  | `aria-sort` vai no `th` e não no botão: é a célula que é a coluna. O leitor
  | de ecrã anuncia "ordenado ascendente" ao entrar na coluna, sem depender de
  | ver a seta — o ícone é reforço visual, não a informação.
  */
  const ariaSort = sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none';

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(cabecalhoDeColuna({ align: alinhamento, numeric }), 'p-0', className)}
      {...props}
    >
      {/*
        | O botão ocupa a célula toda (o padding passa do `th` para ele) para o
        | alvo táctil ser a coluna inteira e não só as letras.
      */}
      <button
        type="button"
        onClick={() => onSortChange(sort === 'asc' ? 'desc' : 'asc')}
        className={cn(
          'ds-eyebrow flex min-h-touch w-full items-center gap-2 px-4 py-3 text-xs',
          'transition-colors duration-[var(--ds-motion-base)] ease-ds hover:bg-surface-3 hover:text-text-1',
          alinhamento === 'end' && 'justify-end',
          alinhamento === 'center' && 'justify-center',
        )}
      >
        <span>{children}</span>
        <IconeOrdenacao estado={sort ?? null} />
        <span className="ds-sr-only">
          {sort === 'asc'
            ? '(ordenado por ordem crescente — activar para inverter)'
            : sort === 'desc'
              ? '(ordenado por ordem decrescente — activar para inverter)'
              : '(activar para ordenar)'}
        </span>
      </button>
    </th>
  );
}

/**
 * Par de setas. A que está activa fica opaca — a inactiva desvanece em vez de
 * desaparecer, senão o cabeçalho muda de largura ao ordenar.
 *
 * Antes era um único SVG de 12×16 com dois triângulos preenchidos. O lucide é
 * de traço, não há um ícone "par de setas" no vocabulário — a peça mais
 * próxima é empilhar `paraCima`/`paraBaixo`, o que dá um bloco ligeiramente
 * mais alto que o triângulo duplo original. Vale olho humano.
 */
function IconeOrdenacao({ estado }: { estado: SortDirection }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 flex-col items-center justify-center gap-px">
      <Icone
        de={ICONES.paraCima}
        medida="sm"
        className={cn('size-2.5', estado === 'asc' ? 'opacity-100' : 'opacity-30')}
      />
      <Icone
        de={ICONES.paraBaixo}
        medida="sm"
        className={cn('size-2.5', estado === 'desc' ? 'opacity-100' : 'opacity-30')}
      />
    </span>
  );
}
