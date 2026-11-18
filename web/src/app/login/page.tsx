"use client";

import { useEffect, useState } from "react";
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">vatech</h1>
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
    </main>
  );
}
