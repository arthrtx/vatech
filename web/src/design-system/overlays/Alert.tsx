'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { BotaoFechar, IconeAviso, IconeBom, IconeCritico, IconeGrave, IconeInfo } from './internals';

export type AlertTone = 'info' | 'good' | 'warning' | 'serious' | 'critical';

/*
| Cada tom tem ícone PRÓPRIO, e não o mesmo ícone pintado de outra cor. Quem
| não separa vermelho de verde — 1 em cada 12 homens — fica a ver dois avisos
| iguais. As formas são deliberadamente diferentes: círculo, triângulo,
| octógono.
*/
const ICONE = {
  info: IconeInfo,
  good: IconeBom,
  warning: IconeAviso,
  serious: IconeGrave,
  critical: IconeCritico,
} as const;

/*
| O fundo é a superfície normal, igual em todos os tons — sem tira colorida na
| aresta esquerda (banida, AI slop). O tom entra pelo ÍCONE (forma própria por
| tom, ver `ICONE` acima) e pela tinta do ícone (`tinta`, abaixo).
|
| O mapa `tone` fica sem classes só para não mexer no tipo exportado
| (`VariantProps<typeof alerta>` alimenta `AlertProps`); hoje `alerta({tone})`
| não varia com o tom — quem carrega o tom é `tinta`+`ICONE`.
*/
const alerta = cva(
  'flex w-full items-start gap-3 rounded-lg border border-line bg-surface-1 p-4 text-sm',
  {
    variants: {
      tone: {
        info: '',
        good: '',
        warning: '',
        serious: '',
        critical: '',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

const tinta = cva('mt-0.5', {
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

export type AlertProps = Omit<React.ComponentProps<'div'>, 'title'> &
  VariantProps<typeof alerta> & {
    /** A frase curta que diz o que se passa. */
    title: string;
    /** Botão ou ligação — o que resolve o aviso. No máximo um. */
    action?: React.ReactNode;
    /**
     * Torna o alerta dispensável. Sem isto não aparece botão de fechar: um
     * erro de validação que se fecha some sem estar resolvido.
     */
    onDismiss?: () => void;
  };

/**
 * Aviso em linha, dentro da página, junto ao que ele descreve.
 *
 * Distingue-se do `Toast` (que passa) e do `Banner` (que é do sistema inteiro):
 * o `Alert` fica enquanto a condição durar, e por isso serve para erro de
 * formulário, quota esgotada ou um estado que precisa de ser lido com calma.
 */
export function Alert({ tone = 'info', title, action, onDismiss, className, children, ...props }: AlertProps) {
  const Icone = ICONE[tone ?? 'info'];

  return (
    <div
      /*
      | `alert` interrompe o leitor de ecrã; `status` espera a vez. Um erro
      | crítico que apareça a meio de um formulário justifica a interrupção,
      | uma nota informativa não.
      */
      role={tone === 'critical' || tone === 'serious' ? 'alert' : 'status'}
      className={cn(alerta({ tone }), className)}
      {...props}
    >
      <Icone className={tinta({ tone })} />

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text-1">{title}</p>
        {children ? <div className="mt-1 leading-relaxed text-text-2">{children}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-3">{action}</div> : null}
      </div>

      {onDismiss ? <BotaoFechar aria-label={`Dispensar aviso: ${title}`} onClick={onDismiss} className="-mt-1 -mr-2" /> : null}
    </div>
  );
}
