import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| O ritmo vertical da página, num sítio só: 60px no telemóvel, 90px acima do
| corte principal. Medido no site da casa.
|
| A Section trata do espaço e da superfície; a largura é do Container. Separar
| as duas coisas é o que permite ter uma faixa de cor a sangrar de bordo a
| bordo com o texto alinhado à grelha lá dentro:
|
|   <Section variant="muted"><Container width="narrow">…</Container></Section>
|
| ⚠ O espaço vertical vive todo dentro da variante `tight`, incluindo o caso
| normal, e não na base. Se a base trouxesse `py-section-mobile` e o `tight`
| lhe sobrepusesse `py-12`, o `tailwind-merge` não dava pelo conflito — não
| reconhece os nossos degraus com nome — e ficavam as duas regras no elemento,
| com o vencedor a sair da ordem do CSS gerado.
*/
const section = cva('', {
  variants: {
    /* `variant` e não `tone`: isto é tratamento de superfície, não significado. */
    variant: {
      /** Herda o que estiver por baixo. Omissão — não pinta faixas sem se pedir. */
      transparent: 'bg-transparent',
      /** O fundo da página. Usar para voltar ao plano depois de uma faixa. */
      plane: 'bg-plane',
      /** Chapa clara: destaca a faixa do plano sem a fechar numa caixa. */
      surface: 'bg-surface-1',
      /** Faixa alternada — o degrau seguinte de contraste. */
      muted: 'bg-surface-2',
    },
    /** Metade do ritmo. Para secções encadeadas que são o mesmo assunto. */
    tight: {
      true: 'py-12 lg:py-16',
      false: 'py-section-mobile lg:py-section',
    },
  },
  defaultVariants: { variant: 'transparent', tight: false },
});

export type SectionProps = React.ComponentProps<'section'> & VariantProps<typeof section>;

export function Section({ className, variant, tight, ...props }: SectionProps) {
  return <section className={cn(section({ variant, tight }), className)} {...props} />;
}
