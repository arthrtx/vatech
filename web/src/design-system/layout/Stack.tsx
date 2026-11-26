import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';

/*
| Coluna com espaço entre filhos. Existe para o espaço vertical deixar de ser
| uma margem escrita em cada filho: margens somam-se, colapsam e obrigam a
| `:last-child` para tirar a última — um `gap` não faz nada disso.
|
| O vocabulário de espaço é o mesmo em Stack, Inline e Grid. Está repetido em
| literais nos três ficheiros de propósito: o Tailwind lê classes escritas por
| extenso e não segue uma constante partilhada.
*/
const stack = cva('flex flex-col', {
  variants: {
    gap: {
      none: 'gap-0',
      '2xs': 'gap-1',
      xs: 'gap-2',
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-gutter',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
  },
  defaultVariants: { gap: 'md', align: 'stretch' },
});

export type StackProps = React.ComponentProps<'div'> & VariantProps<typeof stack> & ComAsChild;

/*
| `asChild` porque a coluna é muitas vezes uma lista de verdade — <ul>, <ol>,
| <nav> — e uma lista escrita como <div> não é lida como lista pelo leitor de
| ecrã: perde-se «lista de 12 itens» e a navegação por item. O preflight do
| Tailwind já tira o marcador e a indentação das listas, portanto o <ul> entra
| sem herdar aspecto nenhum.
*/
export function Stack({ className, gap, align, asChild, ...props }: StackProps) {
  const Elemento = asChild ? Raiz : 'div';
  return <Elemento className={cn(stack({ gap, align }), className)} {...props} />;
}
