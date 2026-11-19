"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, mensagemDeErro } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { ausenciasAdmin, maisDias } from "@/lib/dashboard";
import { useFonte } from "@/lib/useFonte";
import { useAuth } from "@/lib/auth";
import PedidosAdmin from "../PedidosAdmin";
import { acao, acaoDestaque, erro as erroCls } from "../ui";
import { IconeAgenda, IconeFuncionarios, IconePedidos } from "../Icones";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import CartaoContador from "./CartaoContador";
import ListaAusencias from "./ListaAusencias";
import WidgetFeriados from "./WidgetFeriados";

const MAX = 5;
const ligacaoCls = "inline-flex min-h-10 items-center self-start text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

export default function DashboardAdmin() {
  const { user } = useAuth();
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

  const pendentes = pedidos.dados?.length;
  const foraHoje = aus?.hoje.length;
  const resumo =
    pendentes === undefined || foraHoje === undefined ? (
      <span className="text-texto-suave">Quem está fora, o que falta aprovar e o que vem aí.</span>
    ) : (
      <>
        {foraHoje === 0 ? "Hoje está toda a equipa." : <><strong>{foraHoje}</strong> {foraHoje === 1 ? "pessoa fora" : "pessoas fora"} hoje.</>}{" "}
        {pendentes === 0 ? "Nada por aprovar." : <><strong>{pendentes}</strong> {pendentes === 1 ? "pedido" : "pedidos"} por aprovar.</>}
      </>
    );

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="lg:shrink-0">
          <Cabecalho
            nome={user?.nome ?? ""}
            hoje={hoje}
            resumo={resumo}
            acoes={
              <>
                <Link href="/agenda" className={acao}>
                  <IconeAgenda className="h-4 w-4" />
                  Agenda
                </Link>
                <Link href="/" className={acaoDestaque}>
                  <IconePedidos className="h-4 w-4" />
                  Ver pedidos
                </Link>
              </>
            }
          />
      </div>
      <div className="flex flex-col gap-4 lg:shrink-0 lg:flex-row">
      <ul className="grid grid-cols-3 gap-2 md:gap-4 lg:min-w-0 lg:flex-[3]">
        <CartaoContador
          rotulo="Pedidos pendentes"
          valor={num(pedidos.dados?.length)}
          aCarregar={!pedidos.erro && pedidos.dados === null}
          ligacao={{ href: "/", texto: "Ver pedidos" }}
          Icone={IconePedidos}
        />
        <CartaoContador
          rotulo="Ausentes hoje"
          valor={num(aus?.hoje.length)}
          aCarregar={!agenda.erro && agenda.dados === null}
          ligacao={{ href: "/agenda", texto: "Ver agenda" }}
          Icone={IconeAgenda}
        />
        <CartaoContador
          rotulo="Funcionários"
          valor={num(funcionarios.dados?.length)}
          aCarregar={!funcionarios.erro && funcionarios.dados === null}
          ligacao={{ href: "/funcionarios", texto: "Ver funcionários" }}
          Icone={IconeFuncionarios}
        />
      </ul>
      <WidgetFeriados hoje={hoje} quantos={2} className="lg:min-w-0 lg:flex-1" />
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
      <BlocoEstado
        efeito="recentes"
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
                <h3 className="mt-2 font-mono text-xs font-semibold uppercase tracking-wide text-texto-suave">
                  {g.titulo} ({g.lista.length})
                </h3>
                {g.lista.length === 0 ? (
                  <p className="text-sm text-texto-suave">{g.vazio}</p>
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
            <p className="text-xs text-texto-suave">Só pedidos aprovados.</p>
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
    </div>
  );
}
