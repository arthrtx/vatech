"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, mensagemDeErro } from "@/lib/api";
import AuthQuadro from "../login/AuthQuadro";
import { botao, erro as erroCls, input, label } from "@/components/ui";

function Formulario() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!token || !email) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className={erroCls}>
          Este link não é válido. Peça um novo.
        </p>
        <Link href="/recuperar" className={`${botao} text-center`}>
          Pedir novo link
        </Link>
      </div>
    );
  }

  if (feito) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-texto">
          Palavra-passe alterada. Já pode entrar com a nova palavra-passe.
        </p>
        <Link href="/login" className={`${botao} text-center`}>
          Ir para o login
        </Link>
      </div>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (password !== confirmar) {
      setErro("As palavras-passe não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      await api.redefinirPassword({ token, email, password, password_confirmation: confirmar });
      setFeito(true);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-texto-suave">
        Nova palavra-passe para <strong className="text-texto">{email}</strong>.
      </p>
      <div>
        <label htmlFor="password" className={label}>
          Nova palavra-passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-texto-suave">Pelo menos 8 caracteres.</p>
      </div>
      <div>
        <label htmlFor="confirmar" className={label}>
          Repetir palavra-passe
        </label>
        <input
          id="confirmar"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className={botao}>
        {enviando ? "A guardar..." : "Guardar palavra-passe"}
      </button>
    </form>
  );
}

export default function RedefinirPage() {
  return (
    <AuthQuadro>
        <h1 className="titulo-bento">Nova palavra-passe</h1>
        <Suspense>
          <Formulario />
        </Suspense>
    </AuthQuadro>
  );
}
