"use client";

import PontoUrgente from "./PontoUrgente";
import { useState } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, formatarData, subtipos, tipos } from "@/lib/rotulos";
import { aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "@/lib/filtros";
import Avatar from "./Avatar";
import AnexosDoPedido from "./AnexosDoPedido";
import CampoBusca from "./CampoBusca";
import FiltrosPedidosCampos, { filtrosEfetivos, filtrosIniciais } from "./FiltrosPedidosCampos";
import { botao, botaoSec, input, label } from "./ui";

interface Props {
  pedidos: Pedido[];
  onAprovar: (id: number) => void | Promise<void>;
  onRecusar: (id: number, motivo: string) => void | Promise<void>;
  /** Primeiro carregamento em curso: mostra "A carregar" em vez do estado vazio. */
  carregando?: boolean;
  /** Dashboard: lista resumida, sem barra de pesquisa. */
  semBusca?: boolean;
}

export default function PedidosAdmin({ pedidos, onAprovar, onRecusar, carregando = false, semBusca = false }: Props) {
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
      {carregando && pedidos.length === 0 ? (
        <p role="status" className="text-texto-suave">
          A carregar pedidos...
        </p>
      ) : visiveis.length === 0 ? (
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
            <li
              key={p.id}
              id={`pedido-${p.id}`}
              className="flex flex-col gap-3 rounded-cartao bg-painel/55 p-4 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 sm:flex-row"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar nome={p.user?.nome ?? "?"} id={p.user_id} />
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.urgente && <PontoUrgente />}
                    {p.user?.nome ?? `Utilizador ${p.user_id}`} · {tipos[p.tipo]}
                    {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""}
                    {p.estado !== "pendente" && ` · ${estados[p.estado]}`}
                  </p>
                  <p className="text-sm text-texto-suave">
                    {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
                  </p>
                </div>
              </div>
              {p.estado !== "pendente" ? null : recusando === p.id ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor={`motivo-${p.id}`} className={label}>
                    Motivo da recusa (obrigatório)
                  </label>
                  <textarea
                    id={`motivo-${p.id}`}
                    rows={2}
                    required
                    autoFocus
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
                <div className="flex flex-wrap gap-2">
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
              </div>
              <div className="rounded-controlo bg-campo/60 p-3 text-sm sm:w-[45%] sm:shrink-0">
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-texto-suave">Descrição</p>
                {p.observacao ? (
                  <p className="mt-1 break-words">{p.observacao}</p>
                ) : (
                  <p className="mt-1 text-texto-suave">Sem descrição.</p>
                )}
                <AnexosDoPedido pedidoId={p.id} anexos={p.anexos} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
