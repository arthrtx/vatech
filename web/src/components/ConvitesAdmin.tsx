"use client";

import { useCallback, useEffect, useState } from "react";
import { api, mensagemDeErro, type Convite, type TipoPessoa, type User } from "@/lib/api";
import { formatarData, papeis, rotuloPapel } from "@/lib/rotulos";
import { botao, botaoPerigo, botaoSec, erro as erroCls, input, label } from "./ui";

/** Convites (criar, reenviar, revogar) e contas por autorizar. `onDecidida` recarrega a lista de pessoas. */
export default function ConvitesAdmin({ pendentes, onDecidida }: { pendentes: User[]; onDecidida: () => void }) {
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
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
      const c = await api.convites.criar(
        papel.startsWith("t") ? { nome, email, tipo_id: Number(papel.slice(1)) } : { nome, email, papel: papel as Convite["papel"] },
      );
      setNovo(c);
      setNome("");
      setEmail("");
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
    <section className="flex flex-col gap-4" aria-label="Convites e autorizações">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Convites</h2>
        <button type="button" className={botao} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          Convidar funcionário
        </button>
      </div>
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

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Convites pendentes</h3>
        {convites !== null && convites.length === 0 && <p className="text-sm text-texto-suave">Sem convites pendentes.</p>}
        <ul className="flex flex-col gap-2">
          {(convites ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-cartao border border-linha bg-painel p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-texto">{c.nome}</p>
                <p className="truncate text-sm text-texto-suave">
                  {c.email} · {c.tipo_nome ?? papeis[c.papel]} · expira a {formatarData(c.expira_em)}
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

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Contas por autorizar</h3>
        {pendentes.length === 0 && <p className="text-sm text-texto-suave">Nenhuma conta por autorizar.</p>}
        <ul className="flex flex-col gap-2">
          {pendentes.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-cartao border border-linha bg-painel p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-texto">{u.nome}</p>
                <p className="truncate text-sm text-texto-suave">
                  {u.email} · {rotuloPapel(u)}
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
    </section>
  );
}
