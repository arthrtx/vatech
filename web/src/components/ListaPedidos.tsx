"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, subtipos, tipos } from "@/lib/rotulos";
import { aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "@/lib/filtros";
import CampoBusca from "./CampoBusca";
import FiltrosPedidosCampos, { filtrosEfetivos } from "./FiltrosPedidosCampos";

export default function ListaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState(filtrosVazios);
  const efetivos = filtrosEfetivos(filtros);
  const visiveis = filtrar(aplicarFiltrosPedidos(pedidos, efetivos), busca, (p) => [
    p.user?.nome,
    tipos[p.tipo],
    estados[p.estado],
  ]);
  return (
    <div className="flex flex-col gap-3">
      <CampoBusca id="busca-meus-pedidos" rotulo="Pesquisar pedidos" valor={busca} onChange={setBusca} />
      {pedidos.length > 0 && (
        <FiltrosPedidosCampos
          filtros={filtros}
          onChange={setFiltros}
          pedidos={pedidos}
          mostrarFuncionario={false}
          mostrados={visiveis.length}
        />
      )}
      {visiveis.length === 0 ? (
        <p className="text-texto-suave">
          {pedidos.length === 0
            ? "Ainda não há pedidos."
            : contarAtivos(efetivos) > 0
              ? "Sem resultados com estes filtros."
              : `Nenhum resultado para "${busca.trim()}"`}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((p) => (
            <li key={p.id} className="rounded-cartao bg-painel shadow-suave p-4">
              <p className="font-medium">
                {tipos[p.tipo]}
                {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""} · {estados[p.estado]}
              </p>
              <p className="text-sm text-texto-suave">
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
