'use client';

import { DropdownMenu as Radix } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { IconeAvancar } from './internals';

/*
| Menu de acções ancorado a um gatilho. É composto e não monolítico: um menu
| real tem grupos, separadores e sub-menus, e uma prop `items` acabava sempre
| a crescer até ser uma linguagem de marcação pior do que JSX.
|
| Tudo o que é teclado — setas, `Home`/`End`, escrever para saltar, `Esc`,
| devolver o foco ao gatilho — vem do Radix.
*/

/*
| Camada `popover` (95) e não `dropdown` (60): o menu vai para o <body> por
| portal e abre também de dentro de um Modal, cujo véu está a 80. Abaixo dele,
| o menu via-se e o clique caía no véu.
*/
const superficie = [
  'z-[var(--ds-z-popover)] min-w-(--radix-dropdown-menu-trigger-width) overflow-hidden',
  'rounded-lg border border-line bg-surface-1 p-1 shadow-float',
  'opacity-100 transition-opacity duration-[var(--ds-motion-fast)] ease-ds starting:opacity-0',
].join(' ');

const item = cva(
  [
    'relative flex min-h-touch w-full cursor-default items-center gap-3 rounded-md px-3',
    // `outline-hidden` e não `outline-none`: o foco do item é do Radix e o
    // contorno tem de sobreviver ao modo de cores forçadas (CONVENÇÕES §5).
    'text-sm text-text-2 outline-hidden select-none',
    'transition-colors duration-[var(--ds-motion-fast)] ease-ds',
    // `data-highlighted` cobre rato e teclado ao mesmo tempo — o Radix não
    // distingue "hover" de "item activo pelas setas", e ainda bem.
    'data-[disabled]:pointer-events-none data-[disabled]:text-text-3',
  ],
  {
    variants: {
      tone: {
        neutral: 'data-[highlighted]:bg-wash data-[highlighted]:text-text-1',
        critical: 'text-critical-ink data-[highlighted]:bg-critical-wash',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type DropdownMenuProps = React.ComponentProps<typeof Radix.Root>;

/** Raiz do menu. Reexporta o Radix — o tipo existe para quem embrulhe o menu inteiro. */
export const DropdownMenu = Radix.Root;

export type DropdownMenuTriggerProps = React.ComponentProps<typeof Radix.Trigger>;

/** Envolve o botão que abre o menu. Usar sempre com `asChild`. */
export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <Radix.Trigger {...props} />;
}

export type DropdownMenuContentProps = React.ComponentProps<typeof Radix.Content>;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: DropdownMenuContentProps) {
  return (
    <Radix.Portal>
      <Radix.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(superficie, className)}
        {...props}
      />
    </Radix.Portal>
  );
}

export type DropdownMenuItemProps = React.ComponentProps<typeof Radix.Item> &
  VariantProps<typeof item> & {
    /** Ícone à esquerda. Decorativo — o texto do item é que dá o significado. */
    leading?: React.ReactNode;
    /** Atalho de teclado, mostrado à direita. Ex.: "Ctrl K". */
    shortcut?: string;
  };

export function DropdownMenuItem({
  className,
  tone,
  leading,
  shortcut,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <Radix.Item className={cn(item({ tone }), className)} {...props}>
      {leading}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut> : null}
    </Radix.Item>
  );
}

export type DropdownMenuLabelProps = React.ComponentProps<typeof Radix.Label>;

/** Cabeçalho de um grupo de itens. Não é focável nem accionável. */
export function DropdownMenuLabel({ className, ...props }: DropdownMenuLabelProps) {
  return <Radix.Label className={cn('px-3 py-2 text-xs font-semibold text-text-3', className)} {...props} />;
}

export type DropdownMenuSeparatorProps = React.ComponentProps<typeof Radix.Separator>;

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  return <Radix.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />;
}

export type DropdownMenuSubProps = React.ComponentProps<typeof Radix.Sub>;

/** Raiz de um sub-menu. */
export const DropdownMenuSub = Radix.Sub;

export type DropdownMenuSubTriggerProps = React.ComponentProps<typeof Radix.SubTrigger> & {
  leading?: React.ReactNode;
};

export function DropdownMenuSubTrigger({ className, leading, children, ...props }: DropdownMenuSubTriggerProps) {
  return (
    <Radix.SubTrigger
      className={cn(item(), 'data-[state=open]:bg-wash data-[state=open]:text-text-1', className)}
      {...props}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <IconeAvancar className="size-4 text-text-3" />
    </Radix.SubTrigger>
  );
}

export type DropdownMenuSubContentProps = React.ComponentProps<typeof Radix.SubContent>;

export function DropdownMenuSubContent({ className, sideOffset = 4, ...props }: DropdownMenuSubContentProps) {
  return (
    <Radix.Portal>
      <Radix.SubContent sideOffset={sideOffset} className={cn(superficie, className)} {...props} />
    </Radix.Portal>
  );
}

export type DropdownMenuShortcutProps = React.ComponentProps<'kbd'>;

/*
| Atalho de teclado visível. É `<kbd>` e não um `<span>` porque é isso que o
| elemento significa, e `ds-tabular` para que dois atalhos alinhem em coluna
| em vez de dançarem conforme as letras.
*/
export function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
  return (
    <kbd
      className={cn('ds-tabular ml-auto pl-6 font-sans text-xs tracking-wide text-text-3', className)}
      {...props}
    />
  );
}
