"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, subtipos, tipos } from "@/lib/rotulos";
import { aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "@/lib/filtros";
import CampoBusca from "./CampoBusca";
import FiltrosPedidosCampos, { filtrosEfetivos, filtrosIniciais } from "./FiltrosPedidosCampos";
import { botao, botaoSec, input, label } from "./ui";

interface Props {
  pedidos: Pedido[];
  onAprovar: (id: number) => void | Promise<void>;
  onRecusar: (id: number, motivo: string) => void | Promise<void>;
  /** Dashboard: lista resumida, sem barra de pesquisa. */
  semBusca?: boolean;
}

export default function PedidosAdmin({ pedidos, onAprovar, onRecusar, semBusca = false }: Props) {
  const [recusando, setRecusando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busca, setBusca] = useState("");

  const [filtros, setFiltros] = useState(semBusca ? filtrosVazios : filtrosIniciais);
  const efetivos = filtrosEfetivos(filtros);
  const visiveis = filtrar(aplicarFiltrosPedidos(pedidos, efetivos), busca, (p) => [
    p.user?.nome,
    tipos[p.tipo],
    estados[p.estado],
  ]);

  async function confirmar(id: number) {
    if (!motivo.trim()) return;
    await onRecusar(id, motivo.trim());
    setRecusando(null);
    setMotivo("");
  }

  return (
    <div className="flex flex-col gap-3">
      {!semBusca && (
        <CampoBusca id="busca-pedidos-admin" rotulo="Pesquisar pedidos" valor={busca} onChange={setBusca} />
      )}
      {!semBusca && pedidos.length > 0 && (
        <FiltrosPedidosCampos
          filtros={filtros}
          onChange={setFiltros}
          pedidos={pedidos}
          mostrarFuncionario
          mostrados={visiveis.length}
        />
      )}
      {visiveis.length === 0 ? (
        <p className="text-texto-suave">
          {pedidos.length === 0
            ? semBusca
              ? "Sem pedidos pendentes."
              : "Sem pedidos."
            : contarAtivos(efetivos) > 0
              ? "Sem resultados com estes filtros."
              : `Nenhum resultado para "${busca.trim()}"`}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((p) => (
            <li key={p.id} className="rounded-cartao bg-painel shadow-suave p-4">
              <p className="font-medium">
                {p.user?.nome ?? `Utilizador ${p.user_id}`} · {tipos[p.tipo]}
                {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""}
                {p.estado !== "pendente" && ` · ${estados[p.estado]}`}
              </p>
              <p className="text-sm text-texto-suave">
                {p.data_inicio} a {p.data_fim}
              </p>
              {p.observacao && <p className="mt-1 break-words text-sm">{p.observacao}</p>}
              {p.estado !== "pendente" ? null : recusando === p.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <label htmlFor={`motivo-${p.id}`} className={label}>
                    Motivo da recusa (obrigatório)
                  </label>
                  <textarea
                    id={`motivo-${p.id}`}
                    rows={2}
                    required
                    className={input}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={botao}
                      disabled={!motivo.trim()}
                      onClick={() => confirmar(p.id)}
                    >
                      Confirmar recusa
                    </button>
                    <button type="button" className={botaoSec} onClick={() => setRecusando(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={botao} onClick={() => onAprovar(p.id)}>
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className={botaoSec}
                    onClick={() => {
                      setRecusando(p.id);
                      setMotivo("");
                    }}
                  >
                    Recusar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
