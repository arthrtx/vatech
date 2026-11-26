import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const ponto = cva('inline-block shrink-0 rounded-pill', {
  variants: {
    // `tone` e não `status`: é o mesmo eixo semântico do Badge, Tag, Alert e
    // Stat, e um nome por família transformava o sistema numa pasta.
    tone: {
      neutral: 'bg-text-3',
      good: 'bg-good',
      warning: 'bg-warning',
      serious: 'bg-serious',
      critical: 'bg-critical',
      info: 'bg-info',
      accent: 'bg-accent',
    },
    size: {
      sm: 'size-2',
      md: 'size-2.5',
      lg: 'size-3',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

export type StatusDotProps = Omit<React.ComponentProps<'span'>, 'children'> &
  VariantProps<typeof ponto> & {
    /** O estado por extenso: "Operacional", "Sincronização atrasada". */
    label: string;
    /** Mostra o rótulo ao lado do ponto. Sem isto, o texto existe mas só para leitor de ecrã. */
    showLabel?: boolean;
  };

/**
 * Ponto de estado — o indicador de uma linha de tabela, de um servidor, de uma
 * integração.
 *
 * O rótulo é obrigatório no tipo. Um ponto verde não é informação: é uma cor.
 * Quando não está visível, vai em `.ds-sr-only` — o estado continua a ser lido.
 */
export function StatusDot({ className, tone, size, label, showLabel = false, ...props }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} {...props}>
      <span aria-hidden="true" className={ponto({ tone, size })} />
      <span className={showLabel ? 'text-sm text-text-2' : 'ds-sr-only'}>{label}</span>
    </span>
  );
}
