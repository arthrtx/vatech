"use client";

import { useEffect, useRef, useState } from "react";
import { mensagemDeErro, type User } from "@/lib/api";
import { botao, botaoSec, erro as erroCls, input, label } from "./ui";

interface Props {
  user: User;
  onGuardar: (dados: { nome: string; email: string; password?: string }) => Promise<void>;
  onApagar: () => Promise<void>;
}

type Modo = "ver" | "editar" | "apagar";

export default function FuncionarioLinha({ user, onGuardar, onApagar }: Props) {
  const [modo, setModo] = useState<Modo>("ver");
  const [nome, setNome] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const editarRef = useRef<HTMLButtonElement>(null);
  const apagarRef = useRef<HTMLButtonElement>(null);
  const voltou = useRef<"editar" | "apagar" | null>(null);

  useEffect(() => {
    if (modo === "editar") nomeRef.current?.focus();
    else if (modo === "apagar") confirmarRef.current?.focus();
    else if (voltou.current === "editar") editarRef.current?.focus();
    else if (voltou.current === "apagar") apagarRef.current?.focus();
    voltou.current = null;
  }, [modo]);

  function abrir(m: Modo) {
    setErro(null);
    setNome(user.nome);
    setEmail(user.email);
    setPassword("");
    setModo(m);
  }

  function cancelar() {
    voltou.current = modo === "editar" ? "editar" : "apagar";
    setErro(null);
    setModo("ver");
  }

  async function executar(acao: () => Promise<void>) {
    setErro(null);
    setAGravar(true);
    try {
      await acao();
      voltou.current = modo === "editar" ? "editar" : null;
      setModo("ver");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAGravar(false);
    }
  }

  const aviso = erro && (
    <p role="alert" className={erroCls}>
      {erro}
    </p>
  );

  return (
    <li className="rounded-md border border-zinc-300 bg-white p-3">
      {modo === "editar" ? (
        <form
          className="flex max-w-xl flex-col gap-3"
          aria-label={`Editar ${user.nome}`}
          onSubmit={(e) => {
            e.preventDefault();
            executar(() => onGuardar({ nome, email, ...(password ? { password } : {}) }));
          }}
        >
          <div>
            <label htmlFor={`e-nome-${user.id}`} className={label}>
              Nome
            </label>
            <input
              id={`e-nome-${user.id}`}
              ref={nomeRef}
              required
              className={input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`e-email-${user.id}`} className={label}>
              Email
            </label>
            <input
              id={`e-email-${user.id}`}
              type="email"
              required
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`e-pass-${user.id}`} className={label}>
              Nova palavra-passe (opcional)
            </label>
            <input
              id={`e-pass-${user.id}`}
              type="password"
              autoComplete="new-password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {aviso}
          <div className="flex gap-2">
            <button type="submit" className={botao} disabled={aGravar}>
              Guardar
            </button>
            <button type="button" className={botaoSec} onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="font-medium">{user.nome}</p>
          <p className="break-all text-sm text-zinc-700">{user.email}</p>
          {modo === "apagar" ? (
            <div role="alertdialog" aria-label={`Apagar ${user.nome}`} className="mt-3 flex flex-col gap-2">
              <p className="text-sm text-zinc-900">Apagar {user.nome}? Os pedidos deixam de aparecer.</p>
              {aviso}
              <div className="flex gap-2">
                <button
                  type="button"
                  ref={confirmarRef}
                  className={botao}
                  disabled={aGravar}
                  onClick={() => executar(onApagar)}
                >
                  Confirmar
                </button>
                <button type="button" className={botaoSec} onClick={cancelar}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                ref={editarRef}
                className={botaoSec}
                aria-label={`Editar ${user.nome}`}
                onClick={() => abrir("editar")}
              >
                Editar
              </button>
              <button
                type="button"
                ref={apagarRef}
                className={botaoSec}
                aria-label={`Apagar ${user.nome}`}
                onClick={() => abrir("apagar")}
              >
                Apagar
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
