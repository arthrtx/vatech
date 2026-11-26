import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const remate = cva(
  [
    'flex shrink-0 items-center justify-center rounded-md border border-line bg-surface-3 text-text-2',
    'whitespace-nowrap',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-touch px-3 text-md md:min-h-(--ds-control-h-sm) md:text-sm',
        md: 'min-h-touch px-4 text-md md:min-h-(--ds-control-h-md) md:text-base',
        lg: 'min-h-touch-comfort px-5 text-lg',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type InputGroupAddonProps = React.ComponentProps<'span'> & VariantProps<typeof remate>;

/**
 * Remate fixo de um `InputGroup`: uma unidade (`€`, `kg`, `.pt`), um prefixo
 * de protocolo, uma etiqueta.
 *
 * É texto, não um controlo — não recebe foco nem clique. Se o remate for
 * accionável, é um `Button`, não isto.
 *
 * O texto lido em voz alta fica só na label do campo: um leitor de ecrã que
 * anunciasse "euros" a meio do formulário sem contexto não ajudava ninguém.
 */
export function InputGroupAddon({ className, size, ...props }: InputGroupAddonProps) {
  return <span aria-hidden="true" className={cn(remate({ size }), className)} {...props} />;
}
