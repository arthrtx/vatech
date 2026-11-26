"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, mensagemDeErro, type FeriasResumo, type TipoPessoa, type User } from "@/lib/api";
import CampoBusca from "@/components/CampoBusca";
import ConvitesAdmin from "@/components/ConvitesAdmin";
import FuncionarioLinha from "@/components/FuncionarioLinha";
import VistaFuncionario from "@/components/VistaFuncionario";
import { filtrar } from "@/lib/busca";
import { erro as erroCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";

function Conteudo() {
  const { user } = useAuth();
  const admin = user?.papel === "admin";
  const [lista, setLista] = useState<User[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ferias, setFerias] = useState<Map<number, FeriasResumo>>(new Map());
  const [aVer, setAVer] = useState<User | null>(null);
  const [tipos, setTipos] = useState<TipoPessoa[]>([]);
  const [errosTipo, setErrosTipo] = useState<Record<number, string>>({});
  const fecharVista = useCallback(() => setAVer(null), []);

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

  const pendentes = (lista ?? []).filter((u) => u.estado_conta === "pendente");
  const ativos = (lista ?? []).filter((u) => u.estado_conta !== "pendente" && u.estado_conta !== "recusado");
  const visiveis = filtrar(ativos, busca, (u) => [u.nome, u.email]);

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
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <h1 className="titulo-bento">Pessoas</h1>
      <ConvitesAdmin pendentes={pendentes} onDecidida={carregar} />
      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
        <div className="flex min-w-0 flex-col gap-3 lg:max-h-full lg:min-h-0">
        {erro && (
          <p role="alert" className={erroCls}>
            {erro}
          </p>
        )}
        <CampoBusca id="busca-funcionarios" rotulo="Pesquisar pessoas" valor={busca} onChange={setBusca} />
        {lista !== null && visiveis.length === 0 && (
          <p className="text-texto-suave">
            {ativos.length === 0 ? "Ainda não há utilizadores." : `Nenhum resultado para "${busca.trim()}"`}
          </p>
        )}
        <ul className="scroll-fino grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start items-start gap-2 lg:min-h-0 lg:overflow-y-auto">
          {visiveis.map((u) => (
            <FuncionarioLinha
              key={u.id}
              user={u}
              ferias={ferias.get(u.id)}
              onVer={() => setAVer(u)}
              tipos={tipos}
              onMudarTipo={(id, papel) => mudarTipo(u, id, papel)}
              erroTipo={errosTipo[u.id]}
            />
          ))}
        </ul>
        </div>
      </div>
      {aVer && <VistaFuncionario user={aVer} ferias={ferias.get(aVer.id)} onFechar={fecharVista} />}
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
