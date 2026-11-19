"use client";

import { useState, type ReactNode } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, subtipos, tipos } from "@/lib/rotulos";
import { aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "@/lib/filtros";
import CampoBusca from "./CampoBusca";
import FiltrosPedidosCampos, { filtrosEfetivos } from "./FiltrosPedidosCampos";
import { ResumoFiltros } from "./PainelFiltros";
import { botaoPerigo, botaoSec } from "./ui";

interface Props {
  pedidos: Pedido[];
  formulario?: ReactNode;
  /** Se existirem, os pedidos pendentes mostram "Editar" e "Apagar". */
  onEditar?: (p: Pedido) => void;
  onApagar?: (p: Pedido) => Promise<void> | void;
}

const botaoAcao = `${botaoSec} min-h-9 px-3 py-1`;
const botaoApagar = `${botaoPerigo} min-h-9 px-3 py-1`;

/** `formulario` (opcional) fica à esquerda; pesquisa e filtros ao lado, a lista por baixo. */
export default function ListaPedidos({ pedidos, formulario, onEditar, onApagar }: Props) {
  const [aApagar, setAApagar] = useState<number | null>(null);
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
      <div className={formulario ? "grid items-start gap-5 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]" : "contents"}>
        {formulario}
        <div className="flex min-w-0 flex-col gap-3">
          <CampoBusca id="busca-meus-pedidos" rotulo="Pesquisar pedidos" valor={busca} onChange={setBusca} />
          {pedidos.length > 0 && (
            <FiltrosPedidosCampos
              filtros={filtros}
              onChange={setFiltros}
              pedidos={pedidos}
              mostrarFuncionario={false}
              mostrados={visiveis.length}
            semResumo={!!formulario}
            />
          )}
        </div>
      </div>
      {formulario && pedidos.length > 0 && (
        <ResumoFiltros
          ativos={contarAtivos(efetivos)}
          total={pedidos.length}
          mostrados={visiveis.length}
          rotuloItens="pedidos"
          onLimpar={() => setFiltros(filtrosVazios)}
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
            <li key={p.id} className="rounded-cartao bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
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
              </div>
              {p.estado === "pendente" && (onEditar || onApagar) && (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {aApagar === p.id ? (
                    <>
                      <span className="text-sm font-medium">Apagar este pedido?</span>
                      <button
                        type="button"
                        className={`${botaoApagar} font-semibold`}
                        onClick={async () => {
                          await onApagar?.(p);
                          setAApagar(null);
                        }}
                      >
                        Sim, apagar
                      </button>
                      <button type="button" className={botaoAcao} onClick={() => setAApagar(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {onEditar && (
                        <button type="button" className={botaoAcao} onClick={() => onEditar(p)}>
                          Editar
                        </button>
                      )}
                      {onApagar && (
                        <button type="button" className={botaoApagar} onClick={() => setAApagar(p.id)}>
                          Apagar
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
