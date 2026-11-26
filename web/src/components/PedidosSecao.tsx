import type { ReactNode } from "react";
import type { Pedido } from "@/lib/api";
import { estados } from "@/lib/rotulos";
import EtiquetaEstado from "./EtiquetaEstado";

interface Props {
  /** Prefixo dos ids (liga o título à secção). */
  id: string;
  titulo: string;
  descricao: string;
  /** Todos os pedidos do bloco (sem filtros): dão as contagens do cabeçalho. */
  pedidos: Pedido[];
  /** Equipa: realça «N por decidir»; Os meus pedidos: mostra a contagem por estado. */
  paraDecidir?: boolean;
  carregando?: boolean;
  children: ReactNode;
}

const ordemEstados = ["pendente", "aprovado", "recusado", "cancelado"] as const;

/** Bloco de pedidos com cabeçalho próprio: título, totais e contagem por estado. */
export default function PedidosSecao({ id, titulo, descricao, pedidos, paraDecidir = false, carregando = false, children }: Props) {
  const pendentes = pedidos.filter((p) => p.estado === "pendente").length;
  const mostrarContagens = !(carregando && pedidos.length === 0);
  return (
    <section aria-labelledby={`${id}-titulo`} data-bloco={id} className="flex flex-col gap-5 rounded-painel border border-linha bg-campo p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-linha pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={`${id}-titulo`} className="text-xl font-bold tracking-tight">
            {titulo}
          </h2>
          {mostrarContagens && (
            <p data-total className="text-sm font-medium text-texto-suave">
              {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
            </p>
          )}
        </div>
        <p className="text-sm text-texto-suave">{descricao}</p>
        {mostrarContagens && (
          <ul aria-label={`Resumo de ${titulo.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
            {paraDecidir ? (
              <li>
                <span
                  data-por-decidir
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${pendentes > 0 ? "bg-rosa-suave text-texto ring-1 ring-rosa" : "bg-trilho text-texto-suave"}`}
                >
                  {pendentes > 0 ? `${pendentes} por decidir` : "Nada por decidir"}
                </span>
              </li>
            ) : (
              ordemEstados
                .map((e) => [e, pedidos.filter((p) => p.estado === e).length] as const)
                .filter(([, n]) => n > 0)
                .map(([e, n]) => (
                  <li key={e}>
                    <EtiquetaEstado estado={e} rotulo={`${estados[e]}: ${n}`} />
                  </li>
                ))
            )}
          </ul>
        )}
      </header>
      {children}
    </section>
  );
}
