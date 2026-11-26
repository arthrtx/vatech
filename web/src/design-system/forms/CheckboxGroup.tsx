'use client';

import { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Checkbox } from './Checkbox';

export type CheckboxGroupOption = {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

const grupo = cva('flex', {
  variants: {
    orientation: {
      vertical: 'flex-col gap-1',
      // Em ecrã pequeno volta a empilhar: opções lado a lado com 44px de alvo
      // não cabem em 320px sem partir a palavra ao meio.
      horizontal: 'flex-col gap-1 md:flex-row md:flex-wrap md:gap-4',
    },
  },
  defaultVariants: { orientation: 'vertical' },
});

export type CheckboxGroupProps = Omit<
  React.ComponentProps<'div'>,
  'onChange' | 'defaultValue' | 'children'
> &
  VariantProps<typeof grupo> & {
    options: readonly CheckboxGroupOption[];
    value?: readonly string[];
    defaultValue?: readonly string[];
    onValueChange?: (value: string[]) => void;
    /** Nome do campo em submissão de formulário. Cada caixa envia o seu `value`. */
    name?: string;
    disabled?: boolean;
  };

/**
 * Várias caixas de selecção que respondem por um único valor: uma lista de
 * strings.
 *
 * É `role="group"` e não `radiogroup`: as setas não navegam entre caixas de
 * selecção — cada uma é um alvo de Tab próprio, porque são independentes.
 * Quem precisa de um nome visível para o conjunto envolve-o num `Fieldset`.
 *
 * ⚠ E é `group` só quando TEM nome. Um agrupamento sem nome acessível não é
 * uma ajuda, é ruído: quem navega por marcos ouve «grupo» e não fica a saber
 * de quê. No formulário das fichas de linha de comandos aparecia um
 * `group ""` encostado ao `group "Âmbitos"` do `Fieldset` à volta — dois
 * agrupamentos para uma única lista, e o que tinha o nome era o de fora.
 *
 * Sem `aria-label` nem `aria-labelledby`, este componente não anuncia
 * agrupamento nenhum: o nome vem do `Fieldset`, que é onde é visível. Com um
 * deles, o papel volta — é a via para quem usa a lista fora de um `Fieldset`.
 */
export function CheckboxGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled = false,
  orientation,
  className,
  ...props
}: CheckboxGroupProps) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState<string[]>(() => [...(defaultValue ?? [])]);
  const escolhidos = controlado ? value : interno;

  function alternar(opcao: string, marcado: boolean) {
    const proximo = marcado
      ? [...escolhidos, opcao]
      : escolhidos.filter((v) => v !== opcao);

    if (!controlado) setInterno(proximo);
    onValueChange?.(proximo);
  }

  const temNome =
    props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined;

  return (
    <div
      role={temNome ? 'group' : undefined}
      className={cn(grupo({ orientation }), className)}
      {...props}
    >
      {options.map((opcao) => (
        <Checkbox
          key={opcao.value}
          name={name}
          value={opcao.value}
          label={opcao.label}
          description={opcao.description}
          disabled={disabled || opcao.disabled}
          checked={escolhidos.includes(opcao.value)}
          onCheckedChange={(estado) => alternar(opcao.value, estado === true)}
        />
      ))}
    </div>
  );
}
