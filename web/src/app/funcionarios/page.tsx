"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, mensagemDeErro, type FeriasResumo, type TipoPessoa, type User } from "@/lib/api";
import ConvitesAdmin from "@/components/ConvitesAdmin";
import FuncionarioLinha from "@/components/FuncionarioLinha";
import VistaFuncionario from "@/components/VistaFuncionario";
import { botao, erro as erroCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { temPermissao } from "@/lib/permissoes";

type Filtro = "todos" | "funcionario" | "estagiario" | "admin";
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "funcionario", rotulo: "Funcionários" },
  { valor: "estagiario", rotulo: "Estagiários" },
  { valor: "admin", rotulo: "Administradores" },
];

function Conteudo() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const { user } = useAuth();
  const admin = user?.papel === "admin";
  const [lista, setLista] = useState<User[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [convidar, setConvidar] = useState(false);
  const [ferias, setFerias] = useState<Map<number, FeriasResumo>>(new Map());
  const [aVerId, setAVerId] = useState<number | null>(null);
  const [tipos, setTipos] = useState<TipoPessoa[]>([]);
  const [errosTipo, setErrosTipo] = useState<Record<number, string>>({});
  const fecharVista = useCallback(() => setAVerId(null), []);

  const carregar = useCallback(async () => {
    try {
      setLista(await api.funcionarios());
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial de dados remotos
    if (admin) carregar();
  }, [carregar, admin]);

  useEffect(() => {
    if (!admin) return;
    let ativo = true;
    api.feriasResumo().then(
      (r) => ativo && setFerias(new Map(r.resumo.map((f) => [f.user_id, f]))),
      () => {
        // Sem resumo, a linha fica sem o saldo de férias.
      },
    );
    return () => {
      ativo = false;
    };
  }, [admin]);

  useEffect(() => {
    if (!admin) return;
    let ativo = true;
    api.getTipos().then(
      (t) => ativo && setTipos(t),
      () => {
        // Sem tipos, só ficam os papéis base no select.
      },
    );
    return () => {
      ativo = false;
    };
  }, [admin]);

  async function mudarTipo(u: User, tipo_id: number | null, papel?: "funcionario" | "estagiario") {
    setErrosTipo((e) => ({ ...e, [u.id]: "" }));
    try {
      const nova = await api.definirTipoPessoa(u.id, tipo_id, papel);
      setLista((l) => (l ? l.map((x) => (x.id === u.id ? { ...x, ...nova } : x)) : l));
    } catch (e) {
      setErrosTipo((m) => ({ ...m, [u.id]: mensagemDeErro(e) }));
    }
  }

  const aVer = (lista ?? []).find((u) => u.id === aVerId) ?? null;
  const pendentes = (lista ?? []).filter((u) => u.estado_conta === "pendente");
  const ativos = (lista ?? []).filter((u) => u.estado_conta !== "pendente" && u.estado_conta !== "recusado");
  const porFiltro = filtro === "todos" ? ativos : ativos.filter((u) => u.papel === filtro);
  const visiveis = porFiltro;

  // Quem só tem «convidar pessoas» vê os convites, não a lista de pessoas nem as contas por aprovar.
  if (!admin) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="titulo-bento">Convites</h1>
        <ConvitesAdmin pendentes={[]} onDecidida={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:h-full lg:min-h-0">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="titulo-bento">Pessoas</h1>
          {lista !== null && (
            <p className="mt-1 text-sm text-texto-suave">
              {ativos.length === 1 ? "1 pessoa" : `${ativos.length} pessoas`}
              {pendentes.length > 0 && ` · ${pendentes.length} por autorizar`}
            </p>
          )}
        </div>
        <button type="button" className={botao} aria-expanded={convidar} onClick={() => setConvidar((v) => !v)}>
          Convidar funcionário
        </button>
      </header>
      <ConvitesAdmin pendentes={pendentes} onDecidida={carregar} aberto={convidar} onAberto={setConvidar} podeDefinirCargo />
      <section aria-label="Lista de pessoas" className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Pessoas</h2>
          <div role="group" aria-label="Filtrar por papel" className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                aria-pressed={filtro === f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`min-h-9 rounded-full border px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria ${
                  filtro === f.valor
                    ? "border-primaria bg-primaria text-white"
                    : "border-linha-forte bg-painel text-texto hover:bg-primaria-suave"
                }`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>
        {erro && (
          <p role="alert" className={erroCls}>
            {erro}
          </p>
        )}
        {lista === null && !erro && (
          <ul aria-busy="true" aria-label="A carregar pessoas" className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-28 animate-pulse rounded-barra bg-trilho" />
            ))}
          </ul>
        )}
        {lista !== null && visiveis.length === 0 && (
          <p className="rounded-cartao border border-dashed border-linha-forte p-6 text-center text-texto-suave">
            {ativos.length === 0 ? "Ainda não há utilizadores." : "Ninguém com este papel."}
          </p>
        )}
        <ul className="scroll-fino grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] content-start max-lg:auto-rows-fr lg:auto-rows-min items-stretch gap-3 lg:min-h-[16rem] lg:overflow-y-auto">
          {visiveis.map((u) => (
            <FuncionarioLinha
              key={u.id}
              user={u}
              ferias={ferias.get(u.id)}
              onVer={() => setAVerId(u.id)}
            />
          ))}
        </ul>
      </section>
      {aVer && (
        <VistaFuncionario
          user={aVer}
          ferias={ferias.get(aVer.id)}
          onFechar={fecharVista}
          tipos={tipos}
          onMudarTipo={(id, papel) => mudarTipo(aVer, id, papel)}
          erroTipo={errosTipo[aVer.id]}
          onApagar={
            temPermissao(user, "apagar_pessoas") && aVer.papel !== "admin" && aVer.id !== user?.id
              ? async () => {
                  await api.apagarFuncionario(aVer.id);
                  setLista((l) => (l ? l.filter((x) => x.id !== aVer.id) : l));
                  setAVerId(null);
                }
              : undefined
          }
          onAtualizado={(nova) => setLista((l) => (l ? l.map((x) => (x.id === nova.id ? { ...x, ...nova } : x)) : l))}
        />
      )}
    </div>
  );
}

export default function FuncionáriosPage() {
  return (
    <AppShell soAdmin permissao="convidar_pessoas" ecraInteiro>
      <Conteudo />
    </AppShell>
  );
}
