"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, mensagemDeErro, type FeriasResumo, type Papel, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { papeis } from "@/lib/rotulos";
import Seletor from "@/components/Seletor";
import CampoBusca from "@/components/CampoBusca";
import FuncionarioLinha from "@/components/FuncionarioLinha";
import VistaFuncionario from "@/components/VistaFuncionario";
import { filtrar } from "@/lib/busca";
import { botao, erro as erroCls, input, label } from "@/components/ui";

const opcoesPapel = (Object.keys(papeis) as Papel[]).map((valor) => ({ valor, rotulo: papeis[valor] }));

function Conteudo() {
  const { user: eu } = useAuth();
  const [lista, setLista] = useState<User[] | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [papel, setPapel] = useState<Papel>("funcionario");
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

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await api.criarFuncionario({ nome, email, password, papel });
      setNome("");
      setEmail("");
      setPassword("");
      setPapel("funcionario");
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  const visiveis = filtrar(lista ?? [], busca, (u) => [u.nome, u.email]);

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <h1 className="text-2xl font-semibold">Pessoas</h1>
      <div className="flex flex-col gap-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <form onSubmit={criar} className="flex flex-col gap-4 rounded-cartao p-5 bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10" aria-labelledby="novo-func">
          <h2 id="novo-func" className="text-lg font-semibold">
            Novo utilizador
          </h2>
          <div>
            <label htmlFor="f-nome" className={label}>
              Nome
            </label>
            <input id="f-nome" required className={input} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-email" className={label}>
              Email
            </label>
            <input
              id="f-email"
              type="email"
              required
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="f-pass" className={label}>
              Palavra-passe
            </label>
            <input
              id="f-pass"
              type="password"
              autoComplete="new-password"
              required
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="f-papel" className={label}>
              Tipo
            </label>
            <Seletor id="f-papel" valor={papel} opcoes={opcoesPapel} onChange={(v) => setPapel(v as Papel)} />
          </div>
          {erro && (
            <p role="alert" className={erroCls}>
              {erro}
            </p>
          )}
          <div>
            <button type="submit" className={botao}>
              Criar utilizador
            </button>
          </div>
        </form>
        <div className="flex min-w-0 flex-col gap-3 lg:max-h-full lg:min-h-0">
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
              proprio={u.id === eu?.id}
              ferias={ferias.get(u.id)}
              onVer={() => setAVer(u)}
              onGuardar={async (dados) => {
                await api.editarFuncionario(u.id, dados);
                await carregar();
              }}
              onApagar={async () => {
                await api.apagarFuncionario(u.id);
                await carregar();
              }}
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
