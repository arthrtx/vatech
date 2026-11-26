"use client";

import type { EstadoConta, FichaRh } from "@/lib/api";
import { rotuloPapel } from "@/lib/rotulos";
import Avatar from "./Avatar";
import { botaoSec, vidro } from "./ui";

const estadoConta: Record<EstadoConta, string> = { pendente: "Conta pendente", aprovado: "Conta ativa", recusado: "Conta recusada" };

/** Ficha de uma pessoa: dados principais, contagens e as duas ações (vista geral e abrir a ficha). */
export default function FichaRhCartao({ ficha, onVista, onAbrir }: { ficha: FichaRh; onVista: () => void; onAbrir: () => void }) {
  return (
    <li className={`${vidro} flex flex-col gap-4 p-5`}>
      <div className="flex items-center gap-3">
        <Avatar nome={ficha.nome} id={ficha.id} foto={ficha.avatar_url} className="h-14 w-14 text-lg" />
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{ficha.nome}</h3>
          <p className="break-all text-sm text-texto-suave">{ficha.email}</p>
          {ficha.cargo && <p className="text-sm text-texto-suave">{ficha.cargo}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-primaria-suave px-3 py-0.5">{rotuloPapel(ficha)}</span>
        <span className="rounded-full bg-campo px-3 py-0.5 ring-1 ring-linha-forte">{estadoConta[ficha.estado_conta ?? "aprovado"]}</span>
      </div>
      <p className="text-sm text-texto-suave tabular-nums">
        {ficha.n_ficheiros} {ficha.n_ficheiros === 1 ? "ficheiro" : "ficheiros"} · {ficha.n_infos} {ficha.n_infos === 1 ? "informação" : "informações"}
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        <button type="button" className={botaoSec} onClick={onVista} aria-label={`Vista geral de ${ficha.nome}`}>
          Vista geral
        </button>
        <button type="button" className={botaoSec} onClick={onAbrir} aria-label={`Abrir ficha de ${ficha.nome}`}>
          Abrir ficha
        </button>
      </div>
    </li>
  );
}
