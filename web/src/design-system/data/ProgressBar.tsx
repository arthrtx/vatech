import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Barra de progresso: quanto de uma tarefa já foi feito.
|
| NÃO muda de cor com o avanço. Vermelho e amarelo querem dizer problema; uma
| tarefa a 95% não é um problema, é uma tarefa quase pronta. O tom é uma
| decisão de quem chama — e para consumo de recurso, onde a proximidade do
| limite é mesmo má notícia, o componente certo é o Meter.
*/

const enchimento = cva('h-full w-full origin-left rounded-pill', {
  variants: {
    tone: {
      accent: 'bg-accent',
      good: 'bg-good',
      warning: 'bg-warning',
      serious: 'bg-serious',
      critical: 'bg-critical',
      info: 'bg-info',
    },
  },
  defaultVariants: { tone: 'accent' },
});

export type ProgressBarProps = Omit<React.ComponentProps<'div'>, 'children'> &
  VariantProps<typeof enchimento> & {
    /** Progresso actual. Omitir torna a barra indeterminada. */
    value?: number;
    /** Total. Percentagens usam o valor por omissão. */
    max?: number;
    /** Obrigatório: uma barra sem rótulo é uma barra que ninguém sabe do que fala. */
    label: string;
    /** Esconder o rótulo visualmente. Continua a ser anunciado. */
    hideLabel?: boolean;
    /** Mostrar a percentagem à direita do rótulo. */
    showValue?: boolean;
  };

export function ProgressBar({
  className,
  tone,
  value,
  max = 100,
  label,
  hideLabel = false,
  showValue = false,
  ...props
}: ProgressBarProps) {
  const indeterminado = value === undefined;
  const limitado = indeterminado ? 0 : Math.min(Math.max(value, 0), max);
  const racio = max > 0 ? limitado / max : 0;
  const percentagem = Math.round(racio * 100);

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className={cn('mb-2 flex items-baseline justify-between gap-3', hideLabel && 'ds-sr-only')}>
        <span className="text-sm font-medium text-text-2">{label}</span>
        {showValue && !indeterminado ? (
          <span className="ds-tabular text-sm text-text-3">{percentagem}%</span>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        /* Barra indeterminada não leva `aria-valuenow` — é assim que se diz "ainda não sei". */
        aria-valuenow={indeterminado ? undefined : limitado}
        aria-valuetext={indeterminado ? 'A calcular' : `${percentagem}%`}
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-3"
      >
        {indeterminado ? (
          <div className={cn(enchimento({ tone }), 'opacity-40 motion-safe:animate-pulse')} />
        ) : (
          /*
            | `scaleX` e não `width`: animar a largura obriga o browser a refazer
            | o layout a cada frame. O valor é dado, não medida de design — daí
            | ser a única coisa que este ficheiro escreve em linha.
          */
          <div
            className={cn(enchimento({ tone }), 'transition-transform duration-[var(--ds-motion-base)] ease-ds')}
            style={{ transform: `scaleX(${racio})` }}
          />
        )}
      </div>
    </div>
  );
}
