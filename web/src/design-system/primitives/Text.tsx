import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Raiz, type ComAsChild } from '../lib/asChild';

/*
| Texto corrido e rótulos — tudo o que não é título.
|
| `size` só tem os degraus de interface. Os degraus de título (`text-h1`…
| `text-h4`) são do Heading: um parágrafo com 46px não é um parágrafo, é um
| título sem `<h>` — e é assim que se perde o índice do documento.
|
| `text-2xs` (12px) também fica de fora. A escala chama-lhe "limite absoluto —
| nunca para texto que tenha de ser lido"; oferecê-lo aqui era pôr a armadilha
| ao alcance de quem só quer que a legenda caiba na coluna.
|
| `tone` mistura, de propósito, dois grupos que a documentação separa:
|  - os três NÍVEIS DE LEITURA (`strong`/`neutral`/`muted` = text-1/2/3), que
|    não têm significado nenhum, só peso na página;
|  - os tons SEMÂNTICOS do vocabulário da casa, que dizem alguma coisa sobre o
|    facto que o texto reporta.
| São o mesmo eixo porque produzem a mesma declaração — a cor do texto — e dois
| props a discutir a mesma propriedade dão sempre um vencedor por acidente.
| Os cinco tons de feedback estão cá todos: se faltasse um, quem escrevesse a
| mensagem tinha de mentir sobre a severidade (§4-bis).
|
| A tinta usada é sempre a `-ink` de cada tom — a versão medida para ler sobre
| superfície, que segue o tema. As chapas (`bg-critical` e companhia) não são
| cor de texto e não entram aqui.
*/
const texto = cva('', {
  variants: {
    size: {
      lg: 'text-lg',
      md: 'text-md',
      base: 'text-base',
      sm: 'text-sm',
      xs: 'text-xs',
    },
    tone: {
      /** O corpo. É o normal, e por isso é o valor por omissão. */
      neutral: 'text-text-2',
      /** O que se lê primeiro numa linha: o valor, o nome, o total. */
      strong: 'text-text-1',
      /** Auxiliar — ver o aviso de contraste no JSDoc do componente. */
      muted: 'text-text-3',
      accent: 'text-accent-ink',
      good: 'text-good-ink',
      warning: 'text-warning-ink',
      serious: 'text-serious-ink',
      critical: 'text-critical-ink',
      info: 'text-info-ink',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: { size: 'base', tone: 'neutral', weight: 'regular' },
});

/*
| Os elementos que fazem sentido: parágrafo, pedaço em linha, célula de lista
| de definições, item de lista. `<label>` não está cá — um rótulo de campo
| precisa de `htmlFor` e de estar ligado ao erro, e isso é da família `forms`.
*/
type ElementoDeTexto = 'p' | 'span' | 'div' | 'dd' | 'dt' | 'li';

export type TextProps = React.ComponentProps<'p'> &
  VariantProps<typeof texto> &
  ComAsChild & {
    /**
     * O elemento a render. `<p>` por omissão; `span` para texto dentro de uma
     * frase, `dt`/`dd` para pares rótulo-valor, `li` dentro de listas.
     */
    as?: ElementoDeTexto;
  };

/**
 * Texto. Tudo o que se lê e não é título.
 *
 * `tone="muted"` é o `text-3`, o terceiro dos três níveis de leitura. **Passa
 * 4.5:1 nas quatro superfícies, nos dois temas** (5.62:1 sobre `plane`, 5.92:1
 * sobre `surface-1`, 5.37:1 sobre `surface-2`, 4.86:1 sobre `surface-3` no
 * claro). Serve para legenda, unidade, *eyebrow*, descrição auxiliar,
 * `placeholder` e desactivado.
 *
 * ⚠ **Este aviso já disse o contrário, e a versão antiga ainda anda por aí.**
 * O `text-3` valia `#898781` e dava 3.59:1 — reprovava. O gate de runtime
 * apanhou-o em 269 pedaços de texto informativo e o token passou a `#66645d`.
 * Trocar `text-text-3` por `text-text-2` numa legenda **hoje** não corrige
 * nada: achata a hierarquia de três níveis para dois (REGRAS-UI-UX §6).
 *
 * ⚠ Um tom sozinho não é estado (§5): a mensagem de erro em `critical` leva
 * ícone ou a palavra, senão quem não distingue a cor não vê erro nenhum.
 *
 * Prosa longa vai dentro de um `max-w-(--container-text)` — a medida de leitura
 * é do contentor, não deste componente, que também serve células de tabela.
 *
 * ```tsx
 * <Text>O relatório corre todas as noites às 03:00.</Text>
 * <Text as="span" size="sm" tone="muted">actualizado há 2 min</Text>
 * ```
 */
export function Text({ className, size, tone, weight, as = 'p', asChild = false, ...props }: TextProps) {
  const Elemento = asChild ? Raiz : as;

  /*
  | As props estão tipadas contra `<p>` — o caso comum, e o que dá bom
  | preenchimento automático. O elemento, esse, escolhe-se em runtime, e o
  | TypeScript não consegue casar um `<p>` com um `<li>` sem que quem usa
  | tenha de dizer o elemento no tipo.
  |
  | A conversão é aqui, num sítio só, e é segura: os seis elementos aceites
  | são todos de conteúdo em fluxo e partilham os atributos globais. Um
  | genérico `Text<T extends ElementType>` dava tipagem exacta e obrigava a
  | anotar o elemento em cada uso — troca que não compensa num componente
  | usado centenas de vezes para escrever um parágrafo.
  */
  const Componente = Elemento as React.ElementType;

  return <Componente className={cn(texto({ size, tone, weight }), className)} {...props} />;
}
