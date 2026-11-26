import { cn } from '../lib/cn';

const linhas = {
  1: 'block truncate',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
} as const;

export type TruncateProps = Omit<React.ComponentProps<'span'>, 'children' | 'title'> & {
  /**
   * Texto puro, não nós. É preciso a string inteira para a pôr no `title` — e
   * `React.ReactNode` não se converte em texto de forma fiável.
   */
  children: string;
  /** Linhas antes de cortar. */
  lines?: keyof typeof linhas;
};

/**
 * Texto que corta com reticências e mantém o completo acessível.
 *
 * O corte é visual: o texto está inteiro no DOM, portanto continua a ser lido
 * por leitor de ecrã e encontrado pela pesquisa do browser. O `title` serve o
 * rato; não substitui um sítio onde o valor completo se veja — em rato-menos
 * (telemóvel) o `title` nunca aparece.
 */
export function Truncate({ className, children, lines = 1, ...props }: TruncateProps) {
  return (
    <span title={children} className={cn(linhas[lines], className)} {...props}>
      {children}
    </span>
  );
}
