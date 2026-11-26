import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';

/*
| A caixa que centra o conteúdo e garante a margem lateral. É o único sítio do
| sistema que sabe quanto vale o gutter — se um ecrã escrever `px-6` à mão,
| passa a haver duas respostas para a mesma pergunta.
|
| O gutter muda no corte principal (1000px) e não no `sm`: é aí que a coluna
| deixa de ser uma coluna de telemóvel, e é o corte que o site já usava.
*/
const container = cva('mx-auto w-full px-gutter-mobile lg:px-gutter', {
  variants: {
    width: {
      /** 1366px — o limite do site; usar em página de marketing. */
      max: 'max-w-(--container-max)',
      /** 1280px — desktop cheio sem chegar ao limite. */
      wide: 'max-w-(--container-wide)',
      /** 1100px — conteúdo denso: painel, tabela, dashboard. */
      narrow: 'max-w-(--container-narrow)',
      /** 720px — medida de leitura (~70 caracteres). Texto longo. */
      text: 'max-w-(--container-text)',
      /** 620px — formulário: mais estreito que a prosa, de propósito. */
      form: 'max-w-(--container-form)',
    },
  },
  defaultVariants: { width: 'max' },
});

export type ContainerProps = React.ComponentProps<'div'> &
  VariantProps<typeof container> &
  ComAsChild;

/*
| `asChild` porque a moldura da página é quase sempre um elemento com nome:
| um <main>, um <section>, um <header>. Sem ele, ou se perde a semântica ou se
| copiam as classes do container para outro sítio — e passa a haver dois donos
| da margem lateral.
*/
export function Container({ className, width, asChild, ...props }: ContainerProps) {
  const Elemento = asChild ? Raiz : 'div';
  return <Elemento className={cn(container({ width }), className)} {...props} />;
}
