import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const barra = cva(
  [
    // Telemóvel: empilhado e a toda a largura. Um botão de 100px no canto
    // inferior direito de um ecrã de 360px é o alvo mais difícil que há.
    'flex flex-col gap-3',
    '[&>*]:w-full md:[&>*]:w-auto',
    'md:gap-4',
  ],
  {
    variants: {
      align: {
        /*
        | `flex-row-reverse` e não `justify-end`: a ordem no DOM passa a ser
        | primária → secundária, que é a ordem certa em telemóvel (primária em
        | cima) e a ordem certa por teclado (a acção principal apanha-se
        | primeiro). Em desktop o eixo inverte-se e a primária vai parar à
        | direita, que é onde o olho a procura.
        */
        end: 'md:flex-row-reverse md:justify-start',
        /** Primária à direita, secundárias encostadas à esquerda. */
        between: 'md:flex-row-reverse md:justify-between',
        /** Primária à esquerda — para formulários dentro de um painel estreito. */
        start: 'md:flex-row md:justify-start',
      },
      divided: {
        true: 'border-t border-line pt-6',
        false: '',
      },
    },
    defaultVariants: { align: 'end', divided: true },
  },
);

export type FormActionsProps = React.ComponentProps<'div'> & VariantProps<typeof barra>;

/**
 * Barra de acções no fim de um formulário.
 *
 * A acção primária é o **primeiro** filho. A ordem visual em desktop é obtida
 * invertendo o eixo, não reordenando o DOM — a ordem de leitura e a ordem de
 * tabulação continuam a ser a do código.
 *
 * ```tsx
 * <FormActions>
 *   <Button type="submit">Guardar</Button>
 *   <Button variant="ghost" type="button">Cancelar</Button>
 * </FormActions>
 * ```
 */
export function FormActions({ className, align, divided, ...props }: FormActionsProps) {
  return <div className={cn(barra({ align, divided }), className)} {...props} />;
}
