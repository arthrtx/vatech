import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const spinner = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: {
      xs: 'size-3',
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-6',
    },
  },
  defaultVariants: { size: 'sm' },
});

export type SpinnerProps = Omit<React.ComponentProps<'span'>, 'children'> &
  VariantProps<typeof spinner> & {
    /** Texto anunciado enquanto carrega. Ignorado quando `decorative`. */
    label?: string;
    /**
     * O spinner acompanha texto que já anuncia o estado (um botão com
     * `aria-busy`, por exemplo). Nesse caso tem de ficar mudo: dois anúncios
     * do mesmo estado leem-se duas vezes.
     */
    decorative?: boolean;
  };

/**
 * Indicador de espera.
 *
 * Sozinho é `role="status"` e diz por palavras o que está a acontecer —
 * um círculo a rodar não é informação para quem não vê o ecrã.
 */
export function Spinner({
  className,
  size,
  label = 'A carregar…',
  decorative = false,
  ...props
}: SpinnerProps) {
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative || undefined}
      className={cn(spinner({ size }), className)}
      {...props}
    >
      {/*
        | A animação é `transform: rotate` (animate-spin) e não um redesenho do
        | traço: roda no compositor, sem refazer layout a cada frame.
        | `motion-safe:` não é decoração: o bloco `prefers-reduced-motion` dos
        | tokens só anula as durações `--ds-motion-*`, e `animate-spin` traz
        | keyframes e duração próprias do Tailwind — sem a guarda continuava a
        | rodar para quem pediu movimento reduzido, em cada botão a carregar.
      */}
      <svg viewBox="0 0 24 24" fill="none" className="size-full motion-safe:animate-spin" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {decorative ? null : <span className="ds-sr-only">{label}</span>}
    </span>
  );
}
