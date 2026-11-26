"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import { diasDoPedido, hojeIso, horasDoPedido } from "@/lib/agenda";
import { contarPorEstado } from "@/lib/dashboard";
import { estados, tipos } from "@/lib/rotulos";
import { useFonte } from "@/lib/useFonte";
import { podePedir, temPermissao } from "@/lib/permissoes";
import { IconeAgenda, IconePedidos } from "../Icones";
import { Button } from "@/design-system/primitives";
import AvisoFerias from "./AvisoFerias";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import { CartaoPresenca } from "./DashboardEstagiario";
import CalendarioMes from "./CalendarioMes";
import WidgetContagem from "./WidgetContagem";
import { dataPt } from "@/lib/presencas";
import WidgetFeriados from "./WidgetFeriados";

const MAX = 5;
const barraEstado = { aprovado: "bg-good", pendente: "bg-warning", recusado: "bg-critical", cancelado: "bg-text-3" } as const;
const nDias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

export default function DashboardFuncionario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const pedidos = useFonte(useCallback(() => api.pedidos(), []));

  const n = pedidos.dados ? contarPorEstado(pedidos.dados) : null;

  return (
    <div className="flex flex-col gap-8">
      <Cabecalho
        nome={user.nome}
        hoje={hoje}
        resumo={
          n === null ? (
            "Os teus pedidos e a tua próxima ausência."
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
            <Button asChild variant="outline" tone="neutral" leading={<IconeAgenda className="size-4" />}>
              <Link href="/agenda">Agenda</Link>
            </Button>
            {podePedir(user) && (
              <Button asChild leading={<IconePedidos className="size-4" />}>
                <Link href="/">Novo pedido</Link>
              </Button>
            )}
          </>
        }
      />
      {temPermissao(user, "marcar_presenca") && <CartaoPresenca />}
      <AvisoFerias comTransitadas />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <CalendarioMes hoje={hoje} />
          <BlocoEstado
            titulo="Os meus pedidos"
            fonte={pedidos}
            mensagemErro="Não foi possível carregar os seus pedidos. Verifique a ligação."
            linhas={2}
            vazio={(d) => d.length === 0}
            vazioTitulo="Ainda não fez pedidos"
            vazioTexto="Os pedidos que fizer aparecem aqui, com o estado de cada um."
            vazioAcao={
              <Button asChild>
                <Link href="/">Fazer um pedido</Link>
              </Button>
            }
          >
            {(d) => (
              <>
                <ul className="flex flex-col divide-y divide-line">
                  {d.slice(0, MAX).map((p) => (
                    <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-pill ${barraEstado[p.estado]}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold break-words text-text-1">
                          {tipos[p.tipo]} · {estados[p.estado]}
                        </p>
                        <p className="ds-tabular text-sm text-text-2">
                          {p.data_inicio === p.data_fim ? dataPt(p.data_inicio) : `${dataPt(p.data_inicio)} a ${dataPt(p.data_fim)}`} · {horasDoPedido(p) ? horasDoPedido(p) : nDias(diasDoPedido(p))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" tone="neutral" size="sm" className="self-start">
                  <Link href="/">Ver os meus pedidos ({d.length})</Link>
                </Button>
              </>
            )}
          </BlocoEstado>
        </div>
        <aside className="flex flex-col gap-6">
          <WidgetContagem pedidos={pedidos.dados} hoje={hoje} />
          <WidgetFeriados hoje={hoje} quantos={2} />
        </aside>
      </div>
    </div>
  );
}
