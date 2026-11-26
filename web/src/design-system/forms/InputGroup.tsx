import { cn } from '../lib/cn';

export type InputGroupProps = React.ComponentProps<'div'>;

/**
 * Cola um campo a um botão ou a uma unidade, num único bloco visual.
 *
 * Não sabe o que leva dentro: recebe um `Input`, um `NativeSelect`, um
 * `Button` da família `primitives` ou um `InputGroupAddon`, por qualquer
 * ordem. Toda a costura é feita por selectores sobre os filhos directos —
 * assim nenhuma das peças precisa de saber que está dentro de um grupo.
 *
 * ```tsx
 * <InputGroup>
 *   <Input placeholder="a-minha-loja" />
 *   <InputGroupAddon>.pt</InputGroupAddon>
 * </InputGroup>
 * ```
 */
export function InputGroup({ className, children, ...props }: InputGroupProps) {
  return (
    <div
      className={cn(
        // `isolate` cria um contexto de empilhamento próprio: o que se levanta
        // aqui dentro nunca sobe acima de um menu ou de um modal da página.
        'isolate flex w-full items-stretch',
        // Os cantos interiores desaparecem e as bordas sobrepõem-se em 1px:
        // sem o `-ml-px` ficava uma linha de 2px na junta.
        '[&>*:not(:first-child)]:-ml-px',
        '[&>*:not(:first-child)]:rounded-l-none',
        '[&>*:not(:last-child)]:rounded-r-none',
        // O elemento com foco sobe por cima dos vizinhos, senão a sobreposição
        // de 1px corta o anel de foco do lado da junta.
        '[&>*]:relative [&>*:focus-within]:z-(--ds-z-content)',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
