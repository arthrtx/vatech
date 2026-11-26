import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

export type Step = {
  label: string;
  description?: string;
};

export type StepperProps = Omit<React.ComponentProps<'ol'>, 'children'> & {
  steps: Step[];
  /** Índice do passo actual, a começar em 0. */
  current: number;
  /** Nome da lista para leitor de ecrã. */
  label?: string;
};

const marcador = cva(
  'ds-tabular grid size-8 shrink-0 place-items-center rounded-pill border text-xs font-bold transition-colors duration-[var(--ds-motion-base)] ease-ds',
  {
    variants: {
      state: {
        done: 'border-accent bg-accent text-on-accent',
        current: 'border-accent border-2 bg-accent-wash text-accent-ink',
        todo: 'border-line bg-surface-2 text-text-3',
      },
    },
    defaultVariants: { state: 'todo' },
  },
);

const ESTADO_LIDO = {
  done: 'concluído',
  current: 'em curso',
  todo: 'por fazer',
} as const;

function Visto() {
  return <Icone de={ICONES.visto} />;
}

/**
 * Passos de um processo com vários ecrãs.
 *
 * Horizontal em desktop, vertical no telemóvel: cinco rótulos lado a lado numa
 * coluna de 360px partem-se em duas linhas cada e a barra deixa de se ler.
 *
 * Cada estado tem forma além de cor — visto, contorno grosso ou número — e
 * ainda um rótulo em `.ds-sr-only`. Uma barra de progresso que só muda de cor
 * não diz nada a quem não distingue as duas.
 */
export function Stepper({
  steps,
  current,
  label = 'Progresso',
  className,
  ...props
}: StepperProps) {
  return (
    <ol
      aria-label={label}
      className={cn('flex flex-col md:flex-row md:items-stretch', className)}
      {...props}
    >
      {steps.map((step, indice) => {
        const state = indice < current ? 'done' : indice === current ? 'current' : 'todo';
        const ultimo = indice === steps.length - 1;

        return (
          <li
            key={step.label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex min-w-0 gap-3 md:flex-1 md:flex-col md:gap-2"
          >
            {/* Eixo: marcador + linha até ao passo seguinte. */}
            <div className="flex flex-col items-center self-stretch md:w-full md:flex-row md:self-auto">
              <span className={marcador({ state })}>
                {state === 'done' ? <Visto /> : indice + 1}
              </span>

              {!ultimo ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 w-0.5 flex-1 rounded-pill md:mt-0 md:ml-2 md:h-0.5 md:w-auto',
                    state === 'done' ? 'bg-accent' : 'bg-line',
                  )}
                />
              ) : null}
            </div>

            <div className={cn('min-w-0 pb-6 md:pr-4 md:pb-0', ultimo && 'pb-0')}>
              <p
                className={cn(
                  'text-sm',
                  state === 'todo' ? 'text-text-3' : 'font-semibold text-text-1',
                )}
              >
                {step.label}
                <span className="ds-sr-only">{`, ${ESTADO_LIDO[state]}`}</span>
              </p>
              {step.description ? (
                <p className="mt-0.5 text-xs text-text-2">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
