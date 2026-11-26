import { Children, isValidElement, type ReactNode } from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { avatar } from './Avatar';

export type AvatarGroupProps = Omit<React.ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatar> & {
    /** Quantos retratos aparecem antes de o resto virar contador. */
    max?: number;
    /** Os `<Avatar>` do grupo. */
    children: ReactNode;
  };

/**
 * Pilha de retratos com contador — quem está numa obra, quem comentou.
 *
 * O anel à volta de cada retrato é a cor da superfície de baixo (`surface-1`,
 * a do cartão). Num fundo diferente, passar `className` com outro anel — sem
 * ele os retratos sobrepostos colam-se e deixa de se perceber quantos são.
 */
export function AvatarGroup({ className, size, shape, max = 4, children, ...props }: AvatarGroupProps) {
  const todos = Children.toArray(children).filter(isValidElement);
  const visiveis = todos.slice(0, max);
  const restantes = todos.length - visiveis.length;

  return (
    <span className={cn('inline-flex items-center', className)} {...props}>
      {visiveis.map((filho, indice) => (
        <span
          key={filho.key ?? indice}
          className="inline-flex rounded-pill ring-2 ring-surface-1 not-first:-ml-2"
        >
          {filho}
        </span>
      ))}

      {restantes > 0 ? (
        <span
          className={cn(
            avatar({ size, shape }),
            'border-transparent bg-surface-3 ring-2 ring-surface-1 not-first:-ml-2',
          )}
        >
          {/* O sinal + já diz "mais"; para leitor de ecrã fica explícito. */}
          <span aria-hidden="true">+{restantes}</span>
          <span className="ds-sr-only">mais {restantes}</span>
        </span>
      ) : null}
    </span>
  );
}
