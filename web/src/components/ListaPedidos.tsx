"use client";

import { useState, type ReactNode } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, formatarData, subtipos, tipos } from "@/lib/rotulos";
import { hojeIso } from "@/lib/agenda";
import { aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "@/lib/filtros";
import AnexosDoPedido from "./AnexosDoPedido";
import PontoUrgente from "./PontoUrgente";
import CampoBusca from "./CampoBusca";
import FiltrosPedidosCampos, { filtrosEfetivos } from "./FiltrosPedidosCampos";
import { ResumoFiltros } from "./PainelFiltros";
import { botaoPerigo, botaoSec } from "./ui";

interface Props {
  pedidos: Pedido[];
  /** Primeiro carregamento em curso: mostra "A carregar" em vez do estado vazio. */
  carregando?: boolean;
  formulario?: ReactNode;
  /** Se existirem, os pedidos pendentes mostram "Editar" e "Apagar". */
  onEditar?: (p: Pedido) => void;
  onApagar?: (p: Pedido) => Promise<void> | void;
}

const botaoAcao = `${botaoSec} min-h-9 px-3 py-1`;
const botaoApagar = `${botaoPerigo} min-h-9 px-3 py-1`;

/** `formulario` (opcional) fica à esquerda; pesquisa e filtros ao lado, a lista por baixo. */
/** Licença comunicada que ainda não começou: o próprio pode cancelá-la. */
const licencaPorComecar = (p: Pedido) => p.tipo === "licenca" && p.estado === "aprovado" && p.data_inicio.slice(0, 10) >= hojeIso();

export default function ListaPedidos({ pedidos, carregando = false, formulario, onEditar, onApagar }: Props) {
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
      {carregando && pedidos.length === 0 ? (
        <p role="status" className="text-texto-suave">
          A carregar pedidos...
        </p>
      ) : visiveis.length === 0 ? (
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
            <li key={p.id} id={`pedido-${p.id}`} className="rounded-cartao bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
              <p className="font-medium">
                {p.urgente && <PontoUrgente />}
                {tipos[p.tipo]}
                {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""} · {p.tipo === "licenca" && p.estado === "aprovado" ? "Comunicada" : estados[p.estado]}
              </p>
              <p className="text-sm text-texto-suave">
                {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
              </p>
              {p.observacao && <p className="mt-1 break-words text-sm">{p.observacao}</p>}
              <AnexosDoPedido pedidoId={p.id} anexos={p.anexos} />
              {p.estado === "recusado" && p.motivo_recusa && (
                <p className="mt-1 break-words text-sm">Motivo da recusa: {p.motivo_recusa}</p>
              )}
              </div>
              {(p.estado === "pendente" ? onEditar || onApagar : licencaPorComecar(p) && onApagar) && (
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
                      {onEditar && p.estado === "pendente" && (
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
