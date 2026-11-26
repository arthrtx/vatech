"use client";

import type { FeriasResumo, User } from "@/lib/api";
import { rotuloPapel } from "@/lib/rotulos";
import Avatar from "./Avatar";
import { vidro } from "./ui";

interface Props {
  user: User;
  /** Cúmulo de férias (só admin); sem limite anual não mostra nada. */
  ferias?: FeriasResumo;
  /** Abre a vista geral da pessoa. */
  onVer?: () => void;
}

export default function FuncionarioLinha({ user, ferias, onVer }: Props) {
  return (
    <li className={`${vidro} flex min-h-[7.5rem] p-4`}>
      <button
        type="button"
        onClick={onVer}
        disabled={!onVer}
        aria-label={`Ver ${user.nome}`}
        className="-m-1 flex w-[calc(100%+0.5rem)] flex-1 items-center gap-3 rounded-cartao p-1 text-left enabled:hover:bg-primaria-suave/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
      >
        <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-12 w-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate font-semibold">{user.nome}</p>
            <p className="inline-flex rounded-full bg-campo px-3 py-0.5 text-xs font-semibold text-texto ring-1 ring-linha-forte">{rotuloPapel(user)}</p>
            <p className="text-xs font-semibold text-texto-suave" data-testid="conta-id">ID {user.id}</p>
          </div>
          <p className="truncate text-sm text-texto-suave">{user.email}</p>
          {user.cargo && <p className="truncate text-sm text-texto-suave">{user.cargo}</p>}
          {ferias?.dias_ano != null && (
            <div className="mt-2">
              <p className="text-sm text-texto-suave">
                Férias: {ferias.usados}/{ferias.dias_ano + ferias.transitados} dias úteis
                {ferias.transitados > 0 && ` (${ferias.transitados} transitados)`}
              </p>
              {!!ferias.pontes && <p className="text-xs text-texto-suave">Pontes: {ferias.pontes} {ferias.pontes === 1 ? "dia" : "dias"}</p>}
              <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-trilho">
                <div
                  className="h-full rounded-full bg-primaria"
                  style={{ width: `${Math.min(100, (ferias.usados / Math.max(1, ferias.dias_ano + ferias.transitados)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </button>
    </li>
  );
}
