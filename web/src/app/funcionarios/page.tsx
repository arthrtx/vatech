"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, mensagemDeErro, type FeriasResumo, type User } from "@/lib/api";
import CampoBusca from "@/components/CampoBusca";
import FuncionarioLinha from "@/components/FuncionarioLinha";
import VistaFuncionario from "@/components/VistaFuncionario";
import { filtrar } from "@/lib/busca";
import { erro as erroCls } from "@/components/ui";

function Conteudo() {
  const [lista, setLista] = useState<User[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ferias, setFerias] = useState<Map<number, FeriasResumo>>(new Map());
  const [aVer, setAVer] = useState<User | null>(null);
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
    carregar();
  }, [carregar]);

  useEffect(() => {
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
  }, []);

  const visiveis = filtrar(lista ?? [], busca, (u) => [u.nome, u.email]);

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <h1 className="text-2xl font-semibold">Pessoas</h1>
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
            {lista.length === 0 ? "Ainda não há utilizadores." : `Nenhum resultado para "${busca.trim()}"`}
          </p>
        )}
        <ul className="scroll-fino grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start items-start gap-2 lg:min-h-0 lg:overflow-y-auto">
          {visiveis.map((u) => (
            <FuncionarioLinha
              key={u.id}
              user={u}
              ferias={ferias.get(u.id)}
              onVer={() => setAVer(u)}
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
    <AppShell soAdmin ecraInteiro>
      <Conteudo />
    </AppShell>
  );
}
