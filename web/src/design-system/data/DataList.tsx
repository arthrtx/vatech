import { cn } from '../lib/cn';

/**
 * Lista de pares chave/valor — detalhe de um registo, resumo de uma
 * encomenda, ficha de servidor.
 *
 * É `<dl>` e não uma tabela de duas colunas: uma tabela promete que as linhas
 * se comparam entre si, e aqui não se comparam. O leitor de ecrã também as
 * anuncia aos pares, "rótulo, valor".
 */
export type DataListProps = React.ComponentProps<'dl'>;

export function DataList({ className, ...props }: DataListProps) {
  return <dl className={cn('divide-y divide-line', className)} {...props} />;
}

export type DataListItemProps = React.ComponentProps<'div'> & {
  /** O rótulo. Vai para `<dt>`. */
  label: React.ReactNode;
};

export function DataListItem({ label, className, children, ...props }: DataListItemProps) {
  return (
    /*
    | O `<div>` entre `<dl>` e `<dt>` é HTML válido desde o HTML 5.2 e é o que
    | permite agrupar o par para o layout. Em telemóvel empilha; a partir do
    | tablet passa a duas colunas — o rótulo curto não merece meia largura.
    */
    <div className={cn('py-3 md:grid md:grid-cols-3 md:gap-6', className)} {...props}>
      <dt className="text-sm font-medium text-text-2">{label}</dt>
      <dd className="mt-1 text-sm text-text-1 md:col-span-2 md:mt-0">{children}</dd>
    </div>
  );
}
