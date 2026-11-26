import { Skeleton } from './Skeleton';
import { cn } from '../lib/cn';

export type TableSkeletonProps = React.ComponentProps<'tr'> & {
  /** Colunas da tabela — tem de bater com o cabeçalho, senão a grelha desalinha. */
  columns: number;
  /** Linhas fantasma. Aproximar do tamanho habitual da página evita o salto ao carregar. */
  rows?: number;
};

/**
 * Carregamento DENTRO da tabela. Ocupa o espaço que os dados vão ocupar, com
 * o cabeçalho já de pé — o utilizador lê as colunas enquanto espera e a página
 * não salta quando os dados chegam.
 */
export function TableSkeleton({ className, columns, rows = 5, ...props }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, linha) => (
        <tr key={linha} className={cn(className)} {...props}>
          {Array.from({ length: columns }, (_, coluna) => (
            <td key={coluna} className="px-4 py-3">
              {/*
                | Só a primeira célula da primeira linha anuncia. Um `role="status"`
                | por célula faria o leitor de ecrã repetir "a carregar" 20 vezes.
              */}
              {linha === 0 && coluna === 0 ? (
                <span role="status" className="ds-sr-only">
                  A carregar dados da tabela
                </span>
              ) : null}
              {/* Larguras desiguais: uma coluna de blocos idênticos lê-se como grelha, não como texto. */}
              <Skeleton shape="line" className={coluna === 0 ? 'w-3/4' : 'w-1/2'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
