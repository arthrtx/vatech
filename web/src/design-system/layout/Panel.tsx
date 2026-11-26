import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Superfície de trabalho — o Card sem a assinatura.
|
| A borda deslocada é uma marca: lê-se como marca quando aparece três vezes
| numa página, e como ruído quando aparece quarenta vezes num ecrã de app. Um
| painel de filtros, uma barra de ferramentas ou uma coluna de definições
| usam Panel; um cartão de conteúdo que o utilizador vê como objecto usa Card.
|
| Ao contrário do Card, traz padding próprio: não tem secções e é quase sempre
| uma caixa só.
*/
const panel = cva('rounded-lg border border-line', {
  variants: {
    /* `variant` e não `tone`: isto é tratamento de superfície, não significado. */
    variant: {
      /** Conteúdo. O padrão. */
      surface: 'bg-surface-1',
      /** Recuado: cabeçalho de tabela, área de filtros, bloco de resumo. */
      muted: 'bg-surface-2',
      /** Barra lateral / barra superior — acompanha o rail do shell. */
      rail: 'bg-rail',
      /** Só a linha, sem chapa. Para agrupar sobre um fundo já pintado. */
      outline: 'bg-transparent',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-card',
    },
  },
  defaultVariants: { variant: 'surface', padding: 'md' },
});

export type PanelProps = React.ComponentProps<'div'> & VariantProps<typeof panel>;

export function Panel({ className, variant, padding, ...props }: PanelProps) {
  return <div className={cn(panel({ variant, padding }), className)} {...props} />;
}
