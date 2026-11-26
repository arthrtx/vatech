import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

const tag = cva('inline-flex max-w-full items-center gap-2 rounded-pill border font-medium', {
  variants: {
    tone: {
      neutral: 'border-line bg-surface-1 text-text-2',
      accent: 'border-[color-mix(in_srgb,var(--ds-accent)_30%,transparent)] bg-accent-wash text-accent-ink',
    },
    size: {
      sm: 'h-7 pl-3 text-xs',
      md: 'h-8 pl-3 text-sm',
    },
    removable: {
      // Com botão, a folga da direita é a do próprio botão — somar padding descentra a pílula.
      true: 'pr-1',
      false: 'pr-3',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md', removable: false },
});

export type TagProps = React.ComponentProps<'span'> &
  Omit<VariantProps<typeof tag>, 'removable'> & {
    /** Presente = a etiqueta ganha botão de remover. Ausente = etiqueta só de leitura. */
    onRemove?: () => void;
    /** Nome usado no rótulo do botão de remover ("Remover <label>"). */
    label?: string;
  };

/**
 * Etiqueta: filtro aplicado, categoria, destinatário escolhido.
 *
 * O botão de remover é visualmente pequeno mas tem 44px de alvo, estendido por
 * um pseudo-elemento — inflar o botão a sério empurrava a pílula para 44px de
 * altura e uma linha de seis filtros deixava de caber.
 */
export function Tag({ className, tone, size, onRemove, label, children, ...props }: TagProps) {
  const removivel = typeof onRemove === 'function';

  return (
    <span className={cn(tag({ tone, size, removable: removivel }), className)} {...props}>
      <span className="truncate">{children}</span>
      {removivel ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={label ? `Remover ${label}` : 'Remover'}
          className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-pill text-text-3 transition-colors duration-[var(--ds-motion-fast)] ease-ds hover:bg-wash hover:text-text-1 after:absolute after:top-1/2 after:left-1/2 after:size-touch after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
        >
          <Icone de={ICONES.fechar} medida="sm" />
        </button>
      ) : null}
    </span>
  );
}
