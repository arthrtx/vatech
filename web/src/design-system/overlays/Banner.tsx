'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { BotaoFechar, IconeAviso, IconeBom, IconeCritico, IconeGrave, IconeInfo } from './internals';

export type BannerTone = 'info' | 'good' | 'warning' | 'serious' | 'critical';

const ICONE = {
  info: IconeInfo,
  good: IconeBom,
  warning: IconeAviso,
  serious: IconeGrave,
  critical: IconeCritico,
} as const;

/*
| Faixa de sistema: atravessa a app inteira, encostada ao topo, acima de tudo
| menos dos overlays. É a diferença para o `Alert` — este não fala de um
| formulário nem de um cartão, fala da instalação toda ("manutenção às 22h",
| "modo de leitura", "subscrição expirada").
|
| Fundo tingido em vez de chapa sólida, pela mesma razão do Alert: o texto
| mantém-se `text-text-1` e continua legível nos dois temas. O tingido vem do
| token `-wash` do sistema e não de uma mistura feita aqui — cinco faixas com
| a sua própria percentagem eram cinco sítios onde a discrição podia divergir.
*/
const faixa = cva(
  [
    'flex w-full items-center gap-3 border-b px-gutter-mobile py-3 text-sm text-text-1 lg:px-gutter',
  ],
  {
    variants: {
      tone: {
        info: 'border-b-info bg-info-wash',
        good: 'border-b-good bg-good-wash',
        warning: 'border-b-warning bg-warning-wash',
        serious: 'border-b-serious bg-serious-wash',
        critical: 'border-b-critical bg-critical-wash',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

const tinta = cva('', {
  variants: {
    tone: {
      info: 'text-info-ink',
      good: 'text-good-ink',
      warning: 'text-warning-ink',
      serious: 'text-serious-ink',
      critical: 'text-critical-ink',
    },
  },
  defaultVariants: { tone: 'info' },
});

export type BannerProps = React.ComponentProps<'div'> &
  VariantProps<typeof faixa> & {
    /** Botão ou ligação à direita. Um só. */
    action?: React.ReactNode;
    /** Sem isto não há botão de fechar — nem tudo o que é do sistema se dispensa. */
    onDismiss?: () => void;
    /**
     * Cola ao topo ao fazer scroll. Fica na camada `sticky`, por baixo de
     * modais e menus de propósito: uma faixa de sistema não tapa o diálogo
     * que o utilizador acabou de abrir.
     */
    sticky?: boolean;
  };

/** Faixa de largura total no topo da app, para avisos que valem para tudo. */
export function Banner({ tone = 'info', action, onDismiss, sticky = false, className, children, ...props }: BannerProps) {
  const Icone = ICONE[tone ?? 'info'];

  return (
    <div
      role={tone === 'critical' || tone === 'serious' ? 'alert' : 'status'}
      className={cn(faixa({ tone }), sticky && 'sticky top-0 z-[var(--ds-z-sticky)]', className)}
      {...props}
    >
      <Icone className={tinta({ tone })} />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
      {onDismiss ? <BotaoFechar aria-label="Dispensar aviso do sistema" onClick={onDismiss} className="-my-2 -mr-2" /> : null}
    </div>
  );
}
