'use client';

import { Tabs as RadixTabs } from 'radix-ui';
import { cn } from '../lib/cn';

/*
| Separadores. A mecânica é do Radix — setas do teclado, roving tabindex,
| `aria-selected` e a ligação entre separador e painel. É detalhe demasiado
| fácil de errar à mão, e não é onde o sistema acrescenta valor.
*/

export type TabsProps = React.ComponentProps<typeof RadixTabs.Root>;

export function Tabs({ className, ...props }: TabsProps) {
  return <RadixTabs.Root className={cn('w-full', className)} {...props} />;
}

export type TabsListProps = React.ComponentProps<typeof RadixTabs.List>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    /*
    | Rola na horizontal em ecrã estreito. O `p-1` não é decoração: o anel de
    | foco desenha-se com `outline-offset`, ou seja, FORA da caixa — sem esta
    | folga o contentor que rola corta-o, e quem navega por teclado deixa de
    | ver onde está.
    */
    <RadixTabs.List
      className={cn('flex gap-1 overflow-x-auto border-b border-line p-1', className)}
      {...props}
    />
  );
}

export type TabsTriggerProps = React.ComponentProps<typeof RadixTabs.Trigger>;

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'relative inline-flex min-h-touch shrink-0 items-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap',
        'text-text-2 transition-colors duration-[var(--ds-motion-base)] ease-ds hover:text-text-1',
        'disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:text-text-3',
        /*
        | O separador activo distingue-se por três coisas: peso, tinta e a barra
        | por baixo. A barra é a que sobrevive a um ecrã sem cor.
        */
        'data-[state=active]:font-bold data-[state=active]:text-text-1',
        'after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-pill after:bg-transparent',
        'data-[state=active]:after:bg-accent',
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = React.ComponentProps<typeof RadixTabs.Content>;

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <RadixTabs.Content className={cn('pt-6', className)} {...props} />;
}
