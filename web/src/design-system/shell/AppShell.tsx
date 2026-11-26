import { cn } from '../lib/cn';

export type AppShellProps = React.ComponentProps<'div'> & {
  /** Barra lateral. Esconde-se sozinha abaixo do corte `lg`. */
  sidebar?: React.ReactNode;
  /** Barra superior. É ela que fica sticky, não o contentor. */
  topbar?: React.ReactNode;
  /** `id` do `<main>`, para o emparelhar com o link de salto da página. */
  contentId?: string;
  /** Classes do `<main>` — normalmente para limitar a largura de leitura. */
  contentClassName?: string;
};

/**
 * Grelha da aplicação: barra lateral + barra superior + conteúdo.
 *
 * Flex e não grid de propósito: a largura da lateral vive dentro do `Sidebar`
 * (e muda quando ele colapsa). Num grid teria de ser repetida aqui, na
 * definição das colunas — dois sítios para o mesmo número, que divergem à
 * primeira alteração.
 *
 * Em desktop a lateral é sticky com altura de ecrã e é o conteúdo que rola;
 * abaixo do corte `lg` (1000px) ela desaparece e a navegação passa a ser o
 * `MobileNav`, que se compõe dentro do `Topbar` (slot `leading`) — assim o
 * gatilho fica na faixa que já existe, em vez de roubar mais uma linha de
 * altura ao ecrã, que é onde há menos.
 */
export function AppShell({
  sidebar,
  topbar,
  contentId,
  contentClassName,
  className,
  children,
  ...props
}: AppShellProps) {
  return (
    <div className={cn('min-h-dvh bg-plane lg:flex lg:items-start', className)} {...props}>
      {sidebar}

      {/*
        | `min-w-0` não é decoração: sem ele, uma tabela larga dentro do
        | conteúdo estica o item flex e empurra a barra lateral para fora do
        | ecrã, em vez de gerar scroll horizontal dentro do próprio conteúdo.
      */}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main
          id={contentId}
          className={cn(
            'min-w-0 flex-1 px-gutter-mobile py-8 lg:px-gutter lg:py-10',
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
