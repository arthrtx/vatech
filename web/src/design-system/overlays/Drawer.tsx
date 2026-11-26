'use client';

import { Dialog } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { BotaoFechar } from './internals';

const veu = [
  'fixed inset-0 z-[var(--ds-z-overlay)] bg-overlay',
  'opacity-100 transition-opacity duration-[var(--ds-motion-base)] ease-ds starting:opacity-0',
].join(' ');

/*
| Ao contrário do Modal, o painel não vive dentro do véu: está encostado a uma
| aresta e é ele próprio `fixed`. A entrada desliza da aresta de onde vem — um
| painel da direita que aparecesse com fade não diria de onde saiu.
|
| A largura lê o contentor de formulário (620px), que é o caso de uso real de
| uma gaveta lateral: um formulário ou uma ficha de detalhe.
| TODO: token em falta: --ds-drawer-w
*/
const painel = cva(
  [
    'fixed z-[var(--ds-z-modal)] flex flex-col bg-surface-1 shadow-float-lg',
    'translate-x-0 translate-y-0 opacity-100',
    'transition-[translate,opacity] duration-[var(--ds-motion-panel)] ease-ds',
    'pb-[env(safe-area-inset-bottom)]',
  ],
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-dvh w-full max-w-(--container-form) rounded-l-xl starting:translate-x-full',
        left: 'inset-y-0 left-0 h-dvh w-full max-w-(--container-form) rounded-r-xl starting:-translate-x-full',
        // Folha inferior: cresce com o conteúdo, mas nunca até tapar o topo.
        bottom:
          'inset-x-0 bottom-0 max-h-[calc(100dvh-var(--ds-space-12))] w-full rounded-t-2xl starting:translate-y-full',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export type DrawerProps = Omit<React.ComponentProps<typeof Dialog.Root>, 'children'> &
  VariantProps<typeof painel> & {
    /** Obrigatório: é o que o leitor de ecrã anuncia ao abrir o painel. */
    title: string;
    description?: string;
    trigger?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
  };

/**
 * Painel que entra por uma aresta do ecrã.
 *
 * `right`/`left` para navegação secundária, filtros e fichas de detalhe;
 * `bottom` para o mesmo trabalho no telemóvel, onde uma gaveta lateral só
 * mostra metade do que tem dentro. A variante `bottom` traz pega visível —
 * é a única pista de que aquilo é uma folha e não uma página.
 */
export function Drawer({
  title,
  description,
  trigger,
  footer,
  side = 'right',
  className,
  children,
  ...props
}: DrawerProps) {
  const semDescricao = description ? {} : { 'aria-describedby': undefined };

  return (
    <Dialog.Root {...props}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}

      <Dialog.Portal>
        <Dialog.Overlay className={veu} />
        <Dialog.Content {...semDescricao} className={cn(painel({ side }), className)}>
          {side === 'bottom' ? (
            /*
            | Pega. Decorativa para quem lê o ecrã (o painel já se anuncia pelo
            | título) mas essencial para quem vê: diz que aquilo se arrasta.
            */
            <div
              aria-hidden="true"
              className="mx-auto mt-3 h-1 w-(--ds-space-9) shrink-0 rounded-pill bg-line-strong"
            />
          ) : null}

          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-md font-semibold text-text-1">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-text-2">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <BotaoFechar aria-label={`Fechar: ${title}`} className="-mr-2" />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 text-md text-text-2">
            {children}
          </div>

          {footer ? (
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
