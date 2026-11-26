"use client";

import type { FeriasResumo, TipoPessoa, User } from "@/lib/api";
import { papeis, rotuloPapel } from "@/lib/rotulos";
import Avatar from "./Avatar";
import { input, vidro } from "./ui";

interface Props {
  user: User;
  /** Cúmulo de férias (só admin); sem limite anual não mostra nada. */
  ferias?: FeriasResumo;
  /** Abre a vista geral da pessoa. */
  onVer?: () => void;
  /** Só admin: tipos personalizados e acção para mudar o tipo (`tipo_id` null = papel base). */
  tipos?: TipoPessoa[];
  onMudarTipo?: (tipo_id: number | null, papel?: "funcionario" | "estagiario") => void;
  /** Erro ao mudar o tipo desta pessoa. */
  erroTipo?: string | null;
}

export default function FuncionarioLinha({ user, ferias, onVer, tipos = [], onMudarTipo, erroTipo }: Props) {
  const valor = user.tipo_id ? `t${user.tipo_id}` : user.papel;
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
          <p className="mt-1 inline-flex rounded-full bg-campo px-3 py-0.5 text-xs font-semibold text-texto ring-1 ring-linha-forte">{rotuloPapel(user)}</p>
          {ferias?.dias_ano != null && (
            <p className="text-sm text-texto-suave">
              Férias: {ferias.usados}/{ferias.dias_ano + ferias.transitados} dias úteis
              {ferias.transitados > 0 && ` (${ferias.transitados} transitados)`}
            </p>
          )}
        </div>
      </button>
      {onMudarTipo && user.papel !== "admin" && (
        <div className="mt-3">
          <label htmlFor={`tipo-${user.id}`} className="mb-1 block text-sm font-medium text-texto">
            Tipo
          </label>
          <select
            id={`tipo-${user.id}`}
            className={input}
            value={valor}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("t")) onMudarTipo(Number(v.slice(1)));
              else onMudarTipo(null, v as "funcionario" | "estagiario");
            }}
          >
            <option value="funcionario">{papeis.funcionario}</option>
            <option value="estagiario">{papeis.estagiario}</option>
            {tipos.map((t) => (
              <option key={t.id} value={`t${t.id}`}>
                {t.nome}
              </option>
            ))}
          </select>
          {erroTipo && (
            <p role="alert" className="mt-1 text-sm text-perigo">
              {erroTipo}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
