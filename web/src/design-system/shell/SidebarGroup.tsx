'use client';

import { useId } from 'react';
import { cn } from '../lib/cn';
import { useSidebar } from './Sidebar';

export type SidebarGroupProps = React.ComponentProps<'li'> & {
  /** Título do grupo. Sai em eyebrow — maiúsculas e tracking largo. */
  title: string;
};

/**
 * Agrupa itens da barra lateral sob um título.
 *
 * O título liga-se à sub-lista por `aria-labelledby`, e não fica só por cima
 * dela: assim o leitor de ecrã anuncia "Administração, lista com 4 itens" e a
 * pessoa sabe onde entrou sem ter de percorrer o grupo inteiro.
 */
export function SidebarGroup({ title, className, children, ...props }: SidebarGroupProps) {
  const { collapsed } = useSidebar();
  const idTitulo = useId();

  return (
    <li className={cn('mt-5 first:mt-0', className)} {...props}>
      <p id={idTitulo} className={cn('mb-1', collapsed ? 'ds-sr-only' : 'ds-eyebrow px-3')}>
        {title}
      </p>

      {/*
        | Colapsada, sem título visível, os grupos fundiam-se numa coluna
        | contínua de ícones — a linha devolve a separação que o título dava.
      */}
      {collapsed ? <hr aria-hidden="true" className="mx-2 mb-2 border-line" /> : null}

      <ul aria-labelledby={idTitulo} className="flex flex-col gap-0.5">
        {children}
      </ul>
    </li>
  );
}
