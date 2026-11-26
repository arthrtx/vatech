"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, mensagemDeErro, type ConvitePublico } from "@/lib/api";
import AuthQuadro from "@/app/login/AuthQuadro";
import { botao, erro as erroCls, input, label } from "@/components/ui";

function Formulario() {
  const token = String(useParams<{ token: string }>().token ?? "");
  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceita, setAceita] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.convite(token).then(
      (c) => ativo && setConvite(c),
      () => ativo && setInvalido(true),
    );
    return () => {
      ativo = false;
    };
  }, [token]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.aceitarConvite(token, { password, password_confirmation: confirmacao, aceita_termos: aceita });
      setConcluido("Conta criada. Aguarde a autorização do administrador.");
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  const ligacao = (
    <Link href="/login" className="text-center text-sm text-texto-suave underline underline-offset-2 hover:text-texto">
      Ir para o login
    </Link>
  );

  return (
    <AuthQuadro>
      <h1 className="titulo-bento">Aceitar convite</h1>
      {concluido ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-controlo border border-linha-forte bg-primaria-suave px-3 py-2 text-sm text-texto">
            {concluido}
          </p>
          {ligacao}
        </div>
      ) : invalido ? (
        <div className="flex flex-col gap-4">
          <p role="alert" className={erroCls}>
            Este convite é inválido, expirou ou foi revogado. Peça um novo ao administrador.
          </p>
          {ligacao}
        </div>
      ) : !convite ? (
        <p role="status" className="text-sm text-texto-suave">
          A carregar convite...
        </p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {convite.texto && (
            <p data-testid="texto-convite" className="whitespace-pre-line rounded-controlo border border-linha bg-primaria-suave px-3 py-2 text-sm text-texto">
              {convite.texto}
            </p>
          )}
          <div>
            <label htmlFor="nome" className={label}>
              Nome
            </label>
            <input id="nome" readOnly className={input} value={convite.nome} />
          </div>
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input id="email" type="email" readOnly className={input} value={convite.email} />
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
        </form>
      )}
    </AuthQuadro>
  );
}

export default function ConvitePage() {
  return (
    <Suspense>
      <Formulario />
    </Suspense>
  );
}
