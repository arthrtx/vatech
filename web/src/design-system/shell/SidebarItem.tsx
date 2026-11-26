'use client';

import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { useSidebar } from './Sidebar';

const ligacao = cva(
  'relative flex min-h-touch w-full items-center rounded-md text-sm transition-colors duration-[var(--ds-motion-base)] ease-ds',
  {
    variants: {
      active: {
        // Activo não é só cor: leva peso. Quem não distingue o accent do
        // texto continua a ver qual é a página actual.
        true: 'bg-accent-wash font-semibold text-accent-ink',
        false: 'font-medium text-text-2 hover:bg-wash hover:text-text-1',
      },
      collapsed: {
        true: 'justify-center px-2',
        false: 'gap-3 px-3',
      },
    },
    defaultVariants: { active: false, collapsed: false },
  },
);

export type SidebarItemProps = React.ComponentProps<'a'> & {
  /** Ícone à esquerda. É o que sobra quando a barra colapsa. */
  icon?: React.ReactNode;
  /** Página actual. Marca `aria-current="page"`. */
  active?: boolean;
  /** Contador — por ler, pendentes, em falta. */
  count?: number;
};

/**
 * Uma linha de navegação da barra lateral.
 *
 * Colapsada, o rótulo passa a `.ds-sr-only` em vez de desaparecer: um menu de
 * ícones sem nome acessível é ilegível para leitor de ecrã, e o `title` do
 * browser não conta — não aparece por teclado nem em toque.
 */
export function SidebarItem({
  icon,
  active = false,
  count,
  className,
  children,
  ...props
}: SidebarItemProps) {
  const { collapsed } = useSidebar();

  return (
    <li>
      <a
        aria-current={active ? 'page' : undefined}
        className={cn(ligacao({ active, collapsed }), className)}
        {...props}
      >
        {icon ? (
          <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
            {icon}
          </span>
        ) : null}

        <span className={collapsed ? 'ds-sr-only' : 'min-w-0 flex-1 truncate'}>{children}</span>

        {count !== undefined ? (
          <span
            className={cn(
              'ds-tabular inline-flex min-w-5 shrink-0 items-center justify-center rounded-pill px-1.5 text-2xs font-bold',
              active ? 'bg-accent text-on-accent' : 'bg-surface-3 text-text-2',
              // Colapsado não há linha onde pousar o contador — sobrepõe-se
              // ao canto do ícone, como um badge de notificação.
              collapsed && 'absolute top-1 right-1',
            )}
          >
            {count}
          </span>
        ) : null}
      </a>
    </li>
  );
}
