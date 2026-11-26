import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Texto longo: um artigo, uma política, o corpo de um documento. Estiliza os
| descendentes porque o conteúdo costuma vir de um CMS ou de markdown, onde
| não há como pôr uma classe em cada `<p>`.
|
| Duas coisas que decide e que não se re-decidem por página:
|  - a largura (720px, ~70 caracteres). Linha mais longa do que isto e o olho
|    perde o início da seguinte;
|  - o ritmo: 16px entre blocos, 40px antes de um `h2`.
|
| ⚠ Especificidade, não ordem: `> * + h2` (0,1,1) ganha a `> * + *` (0,1,0).
| Escrito como `[&>h2]:mt-gutter` os dois empatavam e quem ganhava passava a
| ser a ordem no CSS gerado — que ninguém controla daqui.
|
| ⚠ Duas armadilhas do `tailwind-merge`, ambas silenciosas:
|  - `text-h3` não parece um tamanho t-shirt, cai no grupo da COR do texto e
|    aniquila o `text-text-1` que vem a seguir. Por isso o tamanho do `h2`
|    entra como `text-(length:--ds-text-h3)` — lido como tamanho — e o
|    line-height emparelhado vem à mão, no `leading-snug`;
|  - um `leading-*` ANTES de um tamanho de letra é apagado por ele. Daí o
|    `leading-relaxed` viver dentro de cada variante de `size`, depois do
|    tamanho, e não na base.
*/
const prose = cva(
  [
    'text-text-2',
    '[&>*+*]:mt-4',
    '[&>*+h2]:mt-gutter [&>*+h3]:mt-8 [&>*+hr]:mt-8',
    '[&_h2]:text-(length:--ds-text-h3) [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:text-balance [&_h2]:text-text-1',
    '[&_h3]:text-md [&_h3]:font-semibold [&_h3]:text-text-1',
    '[&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-text-1',
    '[&_strong]:font-semibold [&_strong]:text-text-1',
    '[&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-4',
    '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:mt-2',
    '[&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm',
    '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-2 [&_pre]:p-4 [&_pre]:text-sm',
    '[&_pre_code]:bg-transparent [&_pre_code]:px-0',
    '[&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-4 [&_blockquote]:text-text-3',
    '[&_hr]:border-line',
    '[&_img]:rounded-lg',
  ],
  {
    variants: {
      size: {
        sm: 'text-base leading-relaxed',
        md: 'text-md leading-relaxed',
        lg: 'text-lg leading-relaxed',
      },
      width: {
        /** A medida de leitura. O que se quer em 95% dos casos. */
        text: 'max-w-(--container-text)',
        /** Sem limite — quando quem chama já limitou a coluna. */
        full: 'max-w-full',
      },
    },
    defaultVariants: { size: 'md', width: 'text' },
  },
);

export type ProseProps = React.ComponentProps<'div'> & VariantProps<typeof prose>;

export function Prose({ className, size, width, ...props }: ProseProps) {
  return <div className={cn(prose({ size, width }), className)} {...props} />;
}
