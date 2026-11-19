"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, mensagemDeErro, type User } from "@/lib/api";
import CampoBusca from "@/components/CampoBusca";
import FuncionarioLinha from "@/components/FuncionarioLinha";
import { filtrar } from "@/lib/busca";
import { botao, erro as erroCls, input, label } from "@/components/ui";

function Conteudo() {
  const [lista, setLista] = useState<User[] | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

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

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await api.criarFuncionario({ nome, email, password });
      setNome("");
      setEmail("");
      setPassword("");
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  const visiveis = filtrar(lista ?? [], busca, (u) => [u.nome, u.email]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Funcionários</h1>
      <CampoBusca id="busca-funcionarios" rotulo="Pesquisar funcionários" valor={busca} onChange={setBusca} />
      {lista !== null && visiveis.length === 0 && (
        <p className="text-texto-suave">
          {lista.length === 0 ? "Ainda não há funcionários." : `Nenhum resultado para "${busca.trim()}"`}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {visiveis.map((u) => (
          <FuncionarioLinha
            key={u.id}
            user={u}
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
      <form onSubmit={criar} className="flex max-w-xl flex-col gap-4 rounded-cartao p-5 bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10" aria-labelledby="novo-func">
        <h2 id="novo-func" className="text-lg font-semibold">
          Novo funcionário
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
        {erro && (
          <p role="alert" className={erroCls}>
            {erro}
          </p>
        )}
        <div>
          <button type="submit" className={botao}>
            Criar funcionário
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FuncionáriosPage() {
  return (
    <AppShell soAdmin>
      <Conteudo />
    </AppShell>
  );
}
