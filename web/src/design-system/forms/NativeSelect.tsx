'use client';

import { type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';
import { controlBase } from './Input';
import { useFieldControl } from './Field';
import type { SelectOption } from './Select';

export type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size' | 'children'> &
  Pick<VariantProps<typeof controlBase>, 'size' | 'invalid'> & {
    options: readonly SelectOption[];
    /** Primeira entrada, vazia e não escolhível. Omitir num campo sem estado inicial vazio. */
    placeholder?: string;
    /** Classes da caixa exterior. */
    className?: string;
  };

/**
 * `<select>` nativo com a caixa do sistema.
 *
 * É a escolha certa em telemóvel e em formulários longos: o selector do
 * sistema operativo abre mais depressa, funciona sem JavaScript e é o que o
 * utilizador já sabe usar. O `Select` do Radix só ganha quando o painel aberto
 * tem de ter desenho próprio (ícones, descrições, grupos).
 *
 * A seta é desenhada por nós porque `appearance-none` remove a nativa — e sem
 * `appearance-none` o campo não aceita a nossa altura em Safari.
 */
export function NativeSelect({
  options,
  placeholder,
  className,
  size,
  invalid,
  id,
  required,
  ...props
}: NativeSelectProps) {
  const { invalid: invalido, ...ligacao } = useFieldControl({
    id,
    'aria-describedby': props['aria-describedby'],
    'aria-invalid': invalid ? true : props['aria-invalid'],
    required,
  });

  return (
    <div className="relative">
      <select
        {...props}
        {...ligacao}
        className={cn(
          controlBase({
            size,
            invalid: invalido,
            disabled: props.disabled === true,
          }),
          // Espaço à direita para a seta: 40px, o degrau 9 da escala. Vai à
          // variável e não a um número porque acima do degrau 8 a escala do
          // Tailwind e a nossa deixam de coincidir.
          'appearance-none pr-(--ds-space-9)',
          'disabled:cursor-not-allowed disabled:text-text-3',
          className,
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opcao) => (
          <option key={opcao.value} value={opcao.value} disabled={opcao.disabled}>
            {opcao.label}
          </option>
        ))}
      </select>

      {/* `pointer-events-none` para o clique atravessar a seta e abrir o select. */}
      <Icone
        de={ICONES.expandir}
        medida="md"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-3"
      />
    </div>
  );
}
