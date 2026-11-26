'use client';

import { useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';
import { Input, type InputProps } from './Input';

export type SearchInputProps = Omit<InputProps, 'leading' | 'trailing' | 'type'> & {
  /** Chamado ao limpar o campo. Em uso controlado é aqui que se põe o valor a vazio. */
  onClear?: () => void;
  /**
   * Nome acessível do botão de limpar — vai directo ao `aria-label` do botão.
   *
   * Tem prop própria porque o `aria-label` que o componente recebe nomeia o
   * **campo**, não o botão lá dentro. E chama-se `clearAriaLabel`, não
   * `clearLabel`, porque o nome acessível de um controlo só-ícone tem um único
   * nome no sistema: `aria-label`. O `label` do `Checkbox` é outra coisa —
   * texto visível.
   */
  clearAriaLabel?: string;
};

/**
 * Campo de pesquisa.
 *
 * `type="search"` já expõe `role="searchbox"` à tecnologia de apoio — repetir
 * o `role` à mão é ruído e uma das formas mais comuns de partir ARIA.
 *
 * **O atraso (debounce) fica de fora de propósito.** Quem pesquisa sabe se
 * está a filtrar uma lista em memória (sem atraso) ou a bater numa API (300ms);
 * um valor fixo aqui seria errado em metade dos casos. O `onChange` dispara a
 * cada tecla, como um input normal.
 */
export function SearchInput({
  onClear,
  clearAriaLabel = 'Limpar pesquisa',
  placeholder = 'Pesquisar…',
  className,
  onChange,
  value,
  defaultValue,
  ...props
}: SearchInputProps) {
  const campo = useRef<HTMLInputElement>(null);
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(() => String(defaultValue ?? ''));
  const actual = controlado ? String(value ?? '') : interno;

  function aoMudar(evento: React.ChangeEvent<HTMLInputElement>) {
    if (!controlado) setInterno(evento.target.value);
    onChange?.(evento);
  }

  function limpar() {
    if (!controlado) setInterno('');
    onClear?.();
    // O foco volta ao campo: quem limpou quer escrever outra coisa, e sem isto
    // o foco ficava num botão que acabou de desaparecer.
    campo.current?.focus();
  }

  return (
    <Input
      {...props}
      ref={campo}
      type="search"
      placeholder={placeholder}
      value={actual}
      onChange={aoMudar}
      className={className}
      leading={<Icone de={ICONES.procurar} medida="md" />}
      trailing={
        actual ? (
          <button
            type="button"
            onClick={limpar}
            disabled={props.disabled}
            aria-label={clearAriaLabel}
            className={cn(
              /*
                | 44px de alvo, WCAG 2.5.5. A margem negativa devolve à caixa
                | metade do `px` que o botão come — sem ela o botão encosta ao
                | texto e sobra ar a mais na direita.
                |
                | Em desktop a caixa `md` tem 40px de altura e este botão tem
                | 44: é a caixa que cresce, porque a altura é `min-h` e não `h`.
                | Preferimos o campo com 44px a um alvo que não se acerta.
              */
              'flex min-h-touch min-w-touch -mr-2 items-center justify-center rounded-md text-text-2',
              'transition-colors duration-[var(--ds-motion-base)] ease-ds',
              'hover:bg-wash hover:text-text-1',
              'disabled:cursor-not-allowed disabled:text-text-3',
            )}
          >
            <Icone de={ICONES.fechar} medida="md" />
          </button>
        ) : null
      }
    />
  );
}
