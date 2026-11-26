import { cn } from '../lib/cn';

export type DividerProps = React.ComponentProps<'div'> & {
  /** `vertical` só funciona dentro de um pai flex — precisa de altura para esticar. */
  orientation?: 'horizontal' | 'vertical';
  /** Rótulo ao centro. Ignorado na orientação vertical, onde não há sítio para ele. */
  label?: React.ReactNode;
};

/*
| Separador. `role="separator"` explícito e não `<hr>`: o mesmo componente tem
| de servir os três casos (linha, linha vertical, linha com rótulo) e um `<hr>`
| com filhos não é HTML válido.
|
| A linha é `border`, não `bg` com altura: assim herda a espessura de bordo do
| sistema em vez de a redeclarar.
|
| O rótulo entra como `aria-label` quando é texto — a role `separator` não tira
| nome do conteúdo, por isso sem isto o leitor de ecrã anuncia só "separador".
*/
export function Divider({ orientation = 'horizontal', label, className, ...props }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('self-stretch border-l border-line', className)}
        {...props}
      />
    );
  }

  if (label != null) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn('flex w-full items-center gap-4', className)}
        {...props}
      >
        <span aria-hidden className="flex-1 border-t border-line" />
        <span className="ds-eyebrow">{label}</span>
        <span aria-hidden className="flex-1 border-t border-line" />
      </div>
    );
  }

  return (
    <div role="separator" aria-orientation="horizontal" className={cn('w-full border-t border-line', className)} {...props} />
  );
}
