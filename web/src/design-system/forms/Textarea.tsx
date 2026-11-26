'use client';

import { useEffect, useRef, useState } from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { controlBase } from './Input';
import { useFieldControl } from './Field';

export type TextareaProps = React.ComponentProps<'textarea'> &
  Pick<VariantProps<typeof controlBase>, 'size' | 'invalid'> & {
    /** Cresce com o conteúdo em vez de mostrar barra de deslocamento. */
    autoGrow?: boolean;
    /** Mostra o contador de caracteres. Com `maxLength`, mostra `usados/máximo`. */
    showCount?: boolean;
  };

/**
 * Campo de texto de várias linhas.
 *
 * `rows` continua a ser o que define a altura inicial — é nativo, funciona sem
 * JavaScript e não precisa de token nenhum.
 */
export function Textarea({
  className,
  size,
  invalid,
  autoGrow = false,
  showCount = false,
  rows = 4,
  id,
  required,
  ref,
  ...props
}: TextareaProps) {
  const { invalid: invalido, ...ligacao } = useFieldControl({
    id,
    'aria-describedby': props['aria-describedby'],
    'aria-invalid': invalid ? true : props['aria-invalid'],
    required,
  });

  const controlado = props.value !== undefined;
  const [interno, setInterno] = useState(() => String(props.defaultValue ?? ''));
  const valor = controlado ? String(props.value ?? '') : interno;

  const elemento = useRef<HTMLTextAreaElement>(null);

  /*
  | Auto-grow escreve uma altura em pixels no elemento. Não é uma medida de
  | desenho — é o resultado de uma medição feita no browser, e por isso não tem
  | token possível. A alternativa em CSS puro (`field-sizing: content`) ainda
  | não existe no Safari, que é onde isto mais interessa.
  |
  | O `height = 'auto'` antes de ler o `scrollHeight` é obrigatório: sem ele o
  | campo cresce mas nunca encolhe ao apagar texto.
  */
  useEffect(() => {
    const el = elemento.current;
    if (!el || !autoGrow) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoGrow, valor, rows]);

  function guardarElemento(el: HTMLTextAreaElement | null) {
    elemento.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }

  function aoMudar(evento: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!controlado) setInterno(evento.target.value);
    props.onChange?.(evento);
  }

  const maximo = typeof props.maxLength === 'number' ? props.maxLength : undefined;
  const restantes = maximo !== undefined ? maximo - valor.length : undefined;
  const apertado = restantes !== undefined && restantes <= 10;

  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...props}
        {...ligacao}
        ref={guardarElemento}
        rows={rows}
        onChange={aoMudar}
        className={cn(
          controlBase({
            size,
            invalid: invalido,
            disabled: props.disabled === true,
            readOnly: props.readOnly === true,
          }),
          'py-3 leading-relaxed placeholder:text-text-3',
          'disabled:cursor-not-allowed disabled:text-text-3 read-only:text-text-2',
          autoGrow ? 'resize-none overflow-hidden' : 'resize-y',
          className,
        )}
      />

      {showCount ? (
        <p
          /*
            | O contador só passa a ser anunciado perto do limite. Um live region
            | que dispara a cada tecla torna o campo impossível de usar com
            | leitor de ecrã — e a contagem no meio do texto não interessa a
            | ninguém.
          */
          aria-live={apertado ? 'polite' : 'off'}
          className={cn(
            'ds-tabular self-end text-xs',
            apertado ? 'font-semibold text-warning-ink' : 'text-text-3',
          )}
        >
          {maximo !== undefined ? `${valor.length}/${maximo} caracteres` : `${valor.length} caracteres`}
        </p>
      ) : null}
    </div>
  );
}
