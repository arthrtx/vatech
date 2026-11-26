import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Tabela. Os elementos vivem todos neste ficheiro porque não são componentes
| independentes: um `TableRow` fora de um `Table` não é nada. O cabeçalho
| ordenável é a excepção e mora em TableHeaderCell.tsx — leva evento, logo leva
| 'use client', e não há razão para arrastar a tabela inteira para o cliente.
*/

export type TableProps = React.ComponentProps<'table'> & {
  /**
   * Classe do contentor que rola. O overflow é DELE, não da tabela: assim,
   * num telemóvel, é a tabela que rola na horizontal e nunca a página.
   * Também é aqui que se dá altura máxima quando se quer cabeçalho fixo.
   */
  containerClassName?: string;
};

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    /*
    | `min-w-0` não é redundante com `w-full`: dentro de um flex ou grid, o item
    | tem `min-width:auto` e cresce até caber o conteúdo — o overflow-x nunca
    | chega a entrar e quem rola passa a ser a página.
    */
    <div
      className={cn(
        'w-full min-w-0 overflow-x-auto rounded-lg border border-line bg-surface-1',
        containerClassName,
      )}
    >
      {/*
        | `border-separate` e não `border-collapse`: com bordas colapsadas, as
        | bordas do cabeçalho ficam para trás quando o `thead` é fixo.
      */}
      <table
        className={cn('w-full border-separate border-spacing-0 text-left text-sm', className)}
        {...props}
      />
    </div>
  );
}

const cabecalho = cva('bg-surface-2', {
  variants: {
    sticky: {
      /*
      | O `top-0` é relativo ao contentor que rola, não à página — só se cola
      | se o contentor tiver altura máxima. Ver `containerClassName`.
      */
      true: 'sticky top-0 z-[var(--ds-z-sticky)]',
      false: '',
    },
  },
  defaultVariants: { sticky: false },
});

export type TableHeadProps = React.ComponentProps<'thead'> & VariantProps<typeof cabecalho>;

export function TableHead({ className, sticky, ...props }: TableHeadProps) {
  return <thead className={cn(cabecalho({ sticky }), className)} {...props} />;
}

export type TableBodyProps = React.ComponentProps<'tbody'>;

export function TableBody({ className, ...props }: TableBodyProps) {
  return (
    /*
    | A linha divisória é desenhada aqui, uma vez, e não em cada célula: com
    | `border-separate` a borda tem de estar na célula (o `tr` não a pinta), e
    | a última linha fica de fora para não duplicar a borda do contentor.
    */
    <tbody
      className={cn('[&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-line', className)}
      {...props}
    />
  );
}

const linha = cva('transition-colors duration-[var(--ds-motion-base)] ease-ds', {
  variants: {
    state: {
      neutral: 'hover:bg-wash',
      /* Seleccionada: fundo + peso — o fundo sozinho é cor a fazer de estado. */
      selected: 'bg-accent-wash font-medium',
    },
  },
  defaultVariants: { state: 'neutral' },
});

export type TableRowProps = React.ComponentProps<'tr'> & VariantProps<typeof linha>;

export function TableRow({ className, state, ...props }: TableRowProps) {
  return <tr className={cn(linha({ state }), className)} {...props} />;
}

const celula = cva('px-4 py-3 align-middle text-text-2', {
  variants: {
    align: { start: 'text-start', center: 'text-center', end: 'text-end' },
    /* Números com largura fixa: sem isto os decimais saltam de linha para linha. */
    numeric: { true: 'ds-tabular text-text-1', false: '' },
    nowrap: { true: 'whitespace-nowrap', false: '' },
  },
  defaultVariants: { align: 'start', numeric: false, nowrap: false },
});

export type TableCellProps = React.ComponentProps<'td'> & VariantProps<typeof celula>;

export function TableCell({ className, align, numeric, nowrap, ...props }: TableCellProps) {
  return (
    /*
    | Número alinha à direita por omissão — é o que permite comparar ordens de
    | grandeza de relance. Passar `align` explícito continua a mandar.
    */
    <td
      className={cn(celula({ align: align ?? (numeric ? 'end' : 'start'), numeric, nowrap }), className)}
      {...props}
    />
  );
}
