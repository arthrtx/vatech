"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import EscolhaLocalidade from "@/components/EscolhaLocalidade";
import CampoData from "@/components/CampoData";
import FormaCanto from "./FormaCanto";
import EscolhaTema from "@/components/EscolhaTema";
import CampoHora from "@/components/CampoHora";
import PermissoesAdmin from "@/components/PermissoesAdmin";
import { botao, botaoSec, erro as erroCls, input, label } from "@/components/ui";
import { ApiError, api, mensagemDeErro, type Horario, type HorarioPessoa, type User } from "@/lib/api";
import { duracao, jornadaMin, textoAlmoco } from "@/lib/horario";
import { useAuth } from "@/lib/auth";
import { rotuloPapel } from "@/lib/rotulos";
import { primeiroNome } from "@/lib/saudacao";

const cartao = "relative isolate flex flex-col gap-4 rounded-barra border border-linha bg-painel p-5 md:p-7 has-[[role=dialog]]:z-20 has-[[role=combobox][aria-expanded=true]]:z-20";
const botaoGuardar = `${botao} min-h-10`;

function Campo({ id, rotulo, erros, dica, children }: { id: string; rotulo: string; erros?: string[]; dica?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {rotulo}
      </label>
      {children}
      {dica && <p className="mt-1 text-xs text-texto-suave">{dica}</p>}
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
    const form = e.currentTarget;
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
      else if (err instanceof ApiError && err.errors) {
        const erros = err.errors;
        setErros(erros);
        const primeiro = Object.keys(erros)[0];
        setTimeout(() => form.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`)?.focus(), 0);
      }
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
  const [nascimento, setNascimento] = useState(user.data_nascimento ?? "");
  const [atual, setAtual] = useState("");
  const emailMudou = email !== user.email;
  const { erros, erroGeral, ok, enviando, submeter, desc, limparOk } = useEnvio(async () => {
    const dados = { nome, email, data_nascimento: nascimento || null };
    atualizarUser(await api.editarPerfil(emailMudou ? { ...dados, password_atual: atual } : dados));
    setAtual("");
  });
  const sujo = nome !== user.nome || emailMudou || nascimento !== (user.data_nascimento ?? "");
  const validar = (): Record<string, string[]> =>
    emailMudou && !atual ? { password_atual: ["Indique a palavra-passe atual para alterar o email."] } : {};

  return (
    <form onSubmit={(e) => submeter(e, validar)} noValidate aria-labelledby="conta" className={cartao}>
      <FormaCanto tom="violeta" />
      <h2 id="conta" className="text-xl font-bold tracking-tight">
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
      <Campo id="data_nascimento" rotulo="Data de nascimento (opcional)" erros={erros.data_nascimento}>
        <CampoData
          id="data_nascimento"
          valor={nascimento}
          aria-invalid={!!erros.data_nascimento}
          aria-describedby={[erros.data_nascimento?.length ? "data_nascimento-erro" : "", "data_nascimento-ajuda"].filter(Boolean).join(" ")}
          onChange={(v) => {
            setNascimento(v);
            limparOk();
          }}
        />
        <p id="data_nascimento-ajuda" className="mt-1 text-sm text-texto-suave">
          Se indicar, a equipa vê «Aniversário de {primeiroNome(nome) || "…"}» na agenda nesse dia (só o dia e o mês).
        </p>
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
        <p>{rotuloPapel(user)}</p>
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
      <FormaCanto tom="pessego" />
      <h2 id="palavra-passe" className="text-xl font-bold tracking-tight">
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
    <section aria-labelledby="foto-perfil" className={cartao}>
      <FormaCanto tom="rosa" />
      <h2 id="foto-perfil" className="text-xl font-bold tracking-tight">
        Foto de perfil
      </h2>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-20 w-20 text-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.nome}</p>
            <p className="truncate text-sm text-texto-suave">
              {user.email} · {rotuloPapel(user)}
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
    <form onSubmit={(e) => submeter(e, validar)} noValidate aria-labelledby="def-estagio" className={cartao}>
      <FormaCanto tom="pessego" baixo />
      <h2 id="def-estagio" className="text-xl font-bold tracking-tight">
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

const MAX_TEXTO_CONVITE = 1000;

function TextoConvite() {
  const [texto, setTexto] = useState("");
  const [inicial, setInicial] = useState("");
  const [predefinido, setPredefinido] = useState(true);
  const [carregado, setCarregado] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [aRepor, setARepor] = useState(false);
  const [erroRepor, setErroRepor] = useState<string | null>(null);
  const { erros, erroGeral, ok, enviando, submeter, desc, limparOk } = useEnvio(async () => {
    aplicar(await api.guardarTextoConvite(texto.trim() === "" ? null : texto));
  });

  function aplicar(r: { texto: string; predefinido: boolean }) {
    setTexto(r.texto);
    setInicial(r.texto);
    setPredefinido(r.predefinido);
  }

  useEffect(() => {
    let ativo = true;
    api
      .textoConvite()
      .then((r) => {
        if (!ativo) return;
        aplicar(r);
        setCarregado(true);
      })
      .catch((err) => ativo && setErroCarga(mensagemDeErro(err)));
    return () => {
      ativo = false;
    };
  }, []);

  async function repor() {
    setErroRepor(null);
    limparOk();
    setARepor(true);
    try {
      aplicar(await api.guardarTextoConvite(null));
    } catch (err) {
      setErroRepor(mensagemDeErro(err));
    } finally {
      setARepor(false);
    }
  }

  const sujo = texto !== inicial;
  return (
    <form onSubmit={(e) => submeter(e)} noValidate aria-labelledby="def-texto-convite" className={cartao}>
      <div>
        <FormaCanto tom="pessego" />
        <h2 id="def-texto-convite" className="text-xl font-bold tracking-tight">
          Texto do convite
        </h2>
        <p className="text-sm text-texto-suave">Mensagem mostrada a quem recebe um convite, no topo da página de criação de conta.</p>
      </div>
      {erroCarga && (
        <p role="alert" className={erroCls}>
          {erroCarga}
        </p>
      )}
      <Campo id="texto_convite" rotulo="Mensagem" erros={erros.texto}>
        <textarea
          id="texto_convite"
          data-campo="texto"
          rows={5}
          maxLength={MAX_TEXTO_CONVITE}
          disabled={!carregado}
          className={`${input} rounded-none!`}
          value={texto}
          aria-invalid={!!erros.texto}
          aria-describedby={desc("texto") ? "texto_convite-erro" : undefined}
          onChange={(e) => {
            setTexto(e.target.value);
            limparOk();
          }}
        />
        <p className="mt-1 text-sm text-texto-suave">
          {texto.length}/{MAX_TEXTO_CONVITE} caracteres{predefinido ? " · texto predefinido" : ""}
        </p>
      </Campo>
      {erroRepor && (
        <p role="alert" className={erroCls}>
          {erroRepor}
        </p>
      )}
      <Rodape erroGeral={erroGeral} ok={ok} enviando={enviando} sujo={sujo} />
      <div>
        <button type="button" disabled={!carregado || aRepor || enviando} className={botaoSec} onClick={() => void repor()}>
          {aRepor ? "A repor..." : "Repor predefinido"}
        </button>
      </div>
    </form>
  );
}

const campoMin = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : null);

type Valores = { entrada: string; saida: string; inicio: string; almoco: string };
const deHorario = (h: Horario): Valores => ({ entrada: h.entrada, saida: h.saida, inicio: h.almoco_inicio, almoco: String(h.almoco_min) });
const paraHorario = (v: Valores): Horario => ({ entrada: v.entrada, saida: v.saida, almoco_inicio: v.inicio, almoco_min: campoMin(v.almoco) ?? 0 });
// Por pessoa: só o que difere da empresa fica personalizado; o igual segue a empresa (null).
const paraPessoa = (v: Valores, e: Horario) => {
  const h = paraHorario(v);
  return {
    entrada: h.entrada === e.entrada ? null : h.entrada,
    saida: h.saida === e.saida ? null : h.saida,
    almoco_inicio: h.almoco_inicio === e.almoco_inicio ? null : h.almoco_inicio,
    almoco_min: h.almoco_min === e.almoco_min ? null : h.almoco_min,
  };
};
const validarValores = (v: Valores): Record<string, string[]> => ({
  ...(!v.entrada ? { entrada: ["Indique a hora de entrada."] } : {}),
  ...(!v.saida ? { saida: ["Indique a hora de saída."] } : {}),
  ...(!v.inicio ? { almoco_inicio: ["Indique a hora de início do almoço."] } : {}),
  ...(campoMin(v.almoco) === null ? { almoco_min: ["Indique a duração do almoço em minutos (0 se não houver)."] } : {}),
});

/** Quatro campos do horário: entrada, saída, início do almoço e duração. Com `empresa`, indica por campo se difere dela. */
function CamposHorario({
  prefixo,
  v,
  onChange,
  erros,
  empresa,
}: {
  prefixo: string;
  v: Valores;
  onChange: (v: Valores) => void;
  erros: Record<string, string[]>;
  empresa?: Horario;
}) {
  const min = campoMin(v.almoco);
  const t = min === null ? null : jornadaMin(v.entrada, v.saida, min);
  const e = empresa ? deHorario(empresa) : null;
  const dica = (chave: keyof Valores) => (e ? (v[chave] === e[chave] ? "Igual à empresa" : "Personalizado") : undefined);
  const ligacao = (chave: string, id: string) => ({
    "aria-invalid": !!erros[chave],
    "aria-describedby": erros[chave]?.length ? `${id}-erro` : undefined,
    "data-campo": chave,
  });
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${prefixo}-entrada`} rotulo="Entrada" erros={erros.entrada} dica={dica("entrada")}>
          <CampoHora id={`${prefixo}-entrada`} valor={v.entrada} onChange={(x) => onChange({ ...v, entrada: x })} {...ligacao("entrada", `${prefixo}-entrada`)} />
        </Campo>
        <Campo id={`${prefixo}-saida`} rotulo="Saída" erros={erros.saida} dica={dica("saida")}>
          <CampoHora id={`${prefixo}-saida`} valor={v.saida} onChange={(x) => onChange({ ...v, saida: x })} {...ligacao("saida", `${prefixo}-saida`)} />
        </Campo>
        <Campo id={`${prefixo}-inicio`} rotulo="Almoço das" erros={erros.almoco_inicio} dica={dica("inicio")}>
          <CampoHora id={`${prefixo}-inicio`} valor={v.inicio} onChange={(x) => onChange({ ...v, inicio: x })} {...ligacao("almoco_inicio", `${prefixo}-inicio`)} />
        </Campo>
        <Campo id={`${prefixo}-almoco`} rotulo="Durante (minutos)" erros={erros.almoco_min} dica={dica("almoco")}>
          <input
            id={`${prefixo}-almoco`}
            type="number"
            inputMode="numeric"
            min={0}
            className={input}
            value={v.almoco}
            {...ligacao("almoco_min", `${prefixo}-almoco`)}
            onChange={(ev) => onChange({ ...v, almoco: ev.target.value })}
          />
        </Campo>
      </div>
      <p className="text-sm text-texto-suave">{t === null ? "Jornada por definir." : `${duracao(t)} de trabalho.`}</p>
    </>
  );
}

function HorarioEmpresa({ onGuardado }: { onGuardado: () => void }) {
  const [v, setV] = useState<Valores>({ entrada: "", saida: "", inicio: "", almoco: "" });
  const [guardado, setGuardado] = useState<Valores>(v);
  const [carregado, setCarregado] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const { erros, erroGeral, ok, enviando, submeter, limparOk } = useEnvio(async () => {
    aplicar(await api.definirHorarioEmpresa(paraHorario(v)));
    onGuardado();
  });

  function aplicar(h: Horario) {
    setV(deHorario(h));
    setGuardado(deHorario(h));
  }

  useEffect(() => {
    let ativo = true;
    api
      .getHorario()
      .then((r) => {
        if (!ativo) return;
        aplicar(r.empresa);
        setCarregado(true);
      })
      .catch((err) => ativo && setErroCarga(mensagemDeErro(err)));
    return () => {
      ativo = false;
    };
  }, []);

  const sujo = carregado && JSON.stringify(v) !== JSON.stringify(guardado);
  return (
    <form onSubmit={(e) => submeter(e, () => validarValores(v))} noValidate aria-labelledby="def-horario" className={cartao}>
      <div>
        <FormaCanto tom="violeta" baixo />
        <h2 id="def-horario" className="text-xl font-bold tracking-tight">
          Horário da empresa
        </h2>
        <p className="text-sm text-texto-suave">
          Vale para todos, salvo quem tiver horário personalizado. O almoço não conta para o total de horas.
        </p>
      </div>
      {erroCarga && (
        <p role="alert" className={erroCls}>
          {erroCarga}
        </p>
      )}
      <CamposHorario
        prefixo="horario"
        v={v}
        erros={erros}
        onChange={(x) => {
          setV(x);
          limparOk();
        }}
      />
      <Rodape erroGeral={erroGeral} ok={ok} enviando={enviando} sujo={sujo} />
    </form>
  );
}

const textoHorario = (h: Horario) => `${h.entrada} às ${h.saida}, ${textoAlmoco(h.almoco_inicio, h.almoco_min)}`;

function LinhaHorario({
  p,
  email,
  empresa,
  onAtualizado,
}: {
  p: HorarioPessoa;
  email?: string;
  empresa: Horario;
  onAtualizado: (p: HorarioPessoa) => void;
}) {
  const [aEditar, setAEditar] = useState(false);
  const [v, setV] = useState<Valores>(deHorario(p.efectivo));
  const [aVoltar, setAVoltar] = useState(false);
  const [erroVoltar, setErroVoltar] = useState<string | null>(null);
  const personalizado = p.entrada !== null || p.saida !== null || p.almoco_inicio !== null || p.almoco_min !== null;
  const rotulo = email ? `${p.nome} (${email})` : p.nome;
  const { erros, erroGeral, enviando, submeter, limparOk } = useEnvio(async () => {
    onAtualizado(await api.definirHorarioPessoa(p.user_id, paraPessoa(v, empresa)));
    setAEditar(false);
  });

  async function voltar() {
    setErroVoltar(null);
    setAVoltar(true);
    try {
      onAtualizado(await api.definirHorarioPessoa(p.user_id, { entrada: null, saida: null, almoco_inicio: null, almoco_min: null }));
      setAEditar(false);
    } catch (err) {
      setErroVoltar(mensagemDeErro(err));
    } finally {
      setAVoltar(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 border-t border-linha pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{p.nome}</p>
          {email && <p className="truncate text-sm text-texto-suave">{email}</p>}
          <p className="text-sm text-texto-suave">{textoHorario(p.efectivo)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-linha-forte px-2.5 py-0.5 text-xs text-texto-suave">
            {personalizado ? "Personalizado" : "Segue a empresa"}
          </span>
          {!aEditar && (
            <button
              type="button"
              className={botaoSec}
              aria-label={`Editar horário de ${rotulo}`}
              onClick={() => {
                setV(deHorario(p.efectivo));
                setAEditar(true);
              }}
            >
              Editar
            </button>
          )}
        </div>
      </div>
      {aEditar && (
        <form onSubmit={(e) => submeter(e, () => validarValores(v))} noValidate aria-label={`Horário de ${rotulo}`} className="flex flex-col gap-3">
          <CamposHorario
            prefixo={`hp-${p.user_id}`}
            v={v}
            erros={erros}
            empresa={empresa}
            onChange={(x) => {
              setV(x);
              limparOk();
            }}
          />
          {(erroGeral || erroVoltar) && (
            <p role="alert" className={erroCls}>
              {erroGeral ?? erroVoltar}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={enviando || aVoltar} className={botaoGuardar}>
              {enviando ? "A guardar..." : "Guardar"}
            </button>
            <button type="button" disabled={enviando || aVoltar} className={botaoSec} onClick={() => setAEditar(false)}>
              Cancelar
            </button>
            <button type="button" disabled={enviando || aVoltar} className={botaoSec} onClick={() => void voltar()}>
              {aVoltar ? "A guardar..." : "Voltar ao horário da empresa"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

/** `versao` sobe sempre que o horário da empresa é guardado: a lista e os valores efectivos recarregam. */
function HorariosPessoas({ versao }: { versao: number }) {
  const [dados, setDados] = useState<{ lista: HorarioPessoa[]; empresa: Horario } | null>(null);
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.horarios(), api.getHorario()])
      .then(([lista, h]) => {
        if (!ativo) return;
        setErroCarga(null);
        setDados({ lista, empresa: h.empresa });
      })
      .catch((err) => ativo && setErroCarga(mensagemDeErro(err)));
    return () => {
      ativo = false;
    };
  }, [versao]);

  useEffect(() => {
    let ativo = true;
    api
      .funcionarios()
      .then((l) => ativo && setEmails(Object.fromEntries(l.map((u) => [u.id, u.email]))))
      .catch(() => {}); // sem a lista só falta o email que distingue homónimos
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <section aria-labelledby="def-horarios" className={cartao}>
      <div>
        <FormaCanto tom="pessego" />
        <h2 id="def-horarios" className="text-xl font-bold tracking-tight">
          Horário por pessoa
        </h2>
        <p className="text-sm text-texto-suave">Quem não tiver horário personalizado segue o da empresa.</p>
      </div>
      {erroCarga && (
        <p role="alert" className={erroCls}>
          {erroCarga}
        </p>
      )}
      {dados && dados.lista.length === 0 && <p className="text-sm text-texto-suave">Sem pessoas.</p>}
      {dados && dados.lista.length > 0 && (
        <ul className="flex flex-col gap-3">
          {dados.lista.map((p) => (
            <LinhaHorario
              key={`${p.user_id}-${versao}`}
              p={p}
              email={emails[p.user_id]}
              empresa={dados.empresa}
              onAtualizado={(n) => setDados((d) => d && { ...d, lista: d.lista.map((x) => (x.user_id === n.user_id ? n : x)) })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Conteudo() {
  const { user, atualizarUser } = useAuth();
  const [separador, setSeparador] = useState<"conta" | "geral" | "permissoes">("conta");
  const [versaoHorario, setVersaoHorario] = useState(0);
  if (!user) return null;
  const admin = user.papel === "admin";
  const aba = admin ? separador : "conta";

  const colunaConta = (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6">
        <FotoPerfil user={user} atualizarUser={atualizarUser} />
        <DadosConta user={user} atualizarUser={atualizarUser} />
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <AlterarPalavraPasse user={user} atualizarUser={atualizarUser} />
        <section aria-labelledby="def-aparencia" className={cartao}>
          <div>
            <FormaCanto tom="violeta" baixo />
            <h2 id="def-aparencia" className="text-xl font-bold tracking-tight">
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
            <FormaCanto tom="rosa" />
            <h2 id="def-localidade" className="text-xl font-bold tracking-tight">
              Localidade
            </h2>
            <p className="text-sm text-texto-suave">
              Escolhe o concelho para a Agenda mostrar o feriado municipal. Fica guardado neste navegador.
            </p>
          </div>
          <EscolhaLocalidade />
        </section>
        {user.papel === "estagiario" && <DatasEstagio user={user} atualizarUser={atualizarUser} />}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="titulo-bento">Definições</h1>
      {admin && (
        <div role="tablist" aria-label="Secções das definições" className="flex gap-2">
          {(
            [
              ["conta", "Configurações da conta"],
              ["geral", "Geral"],
              ["permissoes", "Permissões"],
            ] as const
          ).map(([id, nome]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`separador-${id}`}
              aria-selected={aba === id}
              aria-controls={`painel-${id}`}
              className={aba === id ? botao : botaoSec}
              onClick={() => setSeparador(id)}
            >
              {nome}
            </button>
          ))}
        </div>
      )}
      {aba === "conta" ? (
        <div role={admin ? "tabpanel" : undefined} id="painel-conta" aria-labelledby={admin ? "separador-conta" : undefined}>
          {colunaConta}
        </div>
      ) : aba === "permissoes" ? (
        <div role="tabpanel" id="painel-permissoes" aria-labelledby="separador-permissoes" className="max-w-3xl">
          <PermissoesAdmin />
        </div>
      ) : (
        <div role="tabpanel" id="painel-geral" aria-labelledby="separador-geral" className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="def-ferias" className={cartao}>
              <FormaCanto tom="violeta" />
              <h2 id="def-ferias" className="text-xl font-bold tracking-tight">
                Férias
              </h2>
              <p className="text-sm text-texto-suave">Férias: 22 dias úteis por ano, podendo pedir até 25.</p>
            </section>
            <TextoConvite />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <HorarioEmpresa onGuardado={() => setVersaoHorario((n) => n + 1)} />
            <HorariosPessoas versao={versaoHorario} />
          </div>
        </div>
      )}
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
