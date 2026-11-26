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
import { CartaoPresenca } from "./DashboardEstagiario";
import CalendarioMes from "./CalendarioMes";
import WidgetContagem from "./WidgetContagem";
import WidgetFeriados from "./WidgetFeriados";

const MAX = 5;
const barraEstado = { aprovado: "bg-positivo", pendente: "bg-primaria", recusado: "bg-rosa", cancelado: "bg-texto-suave" } as const;
const nDias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
const ligacaoCls = "mt-1 inline-flex min-h-10 items-center self-start whitespace-nowrap rounded-full bg-primaria px-5 text-sm font-semibold text-white hover:bg-primaria-forte focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";

export default function DashboardFuncionario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const pedidos = useFonte(useCallback(() => api.pedidos(), []));

  const n = pedidos.dados ? contarPorEstado(pedidos.dados) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
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
      <CartaoPresenca />
      <AvisoFerias comTransitadas />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 items-start gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <CalendarioMes hoje={hoje} />
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
            <ul className="flex flex-col gap-2">
              {d.slice(0, MAX).map((p) => (
                <li key={p.id} className="flex items-start gap-3 rounded-cartao bg-campo px-4 py-3">
                  <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${barraEstado[p.estado]}`} />
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
      <aside className="flex flex-col gap-4">
        <WidgetContagem pedidos={pedidos.dados} hoje={hoje} />
        <WidgetFeriados hoje={hoje} quantos={2} />
      </aside>
      </div>
    </div>
  );
}
