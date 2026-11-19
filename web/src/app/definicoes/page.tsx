"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import EscolhaLocalidade from "@/components/EscolhaLocalidade";
import CampoData from "@/components/CampoData";
import EscolhaTema from "@/components/EscolhaTema";
import { botao, botaoSec, erro as erroCls, input, label } from "@/components/ui";
import { ApiError, api, mensagemDeErro, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { papeis } from "@/lib/rotulos";

const cartao = "flex flex-col gap-4 rounded-cartao bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 p-4 md:p-6";
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
        <p>{papeis[user.papel]}</p>
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

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTO = 2 * 1024 * 1024;

function FotoPerfil({ user, atualizarUser }: { user: User; atualizarUser: (u: User) => void }) {
  const campo = useRef<HTMLInputElement>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [ok, setOk] = useState("");

  async function executar(acao: () => Promise<User>, mensagem: string) {
    setErroFoto(null);
    setOk("");
    setAEnviar(true);
    try {
      atualizarUser(await acao());
      setOk(mensagem);
    } catch (err) {
      setErroFoto(mensagemDeErro(err));
    } finally {
      setAEnviar(false);
    }
  }

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0];
    e.target.value = "";
    if (!ficheiro) return;
    if (!TIPOS_FOTO.includes(ficheiro.type)) return setErroFoto("Use uma imagem JPG, PNG ou WebP.");
    if (ficheiro.size > MAX_FOTO) return setErroFoto("A imagem não pode ter mais de 2 MB.");
    void executar(() => api.enviarAvatar(ficheiro), "Foto atualizada.");
  }

  return (
    <section aria-labelledby="foto-perfil" className={`${cartao} md:max-w-xl`}>
      <h2 id="foto-perfil" className="text-lg font-semibold">
        Foto de perfil
      </h2>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-20 w-20 text-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.nome}</p>
            <p className="truncate text-sm text-texto-suave">
              {user.email} · {papeis[user.papel]}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input ref={campo} type="file" accept={TIPOS_FOTO.join(",")} className="sr-only" aria-label="Escolher foto de perfil" onChange={escolher} />
            <button type="button" disabled={aEnviar} className={botaoSec} onClick={() => campo.current?.click()}>
              {aEnviar ? "A enviar..." : user.avatar_url ? "Alterar foto" : "Adicionar foto"}
            </button>
            {user.avatar_url && (
              <button type="button" disabled={aEnviar} className={botaoSec} onClick={() => void executar(api.removerAvatar, "Foto removida.")}>
                Remover foto
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-texto-suave">JPG, PNG ou WebP, até 2 MB.</p>
      {erroFoto && (
        <p role="alert" className={erroCls}>
          {erroFoto}
        </p>
      )}
      <p role="status">{ok}</p>
    </section>
  );
}

function DatasEstagio({ user, atualizarUser }: { user: User; atualizarUser: (u: User) => void }) {
  const [inicio, setInicio] = useState(user.estagio_inicio ?? "");
  const [fim, setFim] = useState(user.estagio_fim ?? "");
  const { erros, erroGeral, ok, enviando, submeter, desc, limparOk } = useEnvio(async () => {
    // O PUT /api/me exige nome e email: reenvia os valores actuais da conta.
    atualizarUser(
      await api.editarPerfil({ nome: user.nome, email: user.email, estagio_inicio: inicio || null, estagio_fim: fim || null }),
    );
  });
  const sujo = inicio !== (user.estagio_inicio ?? "") || fim !== (user.estagio_fim ?? "");
  const validar = (): Record<string, string[]> =>
    inicio && fim && fim < inicio ? { estagio_fim: ["A data de fim não pode ser anterior à de início."] } : {};

  return (
    <form onSubmit={(e) => submeter(e, validar)} noValidate aria-labelledby="def-estagio" className={`${cartao} md:max-w-xl`}>
      <h2 id="def-estagio" className="text-lg font-semibold">
        Datas do estágio
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="estagio_inicio" rotulo="Início do estágio" erros={erros.estagio_inicio}>
          <CampoData
            id="estagio_inicio"
            valor={inicio}
            aria-invalid={!!erros.estagio_inicio}
            aria-describedby={desc("estagio_inicio")}
            onChange={(v) => {
              setInicio(v);
              limparOk();
            }}
          />
        </Campo>
        <Campo id="estagio_fim" rotulo="Fim do estágio" erros={erros.estagio_fim}>
          <CampoData
            id="estagio_fim"
            min={inicio || undefined}
            valor={fim}
            aria-invalid={!!erros.estagio_fim}
            aria-describedby={desc("estagio_fim")}
            onChange={(v) => {
              setFim(v);
              limparOk();
            }}
          />
        </Campo>
      </div>
      <Rodape erroGeral={erroGeral} ok={ok} enviando={enviando} sujo={sujo} />
    </form>
  );
}

function Conteudo() {
  const { user, atualizarUser } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Definições</h1>
      <FotoPerfil user={user} atualizarUser={atualizarUser} />
      {user.papel === "estagiario" && <DatasEstagio user={user} atualizarUser={atualizarUser} />}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
        <DadosConta user={user} atualizarUser={atualizarUser} />
        <AlterarPalavraPasse user={user} atualizarUser={atualizarUser} />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
      <section aria-labelledby="def-aparencia" className={cartao}>
        <div>
          <h2 id="def-aparencia" className="text-lg font-semibold">
            Aparência
          </h2>
          <p className="text-sm text-texto-suave">
            Claro, escuro ou igual ao sistema. Também podes trocar no botão da lua, ao lado da pesquisa.
          </p>
        </div>
        <EscolhaTema />
      </section>
      <section aria-labelledby="def-localidade" className={cartao}>
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
