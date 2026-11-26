'use client';

import { Popover as Radix } from 'radix-ui';
import { cn } from '../lib/cn';

/*
| Conteúdo livre ancorado a um gatilho — um filtro, um selector de datas, uma
| ficha resumida. Distingue-se do DropdownMenu por dentro: aqui não há navegação
| por setas nem itens; o que entra é conteúdo normal, com os seus próprios
| controlos focáveis.
|
| Distingue-se do Tooltip por fora: o popover abre por clique e o conteúdo é
| alcançável por teclado — logo pode levar informação que interessa.
*/

export type PopoverProps = React.ComponentProps<typeof Radix.Root>;

/** Raiz do popover. Reexporta o Radix — o tipo existe para quem o embrulhe. */
export const Popover = Radix.Root;

export type PopoverTriggerProps = React.ComponentProps<typeof Radix.Trigger>;

/** Envolve o botão que abre. Usar com `asChild` para não empilhar dois botões. */
export function PopoverTrigger(props: PopoverTriggerProps) {
  return <Radix.Trigger {...props} />;
}

export type PopoverContentProps = React.ComponentProps<typeof Radix.Content> & {
  /** Seta a apontar ao gatilho. Desligar quando o popover é largo e a âncora óbvia. */
  arrow?: boolean;
};

export function PopoverContent({
  className,
  sideOffset = 8,
  align = 'center',
  arrow = true,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <Radix.Portal>
      <Radix.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-[var(--ds-z-popover)] max-w-(--container-text) rounded-lg border border-line bg-surface-1 p-4 shadow-float',
          'text-sm text-text-2',
          'opacity-100 transition-opacity duration-[var(--ds-motion-fast)] ease-ds starting:opacity-0',
          className,
        )}
        {...props}
      >
        {children}
        {arrow ? (
          /*
          | A seta é um triângulo pintado, não uma caixa rodada: não herda a
          | borda do painel. Fica com a cor da superfície e sem contorno — que
          | é o compromisso normal, porque desenhar a borda da seta obriga a
          | dois triângulos sobrepostos com meio pixel de desvio.
          */
          <Radix.Arrow className="fill-surface-1" width={12} height={6} />
        ) : null}
      </Radix.Content>
    </Radix.Portal>
  );
}
