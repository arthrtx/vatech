'use client';

import { Tooltip as Radix } from 'radix-ui';
import { cn } from '../lib/cn';

/*
| ⚠ O tooltip NÃO existe em toque. Num telemóvel não há hover, e o `Tooltip`
| do Radix abre por foco de teclado — o que cobre quem navega por teclado mas
| não quem usa o dedo. Logo: só texto auxiliar. O nome de um ícone, o formato
| esperado de um campo, a data completa por trás de um "há 3 dias". Nunca a
| única via para uma instrução, um erro ou um valor de que se precise para
| decidir — para isso existe o Popover, que abre por clique.
*/

/**
 * Atraso antes de abrir. Espelha `--ds-motion-reveal` (400ms).
 *
 * É o único sítio do sistema onde uma duração aparece duas vezes: o Radix
 * quer um número em JavaScript e um token CSS não se lê de uma prop. Mudar
 * aqui obriga a mudar o token — e ao contrário.
 */
const ATRASO_ABERTURA_MS = 400;

export type TooltipProviderProps = React.ComponentProps<typeof Radix.Provider>;

/**
 * Vai uma vez na raiz da app. Sem ele o `Tooltip` rebenta em runtime, e é o que
 * partilha o temporizador entre todos — depois do primeiro, os seguintes abrem
 * de imediato enquanto o rato varre uma barra de ícones.
 */
export function TooltipProvider({ delayDuration = ATRASO_ABERTURA_MS, ...props }: TooltipProviderProps) {
  return <Radix.Provider delayDuration={delayDuration} {...props} />;
}

export type TooltipProps = Omit<React.ComponentProps<typeof Radix.Root>, 'children'> & {
  /** Texto auxiliar. Uma linha; se precisa de mais, não é um tooltip. */
  label: string;
  /** Lado preferido. O Radix vira-o sozinho se não couber. */
  side?: React.ComponentProps<typeof Radix.Content>['side'];
  className?: string;
  /** O controlo a que o tooltip se agarra. Tem de aceitar ref e eventos. */
  children: React.ReactNode;
};

export function Tooltip({ label, side = 'top', className, children, ...props }: TooltipProps) {
  return (
    <Radix.Root {...props}>
      <Radix.Trigger asChild>{children}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[var(--ds-z-tooltip)] max-w-(--container-form) rounded-md border border-line bg-surface-1 px-3 py-2',
            'text-xs text-text-1 shadow-float',
            'opacity-100 transition-opacity duration-[var(--ds-motion-fast)] ease-ds starting:opacity-0',
            className,
          )}
        >
          {label}
          <Radix.Arrow className="fill-surface-1" width={10} height={5} />
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
