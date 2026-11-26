import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';
import { Spinner } from './Spinner';

// `aria-disabled:*` acompanha `disabled:*` pela mesma razão do Button: com
// `asChild` o elemento pode ser um `<a>`, e `<a disabled>` não desactiva nada.
const iconButton = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center rounded-md select-none',
    'transition-colors duration-[var(--ds-motion-base)] ease-ds',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        solid: 'ds-press border border-transparent',
        outline: 'border-2 bg-transparent',
        ghost: 'border border-transparent bg-transparent',
        subtle: 'border border-transparent',
      },
      tone: {
        accent: '',
        critical: '',
        neutral: '',
      },
      // Quadrado: a mesma medida do token de controlo nos dois eixos.
      size: {
        sm: 'size-(--ds-control-h-sm) min-h-touch min-w-touch sm:min-h-0 sm:min-w-0',
        md: 'size-(--ds-control-h-md) min-h-touch min-w-touch sm:min-h-0 sm:min-w-0',
        lg: 'size-(--ds-control-h-lg) min-h-touch min-w-touch sm:min-h-0 sm:min-w-0',
      },
    },
    compoundVariants: [
      {
        variant: 'solid',
        tone: 'accent',
        class:
          'bg-accent text-on-accent hover:bg-accent-hover [--ds-press-colour:color-mix(in_srgb,var(--ds-accent)_40%,transparent)]',
      },
      {
        variant: 'solid',
        tone: 'critical',
        class:
          'bg-critical text-critical-on hover:bg-critical-ink [--ds-press-colour:color-mix(in_srgb,var(--ds-critical)_40%,transparent)]',
      },
      {
        variant: 'solid',
        tone: 'neutral',
        class:
          'bg-surface-3 text-text-1 hover:bg-surface-2 [--ds-press-colour:color-mix(in_srgb,var(--ds-text-1)_20%,transparent)]',
      },
      { variant: 'outline', tone: 'accent', class: 'border-accent text-accent-ink hover:bg-accent-wash' },
      { variant: 'outline', tone: 'critical', class: 'border-critical text-critical-ink hover:bg-critical-wash' },
      { variant: 'outline', tone: 'neutral', class: 'border-line-strong text-text-1 hover:bg-wash' },
      { variant: 'ghost', tone: 'accent', class: 'text-accent-ink hover:bg-accent-wash' },
      { variant: 'ghost', tone: 'critical', class: 'text-critical-ink hover:bg-critical-wash' },
      { variant: 'ghost', tone: 'neutral', class: 'text-text-2 hover:bg-wash hover:text-text-1' },
      {
        variant: 'subtle',
        tone: 'accent',
        class: 'bg-accent-wash text-accent-ink hover:bg-[color-mix(in_srgb,var(--ds-accent)_22%,transparent)]',
      },
      {
        variant: 'subtle',
        tone: 'critical',
        class: 'bg-critical-wash text-critical-ink hover:bg-[color-mix(in_srgb,var(--ds-critical)_22%,transparent)]',
      },
      { variant: 'subtle', tone: 'neutral', class: 'bg-surface-2 text-text-1 hover:bg-surface-3' },
    ],
    defaultVariants: { variant: 'ghost', tone: 'neutral', size: 'md' },
  },
);

type IconButtonBase = Omit<React.ComponentProps<'button'>, 'aria-label' | 'children'> &
  VariantProps<typeof iconButton> &
  ComAsChild & {
    /**
     * Obrigatório no tipo, não por convenção: um botão só com ícone não tem
     * texto nenhum para anunciar, e esquecer o rótulo não dá erro em lado
     * nenhum — o botão fica simplesmente mudo para quem usa leitor de ecrã.
     *
     * **Continua obrigatório com `asChild`.** A alternativa — torná-lo opcional
     * quando há filho, a contar que o filho traga o seu — é exactamente o tipo
     * de obrigação que desaparece em silêncio: ninguém verifica o filho, e o
     * botão fica mudo sem um único erro. Quem preferir nomear no filho não
     * perde nada: o `Slot` do Radix dá precedência às props do filho, portanto
     * um `aria-label` escrito lá ganha a este.
     */
    'aria-label': string;
    /**
     * O ícone. Fica decorativo — quem nomeia o botão é o `aria-label`.
     *
     * Com `asChild` é o elemento do consumidor (um `<Link>`, por exemplo) e o
     * ícone vai lá dentro; deixa de haver o `<span aria-hidden>` desta casa,
     * porque o filho é que passa a ser o botão.
     */
    children: React.ReactNode;
  };

export type IconButtonProps = IconButtonBase &
  /*
  | `isLoading` e `asChild` não coexistem, e o tipo é que o diz.
  |
  | No Button o spinner é irmão do texto — entra no filho pelo `Slottable` e
  | tudo continua a funcionar. Aqui o ícone é o conteúdo todo, e com `asChild`
  | esse conteúdo está dentro do elemento do consumidor: trocá-lo por um
  | spinner obrigava a mexer nos filhos dele. Aceitar o prop e não o honrar
  | seria a falha silenciosa de sempre; recusá-lo no tipo dá erro onde se
  | escreve. Ligação que espera não é ligação — é acção, e essa é `<button>`.
  */
  ({ asChild?: false | undefined; isLoading?: boolean } | { asChild: true; isLoading?: never });

/**
 * Acção sem texto: fechar, copiar, apagar linha.
 *
 * Com `asChild` vale o mesmo que no Button: `type` só sai num `<button>` e
 * `disabled` viaja em `aria-disabled`, porque num `<a>` nenhum dos dois
 * significa o que parece.
 */
export function IconButton({
  className,
  variant,
  tone,
  size,
  isLoading = false,
  disabled = false,
  asChild = false,
  type,
  children,
  ...props
}: IconButtonProps) {
  const Elemento = asChild ? Raiz : 'button';
  const inactivo = disabled || isLoading;

  return (
    <Elemento
      type={asChild ? type : (type ?? 'button')}
      disabled={asChild ? undefined : inactivo}
      aria-disabled={asChild && inactivo ? true : undefined}
      aria-busy={isLoading || undefined}
      className={cn(iconButton({ variant, tone, size }), className)}
      {...props}
    >
      {asChild ? (
        children
      ) : isLoading ? (
        <Spinner decorative />
      ) : (
        <span aria-hidden="true" className="inline-flex">
          {children}
        </span>
      )}
    </Elemento>
  );
}
