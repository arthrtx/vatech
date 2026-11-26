"use client";

import { useState, type ReactNode } from "react";
import type { Pedido } from "@/lib/api";
import { filtrar } from "@/lib/busca";
import { estados, subtipos, tipos } from "@/lib/rotulos";
import { aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "@/lib/filtros";
import AnexosDoPedido from "./AnexosDoPedido";
import SimulacaoLigacao from "./SimulacaoLigacao";
import PedidosDatas from "./PedidosDatas";
import PontoUrgente from "./PontoUrgente";
import CampoBusca from "./CampoBusca";
import FiltrosPedidosCampos, { filtrosEfetivos } from "./FiltrosPedidosCampos";
import { ResumoFiltros } from "./PainelFiltros";
import JanelaFormulario from "./JanelaFormulario";
import EtiquetaEstado from "./EtiquetaEstado";
import { botao, botaoPerigo, botaoSec, vidro } from "./ui";

interface Props {
  pedidos: Pedido[];
  /** Primeiro carregamento em curso: mostra "A carregar" em vez do estado vazio. */
  carregando?: boolean;
  /** Formulário "Novo pedido": fica numa janela que abre com o botão "Novo pedido". */
  formulario?: ReactNode;
  formAberto?: boolean;
  aoAbrirForm?: () => void;
  aoFecharForm?: () => void;
  /** Se existirem, os pedidos pendentes mostram "Editar" e "Apagar". */
  onEditar?: (p: Pedido) => void;
  onApagar?: (p: Pedido) => Promise<void> | void;
  /** Só as férias aprovadas mostram "Apagar" (marca o pedido como cancelado). */
  onCancelar?: (p: Pedido) => Promise<void> | void;
  /** Admin na sua própria lista: pode apagar o que marcou, mesmo já aprovado. */
  apagarAprovados?: boolean;
  /** Texto do estado vazio (sem nenhum pedido). */
  textoVazio?: string;
}

const botaoAcao = `${botaoSec} min-h-9 px-3 py-1`;
const botaoApagar = `${botaoPerigo} min-h-9 px-3 py-1`;

/** Pesquisa e filtros em cima, a lista por baixo; com `formulario`, o botão "Novo pedido" abre-o numa janela. */
export default function ListaPedidos({ pedidos, carregando = false, formulario, formAberto = false, aoAbrirForm, aoFecharForm, onEditar, onApagar, onCancelar, apagarAprovados = false, textoVazio = "Ainda não há pedidos." }: Props) {
  const [aCancelar, setACancelar] = useState<number | null>(null);
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
      {formulario && formAberto && (
        <JanelaFormulario titulo="Formulário de pedido" aoFechar={() => aoFecharForm?.()}>
          {formulario}
        </JanelaFormulario>
      )}
      <div className="contents">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 max-w-md flex-1">
              <CampoBusca id="busca-meus-pedidos" rotulo="Pesquisar pedidos" valor={busca} onChange={setBusca} />
            </div>
            {formulario && (
              <button type="button" className={`${botao} shrink-0`} onClick={aoAbrirForm}>
                Novo pedido
              </button>
            )}
          </div>
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
        <p className="rounded-cartao border border-dashed border-linha-forte bg-painel p-6 text-center text-texto-suave">
          {pedidos.length === 0
            ? textoVazio
            : contarAtivos(efetivos) > 0
              ? "Sem resultados com estes filtros."
              : `Nenhum resultado para "${busca.trim()}"`}
        </p>
      ) : (
        <div className="@container">
          <ul className="grid gap-4 @3xl:grid-cols-2">
            {visiveis.map((p) => (
              <li key={p.id} id={`pedido-${p.id}`} className={`${vidro} flex min-w-0 flex-col gap-4 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <p className="min-w-0 text-base font-semibold">
                    {p.urgente && <PontoUrgente />}
                    {tipos[p.tipo]}
                    {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""}
                  </p>
                  <EtiquetaEstado estado={p.estado} rotulo={p.tipo === "licenca" && p.estado === "aprovado" ? "Comunicada" : undefined} />
                </div>
                {p.criado_por && <p className="text-sm text-texto-suave">Criado por {p.criado_por.nome}</p>}
                <PedidosDatas pedido={p} />
                {p.observacao && <p className="break-words text-sm">{p.observacao}</p>}
                <AnexosDoPedido pedidoId={p.id} anexos={p.anexos} />
                {p.estado === "recusado" && p.motivo_recusa && (
                  <p className="break-words rounded-cartao bg-rosa-suave px-3 py-2 text-sm">Motivo da recusa: {p.motivo_recusa}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-linha pt-4">
                  <SimulacaoLigacao pedido={p} />
                  {onCancelar && p.tipo === "ferias" && p.estado === "aprovado" &&
                    (aCancelar === p.id ? (
                      <>
                        <span className="text-sm font-medium">Apagar estas férias?</span>
                        <button
                          type="button"
                          className={`${botaoApagar} font-semibold`}
                          onClick={async () => {
                            await onCancelar(p);
                            setACancelar(null);
                          }}
                        >
                          Sim, apagar
                        </button>
                        <button type="button" className={botaoAcao} onClick={() => setACancelar(null)}>
                          Voltar
                        </button>
                      </>
                    ) : (
                      <button type="button" className={botaoApagar} onClick={() => setACancelar(p.id)}>
                        Apagar
                      </button>
                    ))}
                  {(p.estado === "pendente" ? onEditar || onApagar : apagarAprovados && onApagar) &&
                    (aApagar === p.id ? (
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
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
