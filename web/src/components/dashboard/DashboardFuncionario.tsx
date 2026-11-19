"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { contarPorEstado, equipaForaHoje, proximasAusencias } from "@/lib/dashboard";
import { useFonte } from "@/lib/useFonte";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import CartaoContador from "./CartaoContador";
import ListaAusencias from "./ListaAusencias";

const MAX = 5;
const ligacaoCls = "inline-flex min-h-10 items-center self-start text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900";

export default function DashboardFuncionario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const pedidos = useFonte(useCallback(() => api.pedidos(), []));
  const agenda = useFonte(useCallback(() => api.agenda(hoje, hoje), [hoje]));

  const n = pedidos.dados ? contarPorEstado(pedidos.dados) : null;
  const aCarregar = !pedidos.erro && pedidos.dados === null;

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho titulo={`Olá, ${user.nome.split(" ")[0]}`} hoje={hoje} />
      <ul className="grid grid-cols-3 gap-2 md:gap-4">
        <CartaoContador
          rotulo="Pendentes"
          valor={n?.pendente ?? null}
          aCarregar={aCarregar}
          ligacao={{ href: "/", texto: "Ver pedidos" }}
        />
        <CartaoContador rotulo="Aprovados" valor={n?.aprovado ?? null} aCarregar={aCarregar} />
        <CartaoContador rotulo="Recusados" valor={n?.recusado ?? null} aCarregar={aCarregar} />
      </ul>

      <BlocoEstado
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
            <p className="text-xs text-zinc-700">Só nome, tipo e datas (agenda reduzida).</p>
          </>
        )}
      </BlocoEstado>
    </div>
  );
}
