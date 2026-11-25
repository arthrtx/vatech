"use client";

import { useState } from "react";
import Link from "next/link";
import { api, mensagemDeErro } from "@/lib/api";
import { botao, erro as erroCls, input, label } from "@/components/ui";

export default function RegistoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceita, setAceita] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.registo({ nome, email, password, password_confirmation: confirmacao, aceita_termos: aceita });
      setEnviado(true);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-cartao bg-painel p-8 shadow-suave">
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        {enviado ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="text-sm text-texto">
              Enviámos um link de confirmação para o seu email <strong>{email}</strong>. Veja também a pasta de spam.
            </p>
            <Link href="/login" className={`${botao} text-center`}>
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div>
              <label htmlFor="nome" className={label}>
                Nome
              </label>
              <input id="nome" autoComplete="name" required className={input} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
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
                autoComplete="new-password"
                required
                className={input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password_confirmation" className={label}>
                Confirmar palavra-passe
              </label>
              <input
                id="password_confirmation"
                type="password"
                autoComplete="new-password"
                required
                className={input}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-2">
              <input
                id="aceita_termos"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 shrink-0 accent-primaria focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
                checked={aceita}
                onChange={(e) => setAceita(e.target.checked)}
              />
              <label htmlFor="aceita_termos" className="text-sm text-texto">
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="underline underline-offset-2 hover:text-primaria">
                  Termos e Condições
                </Link>
              </label>
            </div>
            {erro && (
              <p role="alert" className={erroCls}>
                {erro}
              </p>
            )}
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? "A criar..." : "Criar conta"}
            </button>
            <Link href="/login" className="text-center text-sm text-texto-suave underline underline-offset-2 hover:text-texto">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
