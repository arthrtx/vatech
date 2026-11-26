import { cn } from '../lib/cn';

export type SidebarNavProps = React.ComponentProps<'nav'> & {
  /** Nome da região para leitor de ecrã. Distingue-a de outras `<nav>`. */
  label?: string;
};

/**
 * Lista de navegação da barra lateral.
 *
 * A `<ul>` está aqui e não em cada item: uma navegação é uma lista, e é isso
 * que faz um leitor de ecrã anunciar "6 itens" antes de a percorrer. Os filhos
 * (`SidebarItem`, `SidebarGroup`) são todos `<li>`.
 */
export function SidebarNav({
  label = 'Navegação principal',
  className,
  children,
  ...props
}: SidebarNavProps) {
  return (
    <nav aria-label={label} className={cn('w-full', className)} {...props}>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </nav>
  );
}
