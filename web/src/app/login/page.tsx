"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mensagemDeErro } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { botao, erro as erroCls, input, label } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-cartao bg-painel p-8 shadow-suave">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-controlo bg-primaria text-base text-white">
            v
          </span>
          vatech
        </h1>
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
          <button type="submit" disabled={enviando} className={botao}>
            {enviando ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
