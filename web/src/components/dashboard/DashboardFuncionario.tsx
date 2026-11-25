"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import { diasDoPedido, hojeIso, horasDoPedido } from "@/lib/agenda";
import { contarPorEstado } from "@/lib/dashboard";
import { estados, tipos } from "@/lib/rotulos";
import { useFonte } from "@/lib/useFonte";
import { IconeAgenda, IconePedidos } from "../Icones";
import { acao, acaoDestaque } from "../ui";
import AvisoFerias from "./AvisoFerias";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import CalendarioMes from "./CalendarioMes";
import WidgetContagem from "./WidgetContagem";
import WidgetFeriados from "./WidgetFeriados";

const MAX = 5;
const barraEstado = { aprovado: "bg-positivo", pendente: "bg-primaria", recusado: "bg-rosa", cancelado: "bg-texto-suave" } as const;
const nDias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
const ligacaoCls = "inline-flex min-h-10 items-center self-start text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

export default function DashboardFuncionario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const pedidos = useFonte(useCallback(() => api.pedidos(), []));

  const n = pedidos.dados ? contarPorEstado(pedidos.dados) : null;

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="lg:shrink-0">
          <Cabecalho
            nome={user.nome}
            hoje={hoje}
            resumo={
              n === null ? (
                <span className="text-texto-suave">Os teus pedidos e a tua próxima ausência.</span>
              ) : n.pendente === 0 ? (
                "Não tens pedidos à espera de resposta."
              ) : (
                <>
                  Tens <strong>{n.pendente}</strong> {n.pendente === 1 ? "pedido" : "pedidos"} à espera de resposta.
                </>
              )
            }
            acoes={
              <>
                <Link href="/agenda" className={acao}>
                  <IconeAgenda className="h-4 w-4" />
                  Agenda
                </Link>
                <Link href="/" className={acaoDestaque}>
                  <IconePedidos className="h-4 w-4" />
                  Novo pedido
                </Link>
              </>
            }
          />
      </div>
      <AvisoFerias comTransitadas />
      <div className="flex flex-col gap-4 lg:shrink-0 lg:flex-row">
      <WidgetContagem pedidos={pedidos.dados} hoje={hoje} className="lg:min-w-0 lg:flex-[2]" />
      <WidgetFeriados hoje={hoje} quantos={2} className="lg:min-w-0 lg:flex-1" />
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <CalendarioMes hoje={hoje} className="lg:self-start" />
      <BlocoEstado
        efeito="recentes"
        titulo="Os meus pedidos"
        fonte={pedidos}
        mensagemErro="Não foi possível carregar os seus pedidos. Verifique a ligação."
        linhas={2}
        vazio={(d) => d.length === 0}
        vazioTitulo="Ainda não fez pedidos"
        vazioTexto="Os pedidos que fizer aparecem aqui, com o estado de cada um."
        vazioAcao={
          <Link href="/" className={ligacaoCls}>
            Fazer um pedido
          </Link>
        }
      >
        {(d) => (
          <>
            <ul className="flex flex-col divide-y divide-linha/70 overflow-hidden rounded-controlo bg-painel/30">
              {d.slice(0, MAX).map((p) => (
                <li key={p.id} className="flex gap-3 px-4 py-3">
                  <span aria-hidden="true" className={`w-1 shrink-0 rounded-full ${barraEstado[p.estado]}`} />
                  <div className="min-w-0">
                    <p className="font-medium [overflow-wrap:anywhere]">
                      {tipos[p.tipo]} · {estados[p.estado]}
                    </p>
                    <p className="text-sm text-texto-suave">
                      {p.data_inicio === p.data_fim ? p.data_inicio : `${p.data_inicio} a ${p.data_fim}`} · {horasDoPedido(p) ? horasDoPedido(p) : nDias(diasDoPedido(p))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/" className={ligacaoCls}>
              Ver os meus pedidos ({d.length})
            </Link>
          </>
        )}
      </BlocoEstado>
      </div>
    </div>
  );
}
