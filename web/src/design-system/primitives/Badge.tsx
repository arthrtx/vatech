import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| A chapa suave é fundo `-wash` + linha `-edge`, os dois já em token por tom.
| A sólida leva `text-<tom>-on`: cada um foi medido contra a sua chapa e passa
| 4.5:1. Uma tinta única para as cinco não chega — branco sobre o amarelo de
| aviso dava 1.83:1.
|
| ⚠ Essa medição é da variante SÓLIDA e só dela. A suave — que é a variante por
| omissão, logo a esmagadora maioria do que se vê — nunca tinha sido medida, e
| é o caso difícil: o `-wash` é 14% da cor sobre TRANSPARENTE, portanto o fundo
| real não é a chapa, é a superfície por baixo tingida pela cor. Quanto mais
| clara a superfície, mais claro o fundo composto e menor o rácio — não há aqui
| um número, há um por superfície. A etiqueta «Aberto» dos issues chegou a
| produção a 4.39:1 por causa disto.
|
| O que este ficheiro garante hoje, medido no pixel composto a 12px/600, é
| 4.5:1 sobre as três superfícies de CONTEÚDO: `surface-1`, `surface-2` e a
| linha de hover. A correcção foi na tinta (`ink.*` em design-tokens), não
| aqui: o problema era do token, e uma classe por tom neste ficheiro era o
| segundo sítio onde a cor podia divergir.
|
| ⚠ O que NÃO está garantido é a `surface-3` — o estado premido e a faixa
| alternada. Aí a chapa suave cai para 3.3–4.5 em quatro dos sete tons, nos
| dois temas, e fechar essa folga obriga a redesenhar a paleta de tinta
| inteira, não a corrigir um tom. Fica registado por medir, não por resolver.
|
| TODO: token em falta: --ds-accent-edge (o accent tem -wash mas não -edge).
*/
const badge = cva('inline-flex items-center gap-2 rounded-pill border font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: '',
      good: '',
      warning: '',
      serious: '',
      critical: '',
      info: '',
      accent: '',
    },
    variant: {
      soft: '',
      solid: 'border-transparent',
    },
    size: {
      sm: 'h-6 px-2 text-2xs',
      md: 'h-7 px-3 text-xs',
    },
  },
  compoundVariants: [
    { variant: 'soft', tone: 'neutral', class: 'border-line bg-surface-2 text-text-2' },
    { variant: 'soft', tone: 'good', class: 'border-good-edge bg-good-wash text-good-ink' },
    { variant: 'soft', tone: 'warning', class: 'border-warning-edge bg-warning-wash text-warning-ink' },
    { variant: 'soft', tone: 'serious', class: 'border-serious-edge bg-serious-wash text-serious-ink' },
    { variant: 'soft', tone: 'critical', class: 'border-critical-edge bg-critical-wash text-critical-ink' },
    { variant: 'soft', tone: 'info', class: 'border-info-edge bg-info-wash text-info-ink' },
    {
      variant: 'soft',
      tone: 'accent',
      class: 'border-[color-mix(in_srgb,var(--ds-accent)_30%,transparent)] bg-accent-wash text-accent-ink',
    },
    { variant: 'solid', tone: 'neutral', class: 'bg-surface-3 text-text-1' },
    { variant: 'solid', tone: 'good', class: 'bg-good text-good-on' },
    { variant: 'solid', tone: 'warning', class: 'bg-warning text-warning-on' },
    { variant: 'solid', tone: 'serious', class: 'bg-serious text-serious-on' },
    { variant: 'solid', tone: 'critical', class: 'bg-critical text-critical-on' },
    { variant: 'solid', tone: 'info', class: 'bg-info text-info-on' },
    { variant: 'solid', tone: 'accent', class: 'bg-accent text-on-accent' },
  ],
  defaultVariants: { tone: 'neutral', variant: 'soft', size: 'md' },
});

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badge> & {
    /** Ícone à esquerda. Substitui o ponto — não se somam. */
    icon?: React.ReactNode;
  };

/**
 * Chapa de estado: "Activo", "Vencido", "Em revisão".
 *
 * Leva sempre ponto ou ícone além da cor. Um badge que só se distingue pelo
 * vermelho não existe para quem não distingue vermelho de verde — e são 8% dos
 * homens (WCAG 1.4.1).
 */
export function Badge({ className, tone, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badge({ tone, variant, size }), className)} {...props}>
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : (
        // `bg-current` herda a tinta do texto: um ponto por tom sem uma classe por tom.
        <span aria-hidden="true" className="size-2 shrink-0 rounded-pill bg-current" />
      )}
      {children}
    </span>
  );
}
