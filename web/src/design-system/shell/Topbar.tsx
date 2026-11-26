import { cn } from '../lib/cn';

export type TopbarProps = React.ComponentProps<'header'> & {
  /** Extremo esquerdo — normalmente o `MobileNav` ou um botão de voltar. */
  leading?: React.ReactNode;
  /** Extremo direito — acções, pesquisa, `ThemeToggle`, `UserMenu`. */
  actions?: React.ReactNode;
};

/**
 * Barra superior do conteúdo: título ou breadcrumb à esquerda, acções à
 * direita.
 *
 * Sticky em `--ds-z-nav`, a mesma camada da navegação do site — abaixo do
 * dropdown e do modal, de propósito: um menu aberto tem de passar por cima
 * da barra que o abriu.
 */
export function Topbar({ leading, actions, className, children, ...props }: TopbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--ds-z-nav)] flex min-h-touch-comfort items-center gap-3',
        'border-b border-line bg-rail px-gutter-mobile py-2 lg:px-gutter',
        className,
      )}
      {...props}
    >
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}

      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
