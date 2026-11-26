'use client';

import { AspectRatio as RadixAspectRatio } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Caixa de proporção fixa: reserva o espaço da imagem/vídeo antes de ele
| carregar. Sem isto, o conteúdo por baixo salta quando o media entra — é o
| Cumulative Layout Shift, e nota-se sobretudo em ligação lenta.
|
| Vem do Radix e não da utilidade `aspect-*` do Tailwind porque o Radix trata
| o caso do filho absoluto e do `object-fit` de forma consistente entre
| browsers, e porque a proporção chega como número (`16 / 9`), calculável.
|
| 'use client': a primitiva do Radix usa `forwardRef`, que não corre em Server
| Component. Sem a directiva, o erro só aparece no build do Next.
*/
const aspectRatio = cva('overflow-hidden', {
  variants: {
    radius: {
      none: 'rounded-none',
      /** Raio de superfície — o mesmo do Card. */
      lg: 'rounded-lg',
      /** Superfície elevada: destaque, modal. */
      xl: 'rounded-xl',
      pill: 'rounded-pill',
    },
  },
  defaultVariants: { radius: 'none' },
});

export type AspectRatioProps = React.ComponentProps<typeof RadixAspectRatio.Root> &
  VariantProps<typeof aspectRatio>;

export function AspectRatio({ className, radius, ratio = 16 / 9, ...props }: AspectRatioProps) {
  return (
    <RadixAspectRatio.Root ratio={ratio} className={cn(aspectRatio({ radius }), className)} {...props} />
  );
}
