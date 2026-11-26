'use client';

import { createContext, useContext, useId } from 'react';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

/*
| A moldura de qualquer campo. Existe para o `id` do controlo, o `htmlFor` da
| label, o `aria-describedby` da dica e o `aria-invalid` do erro serem escritos
| UMA vez — e não em cada formulário, onde falham sempre um.
|
| O controlo lá dentro não recebe props: lê-os do contexto pelo `useFieldControl`.
*/

type ValorDoCampo = {
  controlId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const ContextoDeCampo = createContext<ValorDoCampo | null>(null);

/** Props que um controlo de formulário aceita para se ligar a um `Field`. */
export type FieldBinding = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  required?: boolean;
};

/**
 * Devolve os atributos de ligação ao `Field` mais próximo, já fundidos com os
 * que o próprio controlo recebeu — o que vem do sítio da chamada ganha sempre.
 *
 * Fora de um `Field` devolve exactamente o que lhe deram: um `Input` solto
 * continua a funcionar, só não fica ligado a nada.
 *
 * `invalid` sai à parte de propósito — é para escolher classes, não para ir
 * parar ao DOM. Um `invalid={false}` espalhado num elemento nativo dá aviso
 * de atributo desconhecido no React.
 */
export function useFieldControl(local: FieldBinding = {}): FieldBinding & { invalid: boolean } {
  const campo = useContext(ContextoDeCampo);

  const descrito = [campo?.describedBy, local['aria-describedby']].filter(Boolean).join(' ');
  const invalido =
    local['aria-invalid'] !== undefined
      ? local['aria-invalid'] !== false && local['aria-invalid'] !== 'false'
      : (campo?.invalid ?? false);

  return {
    id: local.id ?? campo?.controlId,
    'aria-describedby': descrito || undefined,
    'aria-invalid': invalido || undefined,
    required: local.required ?? campo?.required,
    invalid: invalido,
  };
}

export type FieldProps = React.ComponentProps<'div'> & {
  /** Texto da label. Obrigatório: um `placeholder` não é label. */
  label: React.ReactNode;
  /** Ajuda permanente, lida antes do campo. */
  hint?: React.ReactNode;
  /** Mensagem de erro. A sua presença é o que torna o campo inválido. */
  error?: React.ReactNode;
  /** Marca o campo como obrigatório — na label e no controlo. */
  required?: boolean;
  /** Marca o campo como opcional, para formulários onde a maioria é obrigatória. */
  optional?: boolean;
  /** Força o `id` do controlo. Só é preciso quando alguém de fora precisa de lhe apontar. */
  controlId?: string;
};

export function Field({
  label,
  hint,
  error,
  required = false,
  optional = false,
  controlId,
  className,
  children,
  ...props
}: FieldProps) {
  const gerado = useId();
  const id = controlId ?? gerado;
  const hintId = hint ? `${id}-dica` : undefined;
  const errorId = error ? `${id}-erro` : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <label htmlFor={id} className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-text-1">
        {label}
        {/*
          | A marca de obrigatório é uma palavra, não um asterisco vermelho: o
          | asterisco depende de uma legenda algures na página que ninguém lê, e
          | um leitor de ecrã anuncia-o como "asterisco". WCAG 3.3.2.
        */}
        {required ? (
          <span className="text-xs font-normal text-text-3">obrigatório</span>
        ) : optional ? (
          <span className="text-xs font-normal text-text-3">opcional</span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="max-w-(--container-text) text-sm text-text-2">
          {hint}
        </p>
      ) : null}

      <ContextoDeCampo.Provider
        value={{
          controlId: id,
          describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
          invalid: Boolean(error),
          required,
        }}
      >
        {children}
      </ContextoDeCampo.Provider>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-2 text-sm font-medium text-critical-ink"
        >
          {/* O ícone é o que impede o erro de ser só "o texto ficou vermelho". */}
          <Icone de={ICONES.aviso} medida="md" className="mt-0.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
