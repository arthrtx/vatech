"use client";

import type { FeriasResumo, User } from "@/lib/api";
import { papeis } from "@/lib/rotulos";
import Avatar from "./Avatar";

interface Props {
  user: User;
  /** Cúmulo de férias (só admin); sem limite anual não mostra nada. */
  ferias?: FeriasResumo;
  /** Abre a vista geral da pessoa. */
  onVer?: () => void;
}

export default function FuncionarioLinha({ user, ferias, onVer }: Props) {
  return (
    <li className="rounded-cartao bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 p-3">
      <button
        type="button"
        onClick={onVer}
        disabled={!onVer}
        aria-label={`Ver ${user.nome}`}
        className="-m-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-controlo p-1 text-left enabled:hover:bg-primaria-suave/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
      >
        <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-8 w-8 text-xs" />
        <div className="min-w-0">
          <p className="font-medium">{user.nome}</p>
          <p className="break-all text-sm text-texto-suave">{user.email}</p>
          <p className="text-sm text-texto-suave">{papeis[user.papel]}</p>
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
