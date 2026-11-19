"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import EscolhaLocalidade from "@/components/EscolhaLocalidade";
import { botao, erro as erroCls, input, label } from "@/components/ui";
import { ApiError, api, mensagemDeErro, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const cartao = "flex flex-col gap-4 rounded-cartao bg-painel shadow-suave p-4 md:p-6";
const botaoGuardar = `${botao} min-h-10`;

function Campo({ id, rotulo, erros, children }: { id: string; rotulo: string; erros?: string[]; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {rotulo}
      </label>
      {children}
      {erros?.length ? (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-sm text-texto">
          {erros.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function Rodape({ erroGeral, ok, enviando, sujo }: { erroGeral: string | null; ok: boolean; enviando: boolean; sujo: boolean }) {
  return (
    <div className="mt-auto flex flex-col gap-3">
      {erroGeral && (
        <p role="alert" className={erroCls}>
          {erroGeral}
        </p>
      )}
      <p role="status">{ok ? "Dados guardados." : ""}</p>
      <div>
        <button type="submit" disabled={enviando || !sujo} className={botaoGuardar}>
          {enviando ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// Estado partilhado pelas duas secções: erros por campo, erro geral, sucesso e envio.
function useEnvio(enviar: () => Promise<void>) {
  const [erros, setErros] = useState<Record<string, string[]>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function submeter(e: React.FormEvent, validar?: () => Record<string, string[]>) {
    e.preventDefault();
    setErroGeral(null);
    setOk(false);
    const locais = validar?.() ?? {};
    setErros(locais);
    const primeiro = Object.keys(locais)[0];
    if (primeiro) {
      // validar() devolve as chaves pela ordem dos campos no ecrã.
      e.currentTarget.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      await enviar();
      setOk(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setErroGeral("Demasiadas tentativas. Tente de novo dentro de um minuto.");
      else if (err instanceof ApiError && err.errors) setErros(err.errors);
      else setErroGeral(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }
  const desc = (id: string) => (erros[id]?.length ? `${id}-erro` : undefined);
  const limparOk = () => setOk(false);
  return { erros, erroGeral, ok, enviando, submeter, desc, limparOk };
}

function DadosConta({ user, atualizarUser }: { user: User; atualizarUser: (u: User) => void }) {
  const [nome, setNome] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [atual, setAtual] = useState("");
  const emailMudou = email !== user.email;
  const { erros, erroGeral, ok, enviando, submeter, desc, limparOk } = useEnvio(async () => {
    atualizarUser(await api.editarPerfil(emailMudou ? { nome, email, password_atual: atual } : { nome, email }));
    setAtual("");
  });
  const sujo = nome !== user.nome || emailMudou;
  const validar = (): Record<string, string[]> =>
    emailMudou && !atual ? { password_atual: ["Indique a palavra-passe atual para alterar o email."] } : {};

  return (
    <form onSubmit={(e) => submeter(e, validar)} noValidate aria-labelledby="conta" className={cartao}>
      <h2 id="conta" className="text-lg font-semibold">
        Dados da conta
      </h2>
      <Campo id="nome" rotulo="Nome" erros={erros.nome}>
        <input
          id="nome"
          type="text"
          required
          autoComplete="name"
          className={input}
          value={nome}
          aria-invalid={!!erros.nome}
          aria-describedby={desc("nome")}
          onChange={(e) => {
            setNome(e.target.value);
            limparOk();
          }}
        />
      </Campo>
      <Campo id="email" rotulo="Email" erros={erros.email}>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className={input}
          value={email}
          aria-invalid={!!erros.email}
          aria-describedby={desc("email")}
          onChange={(e) => {
            setEmail(e.target.value);
            limparOk();
          }}
        />
      </Campo>
      {emailMudou && (
        <Campo id="conta_password_atual" rotulo="Palavra-passe atual" erros={erros.password_atual}>
          <input
            id="conta_password_atual"
            data-campo="password_atual"
            type="password"
            required
            autoComplete="current-password"
            className={input}
            value={atual}
            aria-invalid={!!erros.password_atual}
            aria-describedby={erros.password_atual?.length ? "conta_password_atual-erro" : undefined}
            onChange={(e) => {
              setAtual(e.target.value);
              limparOk();
            }}
          />
        </Campo>
      )}
      <div>
        <p className={label}>Papel</p>
        <p>{user.papel === "admin" ? "Administrador" : "Funcionário"}</p>
        {user.papel !== "admin" && <p className="text-sm text-texto-suave">Só um administrador altera.</p>}
      </div>
      <Rodape erroGeral={erroGeral} ok={ok} enviando={enviando} sujo={sujo} />
    </form>
  );
}

function AlterarPalavraPasse({ user, atualizarUser }: { user: User; atualizarUser: (u: User) => void }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const { erros, erroGeral, ok, enviando, submeter, desc, limparOk } = useEnvio(async () => {
    // O PUT /api/me exige nome e email: reenvia os valores actuais da conta.
    atualizarUser(await api.editarPerfil({ nome: user.nome, email: user.email, password: nova, password_atual: atual }));
    setAtual("");
    setNova("");
    setConfirmar("");
  });
  const sujo = !!(atual || nova || confirmar);
  const validar = (): Record<string, string[]> => ({
    ...(!atual ? { password_atual: ["Indique a palavra-passe atual."] } : {}),
    ...(nova.length < 8 ? { password: ["A nova palavra-passe deve ter pelo menos 8 caracteres."] } : {}),
    ...(confirmar !== nova ? { password_confirmacao: ["As palavras-passe não coincidem."] } : {}),
  });

  return (
    <form onSubmit={(e) => submeter(e, validar)} noValidate aria-labelledby="palavra-passe" className={cartao}>
      <h2 id="palavra-passe" className="text-lg font-semibold">
        Alterar palavra-passe
      </h2>
      <Campo id="password_atual" rotulo="Palavra-passe atual" erros={erros.password_atual}>
        <input
          id="password_atual"
          data-campo="password_atual"
          type="password"
          required
          autoComplete="current-password"
          className={input}
          value={atual}
          aria-invalid={!!erros.password_atual}
          aria-describedby={desc("password_atual")}
          onChange={(e) => {
            setAtual(e.target.value);
            limparOk();
          }}
        />
      </Campo>
      <Campo id="password" rotulo="Nova palavra-passe (mín. 8)" erros={erros.password}>
        <input
          id="password"
          data-campo="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
          value={nova}
          aria-invalid={!!erros.password}
          aria-describedby={desc("password")}
          onChange={(e) => {
            setNova(e.target.value);
            limparOk();
          }}
        />
      </Campo>
      <Campo id="password_confirmacao" rotulo="Confirmar nova palavra-passe" erros={erros.password_confirmacao}>
        <input
          id="password_confirmacao"
          data-campo="password_confirmacao"
          type="password"
          required
          autoComplete="new-password"
          className={input}
          value={confirmar}
          aria-invalid={!!erros.password_confirmacao}
          aria-describedby={desc("password_confirmacao")}
          onChange={(e) => {
            setConfirmar(e.target.value);
            limparOk();
          }}
        />
      </Campo>
      <Rodape erroGeral={erroGeral} ok={ok} enviando={enviando} sujo={sujo} />
    </form>
  );
}

function Conteudo() {
  const { user, atualizarUser } = useAuth();
  if (!user) return null;

  const iniciais = user.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Definições</h1>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-lg font-semibold text-primaria-forte"
        >
          {iniciais}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.nome}</p>
          <p className="truncate text-sm text-texto-suave">
            {user.email} · {user.papel === "admin" ? "Administrador" : "Funcionário"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
        <DadosConta user={user} atualizarUser={atualizarUser} />
        <AlterarPalavraPasse user={user} atualizarUser={atualizarUser} />
      </div>
      <section aria-labelledby="def-localidade" className={`${cartao} md:max-w-xl`}>
        <div>
          <h2 id="def-localidade" className="text-lg font-semibold">
            Localidade
          </h2>
          <p className="text-sm text-texto-suave">
            Escolhe o concelho para a Agenda mostrar o feriado municipal. Fica guardado neste navegador.
          </p>
        </div>
        <EscolhaLocalidade />
      </section>
    </div>
  );
}

export default function DefinicoesPage() {
  return (
    <AppShell>
      <Conteudo />
    </AppShell>
  );
}
