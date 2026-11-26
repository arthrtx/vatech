'use client';

import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

export type CheckboxProps = Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, 'children'> & {
  /** Texto da opção. É ele que dá o nome acessível ao controlo. */
  label: React.ReactNode;
  /** Segunda linha, mais fraca, para a consequência da escolha. */
  description?: React.ReactNode;
};

/**
 * Caixa de selecção com etiqueta.
 *
 * A linha inteira é o botão — não uma caixa de 20px com um `<label htmlFor>` ao
 * lado. O `for` de uma label só liga a elementos de formulário nativos, e o
 * Radix renderiza um `<button>`: a label ficaria a apontar para nada e o alvo
 * táctil seria o quadradinho. Assim há um único alvo, com 44px de altura, e
 * clicar no texto funciona.
 *
 * Aceita `checked="indeterminate"` para o estado parcial de uma lista.
 */
export function Checkbox({ label, description, className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      {...props}
      className={cn(
        'group flex w-full min-h-touch items-start gap-3 rounded-md px-2 py-2 text-left',
        'transition-colors duration-[var(--ds-motion-base)] ease-ds',
        'hover:bg-wash',
        'disabled:cursor-not-allowed disabled:bg-transparent disabled:text-text-3',
        className,
      )}
    >
      {/*
        | `mt-0.5` alinha o quadrado com a primeira linha do texto: a caixa tem
        | 20px e a linha de corpo tem entrelinha de 1.7, logo o topo do texto
        | fica 2px abaixo.
      */}
      {/*
        | O contorno em repouso é `text-3`, e não `line-strong`, pela mesma
        | razão que no campo de texto — a nota longa está em `Input.tsx` e não
        | se repete aqui.
        |
        | O que NÃO se herdou por analogia foi o número: um controlo de
        | selecção tem 20px e o seu interior é `surface-1`, não `surface-2`,
        | por isso mediu-se de novo no pixel composto, com carga limpa por
        | tema — a caixa tem transição de cor, e trocar o tema e medir a
        | seguir devolve a cor anterior.
        |
        | Por marcar, o contorno mede-se contra o interior e contra a
        | superfície à volta, que são a mesma cor porque a caixa vive dentro
        | de um cartão `surface-1`:
        |     line-strong   1.49:1 claro · 1.76:1 escuro   (1.4.11 pede 3:1)
        |     text-3        5.92:1 claro · 6.18:1 escuro
        | Marcada, o contorno e o enchimento passam a `accent` e medem-se
        | contra a superfície: 5.39:1 claro e 4.79:1 escuro. Não se toca.
        |
        | A segunda metade do problema era de coerência, não de norma: no
        | mesmo formulário o campo de texto tinha contorno nítido e a caixa ao
        | lado quase não se via. Agora as duas pintam a mesma cor.
      */}
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs border border-text-3 bg-surface-1 text-on-accent',
          'transition-colors duration-[var(--ds-motion-base)] ease-ds',
          'group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent',
          'group-data-[state=indeterminate]:border-accent group-data-[state=indeterminate]:bg-accent',
          'group-disabled:border-line group-disabled:bg-surface-3',
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          {/*
            | Dois desenhos, um por estado: visto quando está marcada, traço
            | quando o estado é parcial. Sem o traço, "parcial" e "marcada"
            | distinguiam-se só pela ausência do visto — e ninguém repara.
          */}
          <Icone de={ICONES.visto} medida="sm" className="group-data-[state=indeterminate]:hidden" />
          <Icone de={ICONES.traco} medida="sm" className="hidden group-data-[state=indeterminate]:block" />
        </CheckboxPrimitive.Indicator>
      </span>

      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base text-text-1 group-disabled:text-text-3">{label}</span>
        {description ? (
          <span className="text-sm text-text-2 group-disabled:text-text-3">{description}</span>
        ) : null}
      </span>
    </CheckboxPrimitive.Root>
  );
}
