"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, mensagemDeErro } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { ausenciasAdmin, maisDias } from "@/lib/dashboard";
import { useFonte } from "@/lib/useFonte";
import { useAuth } from "@/lib/auth";
import PedidosAdmin from "../PedidosAdmin";
import { Button } from "@/design-system/primitives";
import { Alert } from "@/design-system/overlays";
import { IconeAgenda, IconePedidos } from "../Icones";
import BlocoEstado from "./BlocoEstado";
import Cabecalho from "./Cabecalho";
import { CartaoPresenca } from "./DashboardEstagiario";
import CartaoContador from "./CartaoContador";
import FeriasPorMarcar from "./FeriasPorMarcar";
import ListaAusencias from "./ListaAusencias";
import WidgetFeriados from "./WidgetFeriados";

// Poucos itens por bloco para tudo caber no ecrã sem scroll; o resto fica atrás de «Ver ...».
const MAX = 3;

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
      "Quem está fora, o que falta aprovar e o que vem aí."
    ) : (
      <>
        {foraHoje === 0 ? "Hoje está toda a equipa." : <><strong>{foraHoje}</strong> {foraHoje === 1 ? "pessoa fora" : "pessoas fora"} hoje.</>}{" "}
        {pendentes === 0 ? "Nada por aprovar." : <><strong>{pendentes}</strong> {pendentes === 1 ? "pedido" : "pedidos"} por aprovar.</>}
      </>
    );

  return (
    <div className="flex flex-col gap-8">
      <Cabecalho
        nome={user?.nome ?? ""}
        hoje={hoje}
        resumo={resumo}
        acoes={
          <>
            <Button asChild variant="outline" tone="neutral" leading={<IconeAgenda className="size-4" />}>
              <Link href="/agenda">Agenda</Link>
            </Button>
            <Button asChild leading={<IconePedidos className="size-4" />}>
              <Link href="/">Ver pedidos</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <CartaoPresenca />
          <ul className="grid gap-4 sm:grid-cols-3">
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
          <FeriasPorMarcar />

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
                  <div key={g.titulo} className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-text-1">
                      {g.titulo} ({g.lista.length})
                    </h3>
                    {g.lista.length === 0 ? (
                      <p className="text-sm text-text-2">{g.vazio}</p>
                    ) : (
                      <ListaAusencias pedidos={g.lista.slice(0, MAX)} titulo="nome" comDias />
                    )}
                    {g.lista.length > MAX && (
                      <Button asChild variant="outline" tone="neutral" size="sm" className="self-start">
                        <Link href="/agenda">Ver agenda ({g.lista.length - MAX} mais)</Link>
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-text-3">Só pedidos aprovados.</p>
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
                {erroAcao && <Alert tone="critical" title={erroAcao} />}
                <PedidosAdmin
                  semBusca
                  pedidos={d.slice(0, MAX)}
                  onAprovar={(id) => decidir(() => api.aprovar(id))}
                  onRecusar={(id, motivo) => decidir(() => api.recusar(id, motivo))}
                />
                <Button asChild variant="outline" tone="neutral" size="sm" className="self-start">
                  <Link href="/">Ver todos os pedidos ({d.length})</Link>
                </Button>
              </>
            )}
          </BlocoEstado>
        </div>
        <aside className="flex flex-col gap-6">
          <WidgetFeriados hoje={hoje} quantos={2} />
        </aside>
      </div>
    </div>
  );
}
