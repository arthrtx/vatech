'use client';

import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

const botao = cva(
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md px-3 text-sm transition-colors duration-[var(--ds-motion-base)] ease-ds disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:bg-transparent',
  {
    variants: {
      current: {
        /*
        | A página actual leva chapa E negrito. Só a chapa seria estado por cor;
        | e o `aria-current` garante que quem ouve a página também o sabe.
        */
        true: 'bg-accent font-bold text-on-accent',
        false: 'font-medium text-text-2 hover:bg-wash hover:text-text-1',
      },
    },
    defaultVariants: { current: false },
  },
);

export type PaginationProps = Omit<React.ComponentProps<'nav'>, 'onChange' | 'children'> & {
  /** Página actual, a contar de 1. */
  page: number;
  /** Total de páginas. */
  totalPages: number;
  /** Chamado com a página pedida. Já vem limitada ao intervalo válido. */
  onPageChange: (pagina: number) => void;
  /** Páginas visíveis de cada lado da actual. */
  siblings?: number;
};

export function Pagination({
  className,
  page,
  totalPages,
  onPageChange,
  siblings = 1,
  'aria-label': ariaLabel = 'Paginação',
  ...props
}: PaginationProps) {
  const actual = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const itens = intervalo(actual, totalPages, siblings);

  return (
    <nav aria-label={ariaLabel} className={cn('flex items-center justify-between gap-2', className)} {...props}>
      <button
        type="button"
        disabled={actual <= 1}
        onClick={() => onPageChange(actual - 1)}
        className={botao({ current: false })}
      >
        <Icone de={ICONES.anterior} medida="sm" />
        Anterior
      </button>

      {/*
        | Em telemóvel não há espaço para uma fila de páginas de 44px cada:
        | colapsa para a posição em texto. `role="status"` porque, sem os botões
        | de página, passa a ser a única coisa que anuncia a mudança.
      */}
      <p role="status" className="ds-tabular text-sm text-text-2 md:hidden">
        {actual} de {totalPages}
      </p>

      <ul className="hidden items-center gap-1 md:flex">
        {itens.map((item, indice) =>
          item === 'gap' ? (
            <li key={'intervalo-' + indice} aria-hidden="true" className="px-1 text-sm text-text-3">
              &hellip;
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-current={item === actual ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(botao({ current: item === actual }), 'ds-tabular')}
              >
                <span className="ds-sr-only">Página </span>
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        disabled={actual >= totalPages}
        onClick={() => onPageChange(actual + 1)}
        className={botao({ current: false })}
      >
        Seguinte
        <Icone de={ICONES.seguinte} medida="sm" />
      </button>
    </nav>
  );
}

/**
 * Páginas a mostrar: sempre a primeira e a última, a actual e as vizinhas, e
 * `gap` onde houver salto. Sem isto, mil páginas dão mil botões.
 */
function intervalo(actual: number, total: number, vizinhas: number): (number | 'gap')[] {
  const paginas = new Set<number>();
  paginas.add(1);
  if (total >= 1) paginas.add(total);
  for (let p = actual - vizinhas; p <= actual + vizinhas; p++) {
    if (p >= 1 && p <= total) paginas.add(p);
  }

  const saida: (number | 'gap')[] = [];
  let anterior = 0;
  for (const p of [...paginas].sort((a, b) => a - b)) {
    if (anterior > 0 && p - anterior > 1) saida.push('gap');
    saida.push(p);
    anterior = p;
  }
  return saida;
}
