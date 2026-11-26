import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

export type Crumb = {
  label: string;
  /** Sem `href` o nível não é navegável — o último nunca leva. */
  href?: string;
};

export type BreadcrumbsProps = Omit<React.ComponentProps<'nav'>, 'children'> & {
  items: Crumb[];
  /**
   * Quantos níveis ficam visíveis antes de o meio colapsar. Contagem e não
   * medição: um trilho que se reorganiza a meio do redimensionamento salta à
   * frente de quem o está a ler, e a largura disponível aqui depende das
   * acções ao lado, que este componente não conhece.
   */
  maxVisible?: number;
  /** Nome da região para leitor de ecrã. */
  label?: string;
};

function Separador() {
  return <Icone de={ICONES.seguinte} className="text-text-3" />;
}

/**
 * Trilho de navegação: onde estou e por onde vim.
 *
 * O último nível é texto com `aria-current="page"`, não uma ligação para a
 * página onde já se está.
 */
export function Breadcrumbs({
  items,
  maxVisible = 4,
  label = 'Trilho de navegação',
  className,
  ...props
}: BreadcrumbsProps) {
  const colapsa = items.length > maxVisible;
  const escondidos = colapsa ? items.slice(1, items.length - (maxVisible - 1)) : [];
  // `null` marca o sítio das reticências — mantém a ordem sem um segundo array.
  const visiveis: (Crumb | null)[] = colapsa
    ? [...items.slice(0, 1), null, ...items.slice(items.length - (maxVisible - 1))]
    : items;

  return (
    <nav aria-label={label} className={cn('min-w-0', className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {visiveis.map((item, indice) => {
          const ultimo = indice === visiveis.length - 1;

          return (
            <li
              key={item ? `${item.label}-${indice}` : `elidido-${indice}`}
              /*
              | Só o ÚLTIMO nível encolhe. Os intermédios são `shrink-0` e o
              | trilho quebra linha — que é o que `flex-wrap` no `<ol>` existe
              | para fazer.
              |
              | Antes eram todos `min-w-0 truncate`, e num ecrã de 390px o
              | resultado medido foram ligações de 8px de largura: alvo
              | impossível de acertar e rótulo invisível, porque a 8px nem as
              | reticências cabem. `min-w-0` autoriza mesmo o encolhimento até
              | zero — não é uma salvaguarda, é o contrário.
              */
              className={cn('flex items-center gap-1', ultimo ? 'min-w-0' : 'shrink-0')}
            >
              {indice > 0 ? <Separador /> : null}

              {item === null ? (
                <span className="inline-flex min-h-touch items-center px-1 text-text-3">
                  <span aria-hidden="true">…</span>
                  {/*
                    | Os níveis elididos continuam a ser lidos: quem navega por
                    | leitor de ecrã não vê que se cortou o meio e ficaria sem
                    | perceber de onde veio.
                  */}
                  <span className="ds-sr-only">{escondidos.map((c) => c.label).join(', ')}</span>
                </span>
              ) : ultimo ? (
                <span
                  aria-current="page"
                  className="inline-flex min-h-touch min-w-0 items-center truncate font-semibold text-text-1"
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="inline-flex min-h-touch items-center rounded-md px-1 whitespace-nowrap text-text-2 transition-colors duration-[var(--ds-motion-base)] ease-ds hover:text-text-1 hover:underline"
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
