'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../overlays';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

export type UserMenuItem = {
  label: string;
  /**
   * Endereço para onde o item navega. Sem ele, o item apenas dispara
   * `onSelect`.
   */
  href?: string;
  icon?: React.ReactNode;
  /** `critical` para acções destrutivas — terminar sessão, apagar conta. */
  tone?: 'neutral' | 'critical';
  onSelect?: () => void;
  disabled?: boolean;
};

export type UserMenuProps = Omit<React.ComponentProps<'button'>, 'children'> & {
  name: string;
  email?: string;
  /** Retrato. Sem ele saem as iniciais do nome. */
  avatarUrl?: string;
  items: UserMenuItem[];
};

/** Duas iniciais no máximo — três já não cabem num círculo de 32px. */
function iniciaisDe(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Retrato do utilizador com o menu da conta.
 *
 * O nome e o email repetem-se dentro do menu de propósito: em ecrã estreito o
 * gatilho mostra só o retrato, e sem esse cabeçalho abria-se um menu de conta
 * sem dizer de que conta se trata.
 *
 * A superfície, o realce e o teclado são os do `DropdownMenu` da família
 * `overlays` — este componente só decide o que vai lá dentro.
 */
export function UserMenu({
  name,
  email,
  avatarUrl,
  items,
  className,
  ...props
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-touch items-center gap-2 rounded-md px-1.5 text-left transition-colors duration-[var(--ds-motion-base)] ease-ds hover:bg-wash',
            className,
          )}
          {...props}
        >
          {avatarUrl ? (
            // `alt` vazio de propósito: o nome está já a seguir em texto, e
            // repeti-lo no retrato fá-lo-ia ser lido duas vezes.
            <img
              src={avatarUrl}
              alt=""
              className="size-8 shrink-0 rounded-pill border border-line object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-pill bg-accent-wash text-xs font-bold text-accent-ink"
            >
              {iniciaisDe(name)}
            </span>
          )}

          <span className="hidden min-w-0 flex-col lg:flex">
            <span className="truncate text-sm font-semibold text-text-1">{name}</span>
            {email ? <span className="truncate text-2xs text-text-3">{email}</span> : null}
          </span>

          <span className="ds-sr-only">{`Conta de ${name}`}</span>
          <Icone de={ICONES.expandir} className="text-text-3" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" collisionPadding={8}>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-text-1">{name}</span>
          {email ? <span className="block truncate text-2xs text-text-3">{email}</span> : null}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            tone={item.tone}
            disabled={item.disabled}
            leading={
              item.icon ? (
                <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
                  {item.icon}
                </span>
              ) : undefined
            }
            /*
            | O item com `href` navega daqui e não é uma âncora. Não é
            | preferência: o `DropdownMenuItem` embrulha o conteúdo num
            | `<span>`, logo o `asChild` do Radix — que exige filho único — não
            | serve, e uma âncora *dentro* do item perdia o teclado (o Radix
            | clica no item, não no que está lá dentro). O destino é o mesmo
            | que a âncora dava: navegação completa, não de cliente.
            */
            onSelect={() => {
              item.onSelect?.();
              if (item.href) window.location.assign(item.href);
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
