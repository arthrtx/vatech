import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Consumo de um recurso finito: disco, orçamento, quota, licenças.
|
| Ao contrário da ProgressBar, MUDA de tom com o limiar — aqui aproximar-se do
| fim é mesmo má notícia. E como o tom sozinho não é informação, o estado vem
| sempre também em palavras.
*/

/* Os valores são os tons do sistema, não um vocabulário próprio do medidor. */
type Tone = 'good' | 'warning' | 'serious' | 'critical';

const ESTADOS: Record<Tone, { rotulo: string }> = {
  good: { rotulo: 'Dentro do limite' },
  warning: { rotulo: 'A aproximar-se do limite' },
  serious: { rotulo: 'Quase esgotado' },
  critical: { rotulo: 'Esgotado' },
};

const enchimento = cva('h-full w-full origin-left rounded-pill transition-transform duration-[var(--ds-motion-base)] ease-ds', {
  variants: {
    tone: {
      good: 'bg-good',
      warning: 'bg-warning',
      serious: 'bg-serious',
      critical: 'bg-critical',
    },
  },
});

const tinta = cva('text-sm font-semibold', {
  variants: {
    tone: {
      good: 'text-good-ink',
      warning: 'text-warning-ink',
      serious: 'text-serious-ink',
      critical: 'text-critical-ink',
    },
  },
});

export type MeterProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  /** Consumo actual, na mesma unidade que `max`. */
  value: number;
  /** Capacidade total. */
  max?: number;
  /** Obrigatório: o que está a ser consumido. */
  label: string;
  /** Percentagem a partir da qual passa a aviso. */
  warningAt?: number;
  /** Percentagem a partir da qual passa a grave. */
  criticalAt?: number;
  /**
   * Texto legível do valor — "180 GB de 250 GB". Sem isto o leitor de ecrã
   * anuncia números crus, que não dizem de que unidade se fala.
   */
  valueText?: string;
};

export function Meter({
  className,
  value,
  max = 100,
  label,
  warningAt = 70,
  criticalAt = 90,
  valueText,
  ...props
}: MeterProps) {
  const limitado = Math.min(Math.max(value, 0), max);
  const racio = max > 0 ? limitado / max : 0;
  const percentagem = Math.round(racio * 100);

  const tone: Tone =
    percentagem >= 100 ? 'critical' : percentagem >= criticalAt ? 'serious' : percentagem >= warningAt ? 'warning' : 'good';

  const texto = valueText ?? `${limitado} de ${max}`;

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-text-2">{label}</span>
        <span className="ds-tabular text-sm text-text-3">{texto}</span>
      </div>

      <div
        /*
        | `role="meter"` e não `progressbar`: um medidor descreve um nível
        | dentro de um intervalo conhecido, não o avanço de uma tarefa. A
        | diferença conta para quem ouve a página.
        */
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={limitado}
        aria-valuetext={`${texto} — ${ESTADOS[tone].rotulo}`}
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-3"
      >
        <div className={enchimento({ tone })} style={{ transform: `scaleX(${racio})` }} />
      </div>

      {/* O estado por extenso. A cor da barra é reforço; isto é a informação. */}
      <p className={cn(tinta({ tone }), 'mt-2')}>{ESTADOS[tone].rotulo}</p>
    </div>
  );
}
