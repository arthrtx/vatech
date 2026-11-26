import { cn } from '../lib/cn';

/*
| `title` colide com o atributo `title` do HTML (a tooltip do browser), que
| aqui seria uma string e não o nosso texto de estado vazio — daí o `Omit`.
| É o mesmo compromisso do EmptyState: o nome do conceito vale mais do que o
| atributo nativo, que ninguém põe numa célula de tabela.
*/
export type TableEmptyProps = Omit<React.ComponentProps<'td'>, 'title'> & {
  /**
   * Número de colunas da tabela. Sem isto a célula ocupa uma coluna e a
   * mensagem aparece encostada à esquerda, com o resto da linha em branco.
   */
  colSpan: number;
  /** Frase curta que diz o que não há. "Sem resultados", não "Vazio". */
  title?: string;
  /** O que fazer a seguir — limpar um filtro, alargar o intervalo de datas. */
  description?: string;
  /** Acção única. Um estado vazio com três botões não ajuda a decidir. */
  action?: React.ReactNode;
};

/**
 * Estado vazio DENTRO da tabela: mantém o cabeçalho de pé, e com ele as
 * colunas que explicam o que ali devia estar. Substituir a tabela toda por
 * uma caixa faz perder esse contexto.
 */
export function TableEmpty({
  className,
  colSpan,
  title = 'Sem resultados',
  description,
  action,
  children,
  ...props
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('px-4 py-12 text-center', className)} {...props}>
        {children ?? (
          <div className="mx-auto flex max-w-(--container-text) flex-col items-center gap-2">
            <h3 className="text-md font-semibold text-text-1">{title}</h3>
            {description ? <p className="text-sm text-text-2">{description}</p> : null}
            {action ? <div className="mt-2">{action}</div> : null}
          </div>
        )}
      </td>
    </tr>
  );
}
