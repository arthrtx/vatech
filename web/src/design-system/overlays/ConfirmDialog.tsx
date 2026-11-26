'use client';

import { useRef } from 'react';
import { AlertDialog } from 'radix-ui';
import { cn } from '../lib/cn';
import { Button } from '../primitives';
import { IconeCritico } from './internals';

/*
| Assenta em AlertDialog e não em Dialog. A diferença não é cosmética: o
| AlertDialog usa role="alertdialog", não fecha ao clicar fora nem por
| distracção, e leva o foco inicial ao botão de cancelar. Uma confirmação de
| acção irreversível que fechasse com um clique ao lado estaria a resolver o
| problema errado.
|
| Os botões são o `Button` do sistema, importados. A cópia isolada via registry
| — a razão pela qual já estiveram desenhados aqui — resolve-se declarando
| `src/primitives/Button.tsx` em `depende_de`: uma cópia com botões próprios
| divergia à primeira alteração, e divergiu (perdeu a sombra `ds-press`, ficou
| um degrau abaixo no tamanho de texto e não anunciava `aria-busy`).
*/

export type ConfirmDialogProps = Omit<
  React.ComponentProps<typeof AlertDialog.Root>,
  'children'
> & {
  /** O que vai acontecer, em título. Ex.: "Apagar o projecto Pink Store?" */
  title: string;
  /** A consequência, em texto corrido. É aqui que se diz o que não volta atrás. */
  description: string;
  /**
   * Etiqueta do botão que confirma. **Repete o verbo da acção** — "Apagar
   * projecto", "Cancelar subscrição". Nunca "OK" nem "Sim": num diálogo lido
   * em diagonal, "OK" não diz o que se está a autorizar.
   */
  confirmLabel: string;
  /** Etiqueta da saída segura. */
  cancelLabel?: string;
  onConfirm?: () => void;
  /** Acção em curso: tranca os dois botões e mostra o disco de espera. */
  isLoading?: boolean;
  trigger?: React.ReactNode;
  className?: string;
};

const ETIQUETAS_VAZIAS = /^(ok|sim|confirmar|continuar|aceitar)$/i;

/**
 * Confirmação de acção irreversível.
 *
 * O foco abre no botão seguro, não no destrutivo: quem carrega em `Enter` por
 * reflexo cancela, não apaga.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  isLoading = false,
  trigger,
  className,
  ...props
}: ConfirmDialogProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  /*
  | Guarda de desenvolvimento. O erro de escrever "OK" aqui não parte nada —
  | passa o build, passa o typecheck, e só se paga quando alguém apaga o
  | projecto errado.
  */
  if (process.env.NODE_ENV !== 'production' && ETIQUETAS_VAZIAS.test(confirmLabel.trim())) {
    console.warn(
      `[ConfirmDialog] confirmLabel="${confirmLabel}" não diz o que vai acontecer. Repete o verbo da acção, ex.: "Apagar projecto".`,
    );
  }

  return (
    <AlertDialog.Root {...props}>
      {trigger ? <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger> : null}

      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className={cn(
            'fixed inset-0 z-[var(--ds-z-overlay)] bg-overlay',
            'flex items-end justify-center overflow-y-auto pt-(--ds-space-10) sm:items-center sm:p-6',
            'opacity-100 transition-opacity duration-[var(--ds-motion-base)] ease-ds starting:opacity-0',
          )}
        >
          <AlertDialog.Content
            onOpenAutoFocus={(evento) => {
              // O Radix já foca o primeiro elemento; explicitar o botão seguro
              // deixa de depender da ordem em que o rodapé for escrito.
              evento.preventDefault();
              cancelarRef.current?.focus();
            }}
            className={cn(
              'relative z-[var(--ds-z-modal)] flex w-full flex-col bg-surface-1 shadow-float-lg',
              'rounded-t-2xl sm:max-w-(--container-form) sm:rounded-xl',
              'pb-[env(safe-area-inset-bottom)] sm:pb-0',
              'translate-y-0 opacity-100 transition-[translate,opacity] duration-[var(--ds-motion-slow)] ease-ds',
              'starting:translate-y-8 starting:opacity-0',
              className,
            )}
          >
            <div className="flex gap-4 px-6 pt-6">
              {/* O ícone é o segundo sinal: o tom crítico não pode viver só na cor. */}
              <IconeCritico className="mt-0.5 text-critical-ink" />
              <div className="min-w-0">
                <AlertDialog.Title className="text-md font-semibold text-balance text-text-1">
                  {title}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-text-2">
                  {description}
                </AlertDialog.Description>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 px-6 py-6 sm:flex-row sm:justify-end">
              {/* `tone="neutral"`: a saída segura não compete com a acção destrutiva. */}
              <AlertDialog.Cancel asChild>
                <Button ref={cancelarRef} variant="outline" tone="neutral" disabled={isLoading}>
                  {cancelLabel}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button tone="critical" isLoading={isLoading} onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
