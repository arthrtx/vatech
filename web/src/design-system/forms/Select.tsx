'use client';

import { Select as SelectPrimitive } from 'radix-ui';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';
import { controlBase } from './Input';
import { useFieldControl } from './Field';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<React.ComponentProps<typeof SelectPrimitive.Root>, 'children'> &
  Pick<VariantProps<typeof controlBase>, 'size' | 'invalid'> & {
    options: readonly SelectOption[];
    /** Texto quando nada está escolhido. Não substitui a label do `Field`. */
    placeholder?: string;
    className?: string;
    /** Nome acessível quando o select não vive dentro de um `Field`. */
    'aria-label'?: string;
  };

/**
 * Escolha de um valor de uma lista, construída sobre o Radix Select.
 *
 * O `<select>` nativo não aceita estilo consistente entre browsers — o painel
 * aberto é desenhado pelo sistema operativo e ignora tudo o que aqui está. Em
 * troca, esta versão precisa de JavaScript e de um portal.
 *
 * Em formulários simples, e sobretudo em telemóvel, o `NativeSelect` é melhor:
 * o selector nativo do iOS e do Android é mais rápido de usar do que qualquer
 * lista que se desenhe.
 */
export function Select({
  options,
  placeholder = 'Escolher…',
  className,
  size,
  invalid,
  'aria-label': ariaLabel,
  ...props
}: SelectProps) {
  const { invalid: invalido, ...ligacao } = useFieldControl({
    'aria-invalid': invalid ? true : undefined,
    required: props.required,
  });

  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        id={ligacao.id}
        aria-describedby={ligacao['aria-describedby']}
        aria-invalid={ligacao['aria-invalid']}
        aria-label={ariaLabel}
        className={cn(
          controlBase({ size, invalid: invalido, disabled: props.disabled === true }),
          'flex items-center justify-between gap-3 text-left',
          // Sem valor escolhido, o texto é do nível auxiliar — como um placeholder.
          'data-[placeholder]:text-text-3',
          'disabled:cursor-not-allowed disabled:text-text-3',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <Icone de={ICONES.expandir} medida="md" className="text-text-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          /*
          | Camada `popover` e não `dropdown`: a lista vai para o <body> por
          | portal, e quando o select vive num Modal o véu dele (80) ficava por
          | cima dos 60 do dropdown — a lista via-se e o clique caía no véu.
          */
          position="popper"
          /* 4px = --ds-space-1. O Radix pede um número; não aceita var(). */
          sideOffset={4}
          className={cn(
            'z-[var(--ds-z-popover)] overflow-hidden rounded-lg border border-line bg-surface-1 shadow-float',
            // A lista nasce com a largura do gatilho e nunca passa do espaço
            // que há até ao fundo da janela — ambas as medidas vêm do Radix.
            'min-w-(--radix-select-trigger-width)',
            'max-h-(--radix-select-content-available-height)',
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center bg-surface-1 text-text-3">
            <Icone de={ICONES.recolher} medida="md" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {options.map((opcao) => (
              <SelectPrimitive.Item
                key={opcao.value}
                value={opcao.value}
                disabled={opcao.disabled}
                className={cn(
                  'flex min-h-touch cursor-default items-center gap-3 rounded-md px-3 text-base text-text-1 select-none',
                  /*
                    | `outline-hidden` e não `outline-none`: no Tailwind v4 não
                    | são sinónimos. O segundo põe `outline-style: none` e o
                    | item também deixa de ter contorno em modo de cores
                    | forçadas; este deixa um contorno transparente que
                    | sobrevive ao `forced-colors`. O realce visível vem do
                    | `data-[highlighted]`, gerido pelo Radix.
                  */
                  'data-[highlighted]:bg-wash data-[highlighted]:outline-hidden',
                  'data-[state=checked]:bg-accent-wash data-[state=checked]:text-accent-ink data-[state=checked]:font-semibold',
                  'data-[disabled]:pointer-events-none data-[disabled]:text-text-3',
                )}
              >
                {/*
                  | Ranhura de largura fixa para o visto, ocupada ou não. Sem
                  | ela, a linha escolhida deslocava-se 16px em relação às
                  | outras — e o item escolhido distingue-se por visto E por
                  | peso, não só pela cor de fundo.
                */}
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Icone de={ICONES.visto} medida="md" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opcao.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center bg-surface-1 text-text-3">
            <Icone de={ICONES.expandir} medida="md" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
