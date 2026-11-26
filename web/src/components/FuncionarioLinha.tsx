"use client";

import type { FeriasResumo, User } from "@/lib/api";
import { papeis } from "@/lib/rotulos";
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
    <li className={`${vidro} p-4`}>
      <button
        type="button"
        onClick={onVer}
        disabled={!onVer}
        aria-label={`Ver ${user.nome}`}
        className="-m-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-cartao p-1 text-left enabled:hover:bg-primaria-suave/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
      >
        <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-12 w-12 text-base" />
        <div className="min-w-0">
          <p className="font-semibold">{user.nome}</p>
          <p className="break-all text-sm text-texto-suave">{user.email}</p>
          <p className="mt-1 inline-flex rounded-full bg-campo px-3 py-0.5 text-xs font-semibold text-texto ring-1 ring-linha-forte">{papeis[user.papel]}</p>
          {ferias?.dias_ano != null && (
            <p className="text-sm text-texto-suave">
              Férias: {ferias.usados}/{ferias.dias_ano + ferias.transitados} dias úteis
              {ferias.transitados > 0 && ` (${ferias.transitados} transitados)`}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
