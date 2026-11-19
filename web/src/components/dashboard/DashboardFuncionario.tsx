"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { contarPorEstado, equipaForaHoje, proximasAusencias } from "@/lib/dashboard";
import { useFonte } from "@/lib/useFonte";
import { IconeAgenda, IconePedidos } from "../Icones";
import { acao, acaoDestaque } from "../ui";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import CartaoContador from "./CartaoContador";
import ListaAusencias from "./ListaAusencias";
import WidgetContagem from "./WidgetContagem";
import WidgetFeriados from "./WidgetFeriados";

const MAX = 5;
const ligacaoCls = "inline-flex min-h-10 items-center self-start text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

export default function DashboardFuncionario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const pedidos = useFonte(useCallback(() => api.pedidos(), []));
  const agenda = useFonte(useCallback(() => api.agenda(hoje, hoje), [hoje]));

  const n = pedidos.dados ? contarPorEstado(pedidos.dados) : null;
  const aCarregar = !pedidos.erro && pedidos.dados === null;

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="lg:shrink-0">
          <Cabecalho
            nome={user.nome}
            hoje={hoje}
            resumo={
              n === null ? (
                <span className="text-texto-suave">Os teus pedidos, quem da equipa está fora e o próximo descanso.</span>
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
      <div className="flex flex-col gap-4 lg:shrink-0 lg:flex-row">
      <ul className="grid grid-cols-3 gap-2 md:gap-4 lg:min-w-0 lg:flex-[2]">
        <CartaoContador
          rotulo="Pendentes"
          valor={n?.pendente ?? null}
          aCarregar={aCarregar}
          ligacao={{ href: "/", texto: "Ver pedidos" }}
          Icone={IconePedidos}
          cor="violeta"
        />
        <CartaoContador rotulo="Aprovados" valor={n?.aprovado ?? null} aCarregar={aCarregar} Icone={IconePedidos} cor="positivo" />
        <CartaoContador rotulo="Recusados" valor={n?.recusado ?? null} aCarregar={aCarregar} Icone={IconePedidos} cor="rosa" />
      </ul>
      <WidgetContagem pedidos={pedidos.dados} hoje={hoje} className="lg:min-w-0 lg:flex-1" />
      <WidgetFeriados hoje={hoje} quantos={2} className="lg:min-w-0 lg:flex-1" />
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
      <BlocoEstado
        efeito="recentes"
        titulo="As minhas próximas ausências"
        fonte={pedidos}
        mensagemErro="Não foi possível carregar os seus pedidos. Verifique a ligação."
        linhas={2}
        vazio={(d) => proximasAusencias(d, hoje).length === 0}
        vazioTitulo="Sem ausências aprovadas"
        vazioTexto="Faça um pedido e, quando for aprovado, aparece aqui."
        vazioAcao={
          <Link href="/" className={ligacaoCls}>
            Fazer um pedido
          </Link>
        }
      >
        {(d) => (
          <>
            <ListaAusencias pedidos={proximasAusencias(d, hoje).slice(0, MAX)} titulo="tipo" comDias />
            <Link href="/" className={ligacaoCls}>
              Ver os meus pedidos
            </Link>
          </>
        )}
      </BlocoEstado>

      <BlocoEstado
        titulo="Quem da equipa está fora hoje"
        fonte={agenda}
        mensagemErro="Não foi possível carregar a agenda da equipa. Verifique a ligação."
        linhas={2}
        vazio={(d) => equipaForaHoje(d, hoje, user.id).length === 0}
        vazioTitulo="Ninguém da equipa está fora hoje"
        vazioTexto="Toda a equipa está presente."
      >
        {(d) => (
          <>
            <ListaAusencias pedidos={equipaForaHoje(d, hoje, user.id)} titulo="nome" />
            <p className="text-xs text-texto-suave">Só nome, tipo e datas (agenda reduzida).</p>
          </>
        )}
      </BlocoEstado>
      </div>
    </div>
  );
}
