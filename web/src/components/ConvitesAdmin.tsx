"use client";

import { useCallback, useEffect, useState } from "react";
import { api, mensagemDeErro, type Convite, type TipoPessoa, type User } from "@/lib/api";
import { CARGOS_CONVITE } from "@/lib/cargos";
import { formatarData, papeis, rotuloPapel } from "@/lib/rotulos";
import { botao, botaoPerigo, botaoSec, erro as erroCls, input, label } from "./ui";

/** Convites (criar, reenviar, revogar) e contas por autorizar. `onDecidida` recarrega a lista de pessoas. */
export default function ConvitesAdmin({
  pendentes,
  onDecidida,
  aberto: abertoExt,
  onAberto,
  podeDefinirCargo = false,
}: {
  pendentes: User[];
  onDecidida: () => void;
  podeDefinirCargo?: boolean;
  /** Se vier, o formulário é controlado de fora e o botão «Convidar funcionário» vive no cabeçalho da página. */
  aberto?: boolean;
  onAberto?: (aberto: boolean) => void;
}) {
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abertoInt, setAbertoInt] = useState(false);
  const controlado = abertoExt !== undefined;
  const aberto = controlado ? abertoExt : abertoInt;
  const setAberto = (v: boolean | ((a: boolean) => boolean)) => {
    const novo = typeof v === "function" ? v(aberto) : v;
    if (controlado) onAberto?.(novo);
    else setAbertoInt(novo);
  };
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  // «funcionario» | «estagiario» | «t<id>» (tipo personalizado)
  const [papel, setPapel] = useState<string>("funcionario");
  const [tipos, setTipos] = useState<TipoPessoa[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [novo, setNovo] = useState<Convite | null>(null);

  const carregar = useCallback(async () => {
    try {
      setConvites(await api.convites.listar());
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial de dados remotos
    carregar();
  }, [carregar]);

  useEffect(() => {
    let ativo = true;
    api.getTipos().then(
      (t) => ativo && setTipos(t),
      () => {
        // Sem tipos (ou sem acesso: só o admin os lista), ficam os papéis base.
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  async function acao(fn: () => Promise<unknown>, depois?: () => void) {
    setErro(null);
    try {
      await fn();
      depois?.();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const base = papel.startsWith("t") ? { nome, email, tipo_id: Number(papel.slice(1)) } : { nome, email, papel: papel as Convite["papel"] };
      const c = await api.convites.criar(podeDefinirCargo && cargo ? { ...base, cargo } : base);
      setNovo(c);
      setNome("");
      setEmail("");
      setCargo("");
      setPapel("funcionario");
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  const reenviar = (c: Convite) =>
    acao(async () => {
      setNovo(await api.convites.reenviar(c.id));
    }, carregar);

  return (
    <section className="flex flex-col gap-6" aria-label="Convites e autorizações">
      {!controlado && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Convites</h2>
          <button type="button" className={botao} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
            Convidar funcionário
          </button>
        </div>
      )}
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {aberto && (
        <form onSubmit={criar} className="flex flex-col gap-3 rounded-cartao border border-linha bg-painel p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="convite-nome" className={label}>
                Nome
              </label>
              <input id="convite-nome" required className={input} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label htmlFor="convite-email" className={label}>
                Email
              </label>
              <input
                id="convite-email"
                type="email"
                required
                className={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="convite-papel" className={label}>
                Papel
              </label>
              <select
                id="convite-papel"
                className={input}
                value={papel}
                onChange={(e) => setPapel(e.target.value)}
              >
                <option value="funcionario">{papeis.funcionario}</option>
                <option value="estagiario">{papeis.estagiario}</option>
                {tipos.map((t) => (
                  <option key={t.id} value={`t${t.id}`}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            {podeDefinirCargo && (
              <div>
                <label htmlFor="convite-cargo" className={label}>
                  Cargo
                </label>
                <select id="convite-cargo" className={input} value={cargo} onChange={(e) => setCargo(e.target.value)}>
                  <option value="">Escolher cargo</option>
                  {CARGOS_CONVITE.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? "A criar..." : "Criar convite"}
            </button>
            <button type="button" className={botaoSec} onClick={() => setAberto(false)}>
              Fechar
            </button>
          </div>
        </form>
      )}
      {novo && (
        <p role="status" className="rounded-controlo border border-linha-forte bg-primaria-suave p-3 text-sm text-texto">
          Convite enviado por email para <strong>{novo.email}</strong>. Válido até {formatarData(novo.expira_em)}.
        </p>
      )}

      {pendentes.length > 0 && (
        <div className="flex flex-col gap-3" role="group" aria-labelledby="sec-por-autorizar">
          <h2 id="sec-por-autorizar" className="text-lg font-semibold">
            Por autorizar <span className="font-normal text-texto-suave">({pendentes.length})</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {pendentes.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-cartao border border-linha bg-painel p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-texto">{u.nome}</p>
                  <p className="truncate text-sm text-texto-suave">
                    ID {u.id} · {u.email} · {rotuloPapel(u)}{u.cargo ? ` · ${u.cargo}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={botao} onClick={() => acao(() => api.aprovarConta(u.id), onDecidida)}>
                    Autorizar
                  </button>
                  <button type="button" className={botaoPerigo} onClick={() => acao(() => api.recusarConta(u.id), onDecidida)}>
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-3" role="group" aria-labelledby="sec-convites-pendentes">
        <h2 id="sec-convites-pendentes" className="text-lg font-semibold">
          Convites pendentes
          {convites !== null && convites.length > 0 && <span className="font-normal text-texto-suave"> ({convites.length})</span>}
        </h2>
        {convites !== null && convites.length === 0 && <p className="text-sm text-texto-suave">Sem convites pendentes.</p>}
        <ul className="grid gap-3 md:grid-cols-2">
          {(convites ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-cartao border border-linha bg-painel p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-texto">{c.nome}</p>
                <p className="truncate text-sm text-texto-suave">
                  {c.email} · {c.tipo_nome ?? papeis[c.papel]}{c.cargo ? ` · ${c.cargo}` : ""} · expira a {formatarData(c.expira_em)}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={botaoSec} onClick={() => reenviar(c)}>
                  Reenviar
                </button>
                <button type="button" className={botaoPerigo} onClick={() => acao(() => api.convites.revogar(c.id), carregar)}>
                  Revogar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
