'use client';

import { createContext, useContext } from 'react';
import { cn } from '../lib/cn';

type EstadoSidebar = { collapsed: boolean };

const ContextoSidebar = createContext<EstadoSidebar>({ collapsed: false });

/**
 * Lê o estado da barra lateral que está por cima.
 *
 * Existe para o `SidebarItem` e o `SidebarGroup` saberem se estão colapsados
 * sem que quem escreve a navegação tenha de repetir `collapsed` em cada linha
 * — repetido em vinte itens, basta esquecer um para a coluna ficar torta.
 */
export function useSidebar(): EstadoSidebar {
  return useContext(ContextoSidebar);
}

export type SidebarProps = React.ComponentProps<'aside'> & {
  /** Mostra só os ícones. O rótulo continua a existir para leitor de ecrã. */
  collapsed?: boolean;
  /** Topo fixo: marca, selector de projecto, botão de colapsar. */
  header?: React.ReactNode;
  /** Rodapé fixo: conta, versão, estado do sistema. */
  footer?: React.ReactNode;
};

/**
 * Barra lateral da aplicação.
 *
 * Sticky com altura de ecrã e scroll próprio: uma navegação longa rola dentro
 * da barra e não arrasta o conteúdo. Abaixo de `lg` desaparece por completo —
 * não encolhe, não vira gaveta: o padrão do telemóvel é o `MobileNav`.
 *
 * A transição de largura contraria a regra geral de só animar `transform` e
 * `opacity`, e é a excepção prevista no sistema: `--ds-motion-ease-spring` foi
 * medida exactamente nesta transição. Colapsar sem movimento nenhum faz o
 * conteúdo ao lado saltar.
 */
export function Sidebar({
  collapsed = false,
  header,
  footer,
  className,
  children,
  ...props
}: SidebarProps) {
  return (
    <ContextoSidebar.Provider value={{ collapsed }}>
      <aside
        data-collapsed={collapsed || undefined}
        className={cn(
          'hidden shrink-0 border-line bg-rail',
          'lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:overscroll-contain lg:border-r',
          'transition-[width] duration-[var(--ds-motion-slow)] ease-spring',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          className,
        )}
        {...props}
      >
        {header ? (
          <div
            className={cn(
              'flex min-h-touch-comfort shrink-0 items-center border-b border-line py-3',
              collapsed ? 'justify-center px-2' : 'px-4',
            )}
          >
            {header}
          </div>
        ) : null}

        <div className={cn('flex-1 py-4', collapsed ? 'px-2' : 'px-3')}>{children}</div>

        {footer ? (
          <div
            className={cn(
              'shrink-0 border-t border-line py-3',
              collapsed ? 'px-2' : 'px-3',
            )}
          >
            {footer}
          </div>
        ) : null}
      </aside>
    </ContextoSidebar.Provider>
  );
}
