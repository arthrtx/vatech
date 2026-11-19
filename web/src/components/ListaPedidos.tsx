"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, subtipos, tipos } from "@/lib/rotulos";
import CampoBusca from "./CampoBusca";

export default function ListaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  const [busca, setBusca] = useState("");
  const visiveis = filtrar(pedidos, busca, (p) => [p.user?.nome, tipos[p.tipo], estados[p.estado]]);
  return (
    <div className="flex flex-col gap-3">
      <CampoBusca id="busca-meus-pedidos" rotulo="Pesquisar pedidos" valor={busca} onChange={setBusca} />
      {visiveis.length === 0 ? (
        <p className="text-zinc-700">
          {pedidos.length === 0 ? "Ainda não há pedidos." : `Nenhum resultado para "${busca.trim()}"`}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((p) => (
            <li key={p.id} className="rounded-md border border-zinc-300 bg-white p-4">
              <p className="font-medium">
                {tipos[p.tipo]}
                {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""} · {estados[p.estado]}
              </p>
              <p className="text-sm text-zinc-700">
                {p.data_inicio} a {p.data_fim}
              </p>
              {p.observacao && <p className="mt-1 break-words text-sm">{p.observacao}</p>}
              {p.estado === "recusado" && p.motivo_recusa && (
                <p className="mt-1 break-words text-sm">Motivo da recusa: {p.motivo_recusa}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
