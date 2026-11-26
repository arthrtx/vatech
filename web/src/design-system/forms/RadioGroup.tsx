'use client';

import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

export type RadioOption = {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

export type RadioGroupProps = Omit<
  React.ComponentProps<typeof RadioGroupPrimitive.Root>,
  'children'
> & {
  options: readonly RadioOption[];
};

/**
 * Escolha de uma opção entre várias.
 *
 * O grupo inteiro é um único alvo de Tab e as setas movem a escolha entre as
 * opções — comportamento nativo dos radios, que o Radix reproduz. Por isso é
 * que não se substitui um grupo de radios por vários botões.
 *
 * Cada opção é a linha toda, pela mesma razão do `Checkbox`: o Radix renderiza
 * um `<button>`, a que um `<label htmlFor>` não se consegue ligar.
 */
export function RadioGroup({ options, className, orientation, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      {...props}
      orientation={orientation}
      className={cn(
        'flex flex-col gap-1',
        // Horizontal só a partir do tablet — em telemóvel opções lado a lado
        // com 44px de alvo não cabem.
        orientation === 'horizontal' && 'md:flex-row md:flex-wrap md:gap-4',
        className,
      )}
    >
      {options.map((opcao) => (
        <RadioGroupPrimitive.Item
          key={opcao.value}
          value={opcao.value}
          disabled={opcao.disabled}
          className={cn(
            'group flex w-full min-h-touch items-start gap-3 rounded-md px-2 py-2 text-left',
            'transition-colors duration-[var(--ds-motion-base)] ease-ds',
            'hover:bg-wash',
            'disabled:cursor-not-allowed disabled:bg-transparent',
          )}
        >
          {/*
            | Contorno em `text-3` pela razão que está no `Checkbox` e, por
            | inteiro, no `Input`: `line-strong` dava 1.49:1 no claro e 1.76:1
            | no escuro contra o interior do círculo, e a WCAG 1.4.11 pede 3:1.
            | Com `text-3` o token mede 5.92:1 e 6.18:1; no pixel composto, o
            | valor lido na tangente do círculo desce para 4.81:1 e 5.25:1,
            | porque aí o contorno está meio coberto pelo suavizado — e mesmo
            | esse chão fica muito acima de 3:1.
          */}
          <span
            className={cn(
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill border border-text-3 bg-surface-1',
              'transition-colors duration-[var(--ds-motion-base)] ease-ds',
              'group-data-[state=checked]:border-accent',
              'group-disabled:border-line group-disabled:bg-surface-3',
            )}
          >
            {/*
              | O ponto interior é um elemento a mais, e não um `background` do
              | círculo, porque assim o estado escolhido lê-se pela forma —
              | círculo cheio vs. círculo vazio — e não só pela cor.
            */}
            <RadioGroupPrimitive.Indicator className="block size-2.5 rounded-pill bg-accent group-disabled:bg-text-3" />
          </span>

          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-base text-text-1 group-disabled:text-text-3">{opcao.label}</span>
            {opcao.description ? (
              <span className="text-sm text-text-2 group-disabled:text-text-3">{opcao.description}</span>
            ) : null}
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
