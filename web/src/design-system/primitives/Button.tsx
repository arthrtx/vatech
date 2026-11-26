import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';
import { Spinner } from './Spinner';

/*
| Quatro variantes e três tons, cruzados em compoundVariants em vez de
| concatenados por template string: o Tailwind só gera a classe que consegue
| ler literalmente no ficheiro. `bg-${tom}` compila e sai sem cor.
|
| A altura vem do token de controlo (32/40/48) e não de `h-8`/`h-10`/`h-12`:
| são os mesmos pixéis hoje, mas quem mudar a densidade do sistema mexe no
| token e não em doze ficheiros.
|
| `min-h-touch` abaixo do corte `sm` é a regra dos 44px (WCAG 2.5.5): a
| densidade de 32px é de rato, não de dedo. Acima do corte volta ao natural.
|
| O par `aria-disabled:*` existe por causa do `asChild`: `<a disabled>` não é
| coisa nenhuma — quando o elemento não é um `<button>`, o estado inactivo
| viaja em `aria-disabled`, e é essa a variante que tem de apagar o botão.
*/
const botao = cva(
  [
    'relative inline-flex items-center justify-center gap-3 rounded-md font-bold whitespace-nowrap select-none',
    'transition-colors duration-[var(--ds-motion-base)] ease-ds',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        solid: 'ds-press border border-transparent',
        outline: 'border-2 bg-transparent font-semibold',
        ghost: 'border border-transparent bg-transparent',
        subtle: 'border border-transparent',
      },
      tone: {
        accent: '',
        critical: '',
        neutral: '',
      },
      size: {
        sm: 'h-(--ds-control-h-sm) min-h-touch px-4 text-sm sm:min-h-0',
        md: 'h-(--ds-control-h-md) min-h-touch px-6 text-md sm:min-h-0',
        lg: 'h-(--ds-control-h-lg) min-h-touch px-7 text-lg sm:min-h-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      /*
      | A sombra dura da casa (`.ds-press`, 0 6px 0) lê `--ds-press-colour`.
      | Define-se aqui, a partir da própria cor de fundo via color-mix, para o
      | sistema não ter de conhecer a marca: qualquer accent que o projecto
      | ponha no contrato produz a sua própria sombra.
      */
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
    defaultVariants: { variant: 'solid', tone: 'accent', size: 'md', fullWidth: false },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof botao> &
  ComAsChild & {
    /** Ícone à esquerda do texto. Decorativo — o significado está no texto. */
    leading?: React.ReactNode;
    /** Ícone à direita do texto. */
    trailing?: React.ReactNode;
    /** Troca o ícone da esquerda por um spinner, marca `aria-busy` e bloqueia o botão. */
    isLoading?: boolean;
  };

/**
 * Acção. Por omissão é `<button>` — um `div` com `onClick` não recebe foco, não
 * responde a Enter/Space e não é anunciado como controlo.
 *
 * `tone="critical"` para acção destrutiva (apagar, cancelar assinatura). A cor
 * não chega para avisar: acompanhar com texto explícito no rótulo.
 *
 * `tone="neutral"` para a saída segura ao lado de uma acção com peso — o
 * "Cancelar" de um diálogo de confirmação. Sem ele, quem monta o diálogo
 * desenha o botão neutro à mão e passa a haver dois botões no sistema.
 *
 * Com `asChild` o elemento passa a ser o filho único — tipicamente o `<Link>`
 * do Next. Três coisas mudam, e todas de propósito:
 *
 * 1. **`type` deixa de ser posto por omissão.** `type` num `<a>` é atributo
 *    inválido (descreve o tipo do recurso ligado, não o de um controlo). Só se
 *    escreve quando é o próprio `<button>` que rende, ou quando quem chama o
 *    passa explicitamente.
 * 2. **`disabled` passa a `aria-disabled`.** `<a disabled>` não desactiva nada.
 *    Assim o estado é o que os leitores de ecrã entendem, e o CSS apaga o botão
 *    pela mesma via. ⚠ Fica um buraco que só quem chama pode fechar:
 *    `pointer-events-none` trava o rato, mas um `<a href>` com foco continua a
 *    navegar com Enter — ligação que não pode ser seguida não se rende de todo.
 * 3. **O ícone e o spinner entram dentro do filho.** Um `Slot` exige um filho
 *    só, e o botão tem três (ícone, texto, ícone). O `Slottable` do Radix marca
 *    qual é o filho verdadeiro; os restantes são injectados lá dentro em vez de
 *    ficarem ao lado. É o mecanismo do Radix, não um segundo Slot escrito aqui.
 *
 * ```tsx
 * <Button asChild leading={<Plus />}>
 *   <Link href="/leads/novo">Novo lead</Link>
 * </Button>
 * ```
 */
export function Button({
  className,
  variant,
  tone,
  size,
  fullWidth,
  leading,
  trailing,
  isLoading = false,
  disabled = false,
  asChild = false,
  type,
  children,
  ...props
}: ButtonProps) {
  const Elemento = asChild ? Raiz : 'button';
  const inactivo = disabled || isLoading;

  return (
    <Elemento
      // Sem `type`, um botão dentro de `<form>` submete — quase nunca é o que se
      // quer. Com `asChild` o elemento pode não ser um botão: aí só sai o que
      // quem chama tiver pedido.
      type={asChild ? type : (type ?? 'button')}
      disabled={asChild ? undefined : inactivo}
      aria-disabled={asChild && inactivo ? true : undefined}
      aria-busy={isLoading || undefined}
      className={cn(botao({ variant, tone, size, fullWidth }), className)}
      {...props}
    >
      {isLoading ? (
        <Spinner decorative />
      ) : leading ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {leading}
        </span>
      ) : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {trailing ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {trailing}
        </span>
      ) : null}
    </Elemento>
  );
}
