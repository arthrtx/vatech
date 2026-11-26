"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import AuthQuadro from "./AuthQuadro";
import { botao, botaoSec, erro as erroCls, input, label } from "@/components/ui";

function Formulario() {
  const verificado = useSearchParams().get("verificado");
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [porConfirmar, setPorConfirmar] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setPorConfirmar(false);
    setReenviado(false);
    setEnviando(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setErro(mensagemDeErro(err));
      setPorConfirmar(err instanceof ApiError && err.status === 422 && !!err.errors?.email?.some((m) => /confirm/i.test(m)));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setEnviando(true);
    try {
      await api.reenviarConfirmacao(email);
      setReenviado(true);
      setPorConfirmar(false);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthQuadro>
        <h1 className="titulo-bento flex items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-controlo bg-barra">
            <img src="/logo-setuptech.png" alt="" className="h-full w-full object-cover" />
          </span>
          Nick Fury
        </h1>
        {verificado === "1" && (
          <p role="status" className="rounded-controlo border border-linha-forte bg-primaria-suave px-3 py-2 text-sm text-texto">
            Email confirmado. Já pode entrar.
          </p>
        )}
        {verificado === "0" && (
          <p role="alert" className={erroCls}>
            Link inválido ou expirado.
          </p>
        )}
        {reenviado && (
          <p role="status" className="rounded-controlo border border-linha-forte bg-primaria-suave px-3 py-2 text-sm text-texto">
            Enviámos um novo link de confirmação para o seu email.
          </p>
        )}
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className={label}>
              Palavra-passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Link
              href={email ? `/recuperar?email=${encodeURIComponent(email)}` : "/recuperar"}
              className="mt-2 inline-block text-sm text-primaria-forte underline underline-offset-2 hover:text-primaria focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria dark:text-texto"
            >
              Esqueceu-se da palavra-passe?
            </Link>
          </div>
          {erro && (
            <p role="alert" className={erroCls}>
              {erro}
            </p>
          )}
          {porConfirmar && (
            <button type="button" disabled={enviando} onClick={reenviar} className={botaoSec}>
              Reenviar link
            </button>
          )}
          <button type="submit" disabled={enviando} className={botao}>
            {enviando ? "A entrar..." : "Entrar"}
          </button>
        </form>
    </AuthQuadro>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Formulario />
    </Suspense>
  );
}
