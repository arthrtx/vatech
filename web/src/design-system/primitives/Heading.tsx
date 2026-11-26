import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';

/*
| Dois eixos que a maior parte dos sistemas cola num só, e não devia.
|
| `level` é a semântica: `<h1>`…`<h6>`. É o que constrói o índice do documento,
| é por ele que um leitor de ecrã salta de secção em secção, e saltar um degrau
| (h2 → h4) é um erro de estrutura, não de gosto.
|
| `size` é o aspecto. Um título de secção de painel tem de ser pequeno mesmo
| sendo `<h2>`; o título de uma página de marketing tem de ser enorme mesmo
| quando já existe um `<h1>` acima. Com os dois amarrados, a única forma de
| acertar no aspecto é estragar a hierarquia — e foi o que a migração do painel
| fez à mão em cada `<h2 className="text-md">`.
|
| Os valores de `size` são os degraus da escala e não `sm`/`md`/`lg`: a escala
| tem cinco passos úteis para título e chamam-se `text-h1`…`text-h4` e
| `text-md`. Um nome inventado por cima obrigava a decorar a tabela de
| conversão; assim `size="h1"` é literalmente o degrau que sai.
|
| O peso vem agarrado ao degrau, e não em prop própria: os degraus grandes são
| `font-bold` e os pequenos `font-semibold` porque é isso que a casa já
| escrevia à mão. Um eixo a mais aqui seria uma decisão por ecrã que ninguém
| pediu.
*/
const titulo = cva('text-text-1', {
  variants: {
    size: {
      h1: 'text-h1 font-bold',
      h2: 'text-h2 font-bold',
      h3: 'text-h3 font-bold',
      h4: 'text-h4 font-semibold',
      md: 'text-md font-semibold',
    },
  },
  defaultVariants: { size: 'h2' },
});

/*
| O degrau que cada nível toma quando ninguém escolhe. Segue a escala enquanto
| ela tem degraus (1–4) e assenta em `md` para 5 e 6 — a escala não tem `h5`
| nem `h6`, e inventar dois degraus para os cobrir era criar tamanhos que mais
| ninguém usa.
*/
const NIVEL = {
  1: { tag: 'h1', size: 'h1' },
  2: { tag: 'h2', size: 'h2' },
  3: { tag: 'h3', size: 'h3' },
  4: { tag: 'h4', size: 'h4' },
  5: { tag: 'h5', size: 'md' },
  6: { tag: 'h6', size: 'md' },
} as const;

export type HeadingProps = React.ComponentProps<'h2'> &
  VariantProps<typeof titulo> &
  ComAsChild & {
    /**
     * O nível semântico: `<h1>`…`<h6>`. Escolhe-se pela estrutura da página,
     * nunca pelo tamanho que se quer ver — para isso existe o `size`.
     */
    level?: keyof typeof NIVEL;
  };

/**
 * Título. Um por secção, e o nível decide-se pela estrutura do documento.
 *
 * `size` é o degrau visual da escala e por omissão acompanha o `level`. Só se
 * escreve quando o aspecto tem de divergir da estrutura — um `<h2>` de secção
 * de painel é `size="md"`.
 *
 * ```tsx
 * <Heading level={1}>Leads</Heading>             // título de ecrã
 * <Heading level={2} size="md">Filtros</Heading> // secção dentro do ecrã
 * ```
 *
 * `asChild` existe para os casos raros em que o título é outra coisa — o
 * `<Accordion.Header>` do Radix, ou um título que é ele próprio uma ligação.
 * Exige um filho único, como todos os `asChild` da casa.
 */
export function Heading({ className, level = 2, size, asChild = false, ...props }: HeadingProps) {
  const nivel = NIVEL[level];
  const Elemento = asChild ? Raiz : nivel.tag;

  return <Elemento className={cn(titulo({ size: size ?? nivel.size }), className)} {...props} />;
}
