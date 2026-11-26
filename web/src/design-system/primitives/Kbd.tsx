import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| A borda de baixo mais grossa é o que dá a leitura de tecla física. É borda e
| não sombra de propósito: uma sombra difusa nesta escala lê-se como ruído.
*/
const kbd = cva(
  'inline-flex items-center justify-center rounded-sm border border-b-2 border-line bg-surface-2 font-mono font-medium text-text-2 whitespace-nowrap',
  {
    variants: {
      size: {
        sm: 'h-5 min-w-5 px-1 text-2xs',
        md: 'h-6 min-w-6 px-2 text-xs',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type KbdProps = React.ComponentProps<'kbd'> & VariantProps<typeof kbd>;

/**
 * Tecla ou atalho: `<Kbd>⌘</Kbd><Kbd>K</Kbd>`.
 *
 * Uma tecla por elemento — um `<kbd>` com "Ctrl+K" lá dentro é uma string, não
 * um atalho, e não se estiliza nem se lê como tal.
 */
export function Kbd({ className, size, ...props }: KbdProps) {
  return <kbd className={cn(kbd({ size }), className)} {...props} />;
}
