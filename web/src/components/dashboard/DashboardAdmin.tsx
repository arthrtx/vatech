"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, mensagemDeErro } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { ausenciasAdmin, maisDias } from "@/lib/dashboard";
import { useFonte } from "@/lib/useFonte";
import PedidosAdmin from "../PedidosAdmin";
import { erro as erroCls } from "../ui";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import CartaoContador from "./CartaoContador";
import ListaAusencias from "./ListaAusencias";

const MAX = 5;
const ligacaoCls = "inline-block self-start py-1 text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900";

export default function DashboardAdmin() {
  const [hoje] = useState(() => hojeIso());
  const pedidos = useFonte(useCallback(() => api.pedidos("pendente"), []));
  const funcionarios = useFonte(useCallback(() => api.funcionarios(), []));
  const agenda = useFonte(useCallback(() => api.agenda(hoje, maisDias(hoje, 30)), [hoje]));
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const aus = agenda.dados ? ausenciasAdmin(agenda.dados, hoje) : null;
  const grupos = [
    { titulo: "Hoje", lista: aus?.hoje ?? [], vazio: "Ninguém ausente hoje." },
    { titulo: "Próximos 30 dias", lista: aus?.proximos ?? [], vazio: "Ninguém com ausência a começar nos próximos 30 dias." },
  ];

  async function decidir(fn: () => Promise<unknown>) {
    setErroAcao(null);
    try {
      await fn();
    } catch (e) {
      setErroAcao(mensagemDeErro(e));
      return;
    }
    pedidos.atualizar();
    agenda.atualizar();
  }

  const num = (v: number | undefined) => (v === undefined ? null : v);

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho titulo="Dashboard" hoje={hoje} />
      <ul className="grid grid-cols-3 gap-2 md:gap-4">
        <CartaoContador
          rotulo="Pedidos pendentes"
          valor={num(pedidos.dados?.length)}
          aCarregar={!pedidos.erro && pedidos.dados === null}
          ligacao={{ href: "/", texto: "Ver pedidos" }}
        />
        <CartaoContador
          rotulo="Ausentes hoje"
          valor={num(aus?.hoje.length)}
          aCarregar={!agenda.erro && agenda.dados === null}
          ligacao={{ href: "/agenda", texto: "Ver agenda" }}
        />
        <CartaoContador
          rotulo="Funcionários"
          valor={num(funcionarios.dados?.length)}
          aCarregar={!funcionarios.erro && funcionarios.dados === null}
          ligacao={{ href: "/funcionarios", texto: "Ver funcionários" }}
        />
      </ul>

      <BlocoEstado
        titulo="Ausentes hoje e nos próximos 30 dias"
        fonte={agenda}
        mensagemErro="Não foi possível carregar a agenda. Verifique a ligação."
        linhas={3}
        vazio={() => aus !== null && aus.hoje.length === 0 && aus.proximos.length === 0}
        vazioTitulo="Ninguém ausente nos próximos 30 dias"
        vazioTexto="Quando houver pedidos aprovados, aparecem aqui."
      >
        {() => (
          <>
            {grupos.map((g) => (
              <div key={g.titulo} className="flex flex-col gap-2">
                <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  {g.titulo} ({g.lista.length})
                </h3>
                {g.lista.length === 0 ? (
                  <p className="text-sm text-zinc-700">{g.vazio}</p>
                ) : (
                  <ListaAusencias pedidos={g.lista.slice(0, MAX)} titulo="nome" comDias />
                )}
                {g.lista.length > MAX && (
                  <Link href="/agenda" className={ligacaoCls}>
                    Ver agenda ({g.lista.length - MAX} mais)
                  </Link>
                )}
              </div>
            ))}
            <p className="text-xs text-zinc-700">Só pedidos aprovados.</p>
          </>
        )}
      </BlocoEstado>

      <BlocoEstado
        titulo="Pedidos pendentes"
        fonte={pedidos}
        mensagemErro="Não foi possível carregar os pedidos. Verifique a ligação."
        linhas={2}
        vazio={(d) => d.length === 0}
        vazioTitulo="Sem pedidos pendentes"
        vazioTexto="Os novos pedidos da equipa aparecem aqui para aprovar ou recusar."
      >
        {(d) => (
          <>
            {erroAcao && (
              <p role="alert" className={erroCls}>
                {erroAcao}
              </p>
            )}
            <PedidosAdmin
              semBusca
              pedidos={d.slice(0, MAX)}
              onAprovar={(id) => decidir(() => api.aprovar(id))}
              onRecusar={(id, motivo) => decidir(() => api.recusar(id, motivo))}
            />
            <Link href="/" className={ligacaoCls}>
              Ver todos os pedidos ({d.length})
            </Link>
          </>
        )}
      </BlocoEstado>
    </div>
  );
}
