'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

export type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, 'children'> & {
  /** Texto do que o interruptor liga. É ele que dá o nome acessível. */
  label: React.ReactNode;
  /** Segunda linha, para a consequência de ligar. */
  description?: React.ReactNode;
};

/**
 * Interruptor de ligar/desligar.
 *
 * ⚠ Só para efeito **imediato e reversível** — notificações, modo escuro,
 * mostrar arquivados. Nunca para uma acção que precise de confirmação: um
 * interruptor promete que o estado mudou no momento em que se toca, e uma
 * caixa de diálogo a seguir quebra essa promessa. Isso é um `Button`.
 *
 * Também não serve num formulário que só se aplica ao carregar em "Guardar" —
 * aí a pergunta é binária mas o efeito é diferido, e a peça certa é o
 * `Checkbox`.
 */
export function Switch({ label, description, className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        'group flex w-full min-h-touch items-center justify-between gap-4 rounded-md px-2 py-2 text-left',
        'transition-colors duration-[var(--ds-motion-base)] ease-ds',
        'hover:bg-wash',
        'disabled:cursor-not-allowed disabled:bg-transparent',
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base text-text-1 group-disabled:text-text-3">{label}</span>
        {description ? (
          <span className="text-sm text-text-2 group-disabled:text-text-3">{description}</span>
        ) : null}
      </span>

      {/*
        | Calha de 44px (`w-touch`) com botão de 20px e 2px de folga de cada
        | lado: sobra exactamente o percurso de 20px do `translate-x-5`. Mudar
        | um dos três números obriga a refazer a conta.
        |
        | O estado não é dado só pela cor da calha — o botão está à esquerda ou
        | à direita, e a posição lê-se sem distinguir cores.
      */}
      <span
        className={cn(
          'flex h-6 w-touch shrink-0 items-center rounded-pill bg-surface-3 p-0.5',
          'transition-colors duration-[var(--ds-motion-base)] ease-ds',
          'group-data-[state=checked]:bg-accent',
          'group-disabled:bg-surface-2',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'size-5 rounded-pill bg-surface-1 shadow-surface',
            'transition-transform duration-[var(--ds-motion-base)] ease-ds',
            'data-[state=checked]:translate-x-5',
          )}
        />
      </span>
    </SwitchPrimitive.Root>
  );
}
