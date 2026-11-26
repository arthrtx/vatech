"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, mensagemDeErro } from "@/lib/api";
import AuthQuadro from "../login/AuthQuadro";
import { botao, erro as erroCls, input, label } from "@/components/ui";

function Formulario() {
  const [email, setEmail] = useState(useSearchParams().get("email") ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.esqueciPassword(email);
      setEnviado(true);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-texto">
          Se existir uma conta com o email <strong>{email}</strong>, enviámos-lhe um link para definir uma nova palavra-passe. O link
          expira em 60 minutos. Veja também a pasta de spam.
        </p>
        <Link href="/login" className={`${botao} text-center`}>
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-texto-suave">Indique o email da sua conta e enviamos-lhe um link para definir uma nova palavra-passe.</p>
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
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className={botao}>
        {enviando ? "A enviar..." : "Enviar link"}
      </button>
      <Link href="/login" className="text-center text-sm text-texto-suave underline underline-offset-2 hover:text-texto">
        Voltar ao login
      </Link>
    </form>
  );
}

export default function RecuperarPage() {
  return (
    <AuthQuadro>
        <h1 className="titulo-bento">Recuperar palavra-passe</h1>
        <Suspense>
          <Formulario />
        </Suspense>
    </AuthQuadro>
  );
}
