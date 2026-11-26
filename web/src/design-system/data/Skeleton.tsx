import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Marcador de conteúdo por carregar.
|
| Sobre o movimento: a pulsação usa `motion-safe:` e não o token de duração,
| ao contrário do resto do sistema. `animate-pulse` traz duração própria, que
| não passa por --ds-motion-*; e encolher uma animação em ciclo para 1ms (o que
| o token faz em movimento reduzido) produziria cintilação — exactamente o que
| a preferência existe para evitar. Aqui, desligar é a leitura correcta.
*/
// TODO: token em falta: --ds-motion-skeleton (duração do ciclo de pulsação)

const marcador = cva('bg-surface-3 motion-safe:animate-pulse', {
  variants: {
    shape: {
      /** Bloco: parágrafo, cartão, imagem. */
      block: 'h-24 w-full rounded-lg',
      /** Linha de texto. */
      line: 'h-4 w-full rounded-sm',
      /** Círculo: avatar, ícone. */
      circle: 'size-10 rounded-pill',
    },
  },
  defaultVariants: { shape: 'line' },
});

export type SkeletonProps = React.ComponentProps<'div'> & VariantProps<typeof marcador>;

export function Skeleton({ className, shape, ...props }: SkeletonProps) {
  return (
    /*
    | `aria-hidden`: um leitor de ecrã não tem nada a ganhar com a forma do que
    | ainda não existe. Quem anuncia o carregamento é o contentor, com
    | `aria-busy` ou uma região `role="status"`.
    */
    <div aria-hidden="true" className={cn(marcador({ shape }), className)} {...props} />
  );
}
