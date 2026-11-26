"use client";

import { useEffect, useState } from "react";
import FormaCanto from "../app/definicoes/FormaCanto";
import { api, mensagemDeErro, type GrupoPermissao, type MatrizPermissoes, type PapelComPermissoes, type PermissaoCatalogo, type TipoPessoa } from "@/lib/api";
import { papeis } from "@/lib/rotulos";
import { botao, botaoPerigo, botaoSec, erro as erroCls, input, label } from "./ui";

const cartao = "relative isolate flex flex-col gap-4 rounded-barra border border-linha bg-painel p-5 md:p-7";

/** Coluna da matriz: um papel base («funcionario»/«estagiario») ou um tipo personalizado («t<id>»). */
interface Coluna {
  id: string;
  rotulo: string;
  base?: PapelComPermissoes;
}
const COLUNAS_BASE: Coluna[] = [
  { id: "funcionario", rotulo: papeis.funcionario },
  { id: "estagiario", rotulo: papeis.estagiario },
];
const GRUPOS: { grupo: GrupoPermissao; titulo: string }[] = [
  { grupo: "dia_a_dia", titulo: "Dia a dia" },
  { grupo: "gestao", titulo: "Gestão" },
];

const copiar = (m: MatrizPermissoes): MatrizPermissoes => ({ funcionario: { ...m.funcionario }, estagiario: { ...m.estagiario } });
const mapaTipos = (ts: TipoPessoa[]): Record<number, Record<string, boolean>> => Object.fromEntries(ts.map((t) => [t.id, { ...t.permissoes }]));

/** Admin: define o que Funcionário, Estagiário e os tipos personalizados podem fazer. O admin tem sempre tudo. */
export default function PermissoesAdmin() {
  const [catalogo, setCatalogo] = useState<PermissaoCatalogo[]>([]);
  const [valores, setValores] = useState<MatrizPermissoes | null>(null);
  const [inicial, setInicial] = useState<MatrizPermissoes | null>(null);
  const [tipos, setTipos] = useState<TipoPessoa[]>([]);
  const [valoresTipos, setValoresTipos] = useState<Record<number, Record<string, boolean>>>({});
  const [inicialTipos, setInicialTipos] = useState<Record<number, Record<string, boolean>>>({});
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroTipos, setErroTipos] = useState<string | null>(null);
  const [okTipos, setOkTipos] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaBase, setNovaBase] = useState<PapelComPermissoes>("funcionario");
  const [aRenomear, setARenomear] = useState<{ id: number; nome: string } | null>(null);
  const [aApagar, setAApagar] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.getPermissoes(), api.getTipos()])
      .then(([r, ts]) => {
        if (!ativo) return;
        setCatalogo(r.catalogo);
        setValores(copiar(r.papeis));
        setInicial(copiar(r.papeis));
        setTipos(ts);
        setValoresTipos(mapaTipos(ts));
        setInicialTipos(mapaTipos(ts));
      })
      .catch((e) => ativo && setErroCarga(mensagemDeErro(e)));
    return () => {
      ativo = false;
    };
  }, []);

  const colunas: Coluna[] = [...COLUNAS_BASE, ...tipos.map((t) => ({ id: `t${t.id}`, rotulo: t.nome, base: t.base }))];
  const sujoPapeis = !!valores && !!inicial && JSON.stringify(valores) !== JSON.stringify(inicial);
  const tiposSujos = tipos.filter((t) => JSON.stringify(valoresTipos[t.id]) !== JSON.stringify(inicialTipos[t.id]));
  const sujo = sujoPapeis || tiposSujos.length > 0;

  function marcado(coluna: string, chave: string): boolean {
    if (!valores) return false;
    if (coluna.startsWith("t")) return !!valoresTipos[Number(coluna.slice(1))]?.[chave];
    return !!valores[coluna as PapelComPermissoes][chave];
  }

  function alternar(coluna: string, chave: string, valor: boolean) {
    if (coluna.startsWith("t")) {
      const id = Number(coluna.slice(1));
      setValoresTipos((v) => ({ ...v, [id]: { ...v[id], [chave]: valor } }));
    } else {
      setValores((v) => (v ? { ...v, [coluna]: { ...v[coluna as PapelComPermissoes], [chave]: valor } } : v));
    }
    setOk(false);
  }

  async function criarTipo() {
    setErroTipos(null);
    setOkTipos("");
    try {
      const t = await api.criarTipo({ nome: novoNome.trim(), base: novaBase });
      setTipos((l) => [...l, t]);
      setValoresTipos((v) => ({ ...v, [t.id]: { ...t.permissoes } }));
      setInicialTipos((v) => ({ ...v, [t.id]: { ...t.permissoes } }));
      setNovoNome("");
      setNovaBase("funcionario");
      setCriando(false);
      setOkTipos(`Tipo «${t.nome}» criado.`);
    } catch (err) {
      setErroTipos(mensagemDeErro(err));
    }
  }

  async function renomear() {
    if (!aRenomear) return;
    setErroTipos(null);
    setOkTipos("");
    try {
      const t = await api.editarTipo(aRenomear.id, { nome: aRenomear.nome.trim() });
      setTipos((l) => l.map((x) => (x.id === t.id ? { ...x, nome: t.nome } : x)));
      setARenomear(null);
      setOkTipos(`Tipo renomeado para «${t.nome}».`);
    } catch (err) {
      setErroTipos(mensagemDeErro(err));
    }
  }

  async function apagar(t: TipoPessoa) {
    setErroTipos(null);
    setOkTipos("");
    try {
      await api.apagarTipo(t.id);
      setTipos((l) => l.filter((x) => x.id !== t.id));
      setAApagar(null);
      setOkTipos(`Tipo «${t.nome}» apagado.`);
    } catch (err) {
      setAApagar(null);
      setErroTipos(mensagemDeErro(err));
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valores) return;
    setErro(null);
    setOk(false);
    setEnviando(true);
    try {
      if (sujoPapeis) {
        const r = await api.putPermissoes(valores);
        setCatalogo(r.catalogo);
        setValores(copiar(r.papeis));
        setInicial(copiar(r.papeis));
      }
      for (const t of tiposSujos) {
        const novo = await api.editarTipo(t.id, { permissoes: valoresTipos[t.id] });
        setInicialTipos((v) => ({ ...v, [t.id]: { ...novo.permissoes } }));
        setValoresTipos((v) => ({ ...v, [t.id]: { ...novo.permissoes } }));
      }
      setOk(true);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="def-permissoes" className={cartao}>
      <div>
        <FormaCanto tom="violeta" />
        <h2 id="def-permissoes" className="text-xl font-bold tracking-tight">
          Permissões por papel
        </h2>
        <p className="text-sm text-texto-suave">Escolha o que cada papel ou tipo pode fazer. O que ficar por marcar deixa de aparecer a essas pessoas. O administrador pode sempre tudo.</p>
      </div>
      {erroCarga && (
        <p role="alert" className={erroCls}>
          {erroCarga}
        </p>
      )}
      {valores && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Tipos personalizados</h3>
            <button type="button" className={botaoSec} aria-expanded={criando} onClick={() => setCriando((v) => !v)}>
              Novo tipo
            </button>
          </div>
          {criando && (
            <div className="grid gap-3 rounded-cartao border border-linha bg-painel p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label htmlFor="tipo-nome" className={label}>
                  Nome do tipo
                </label>
                <input id="tipo-nome" className={input} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              </div>
              <div>
                <label htmlFor="tipo-base" className={label}>
                  Base
                </label>
                <select id="tipo-base" className={input} value={novaBase} onChange={(e) => setNovaBase(e.target.value as PapelComPermissoes)}>
                  <option value="funcionario">{papeis.funcionario}</option>
                  <option value="estagiario">{papeis.estagiario}</option>
                </select>
              </div>
              <button type="button" className={botao} disabled={!novoNome.trim()} onClick={criarTipo}>
                Criar tipo
              </button>
            </div>
          )}
          {tipos.length === 0 && <p className="text-sm text-texto-suave">Ainda não há tipos personalizados.</p>}
          <ul className="flex flex-col gap-2">
            {tipos.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-cartao border border-linha bg-painel p-3">
                {aRenomear?.id === t.id ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label htmlFor={`renomear-${t.id}`} className={label}>
                        Novo nome
                      </label>
                      <input id={`renomear-${t.id}`} className={input} value={aRenomear.nome} onChange={(e) => setARenomear({ id: t.id, nome: e.target.value })} />
                    </div>
                    <button type="button" className={botao} disabled={!aRenomear.nome.trim()} onClick={renomear}>
                      Guardar nome
                    </button>
                    <button type="button" className={botaoSec} onClick={() => setARenomear(null)}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-texto">{t.nome}</p>
                      <p className="text-sm text-texto-suave">
                        base: {papeis[t.base]} · {t.em_uso} {t.em_uso === 1 ? "pessoa" : "pessoas"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={botaoSec} aria-label={`Renomear ${t.nome}`} onClick={() => setARenomear({ id: t.id, nome: t.nome })}>
                        Renomear
                      </button>
                      {aApagar === t.id ? (
                        <>
                          <button type="button" className={botaoPerigo} aria-label={`Confirmar apagar ${t.nome}`} onClick={() => apagar(t)}>
                            Confirmar
                          </button>
                          <button type="button" className={botaoSec} onClick={() => setAApagar(null)}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button type="button" className={botaoPerigo} aria-label={`Apagar ${t.nome}`} onClick={() => setAApagar(t.id)}>
                          Apagar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {erroTipos && (
            <p role="alert" className={erroCls}>
              {erroTipos}
            </p>
          )}
          <p role="status">{okTipos}</p>
        </div>
      )}
      <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {valores &&
          GRUPOS.map(({ grupo, titulo }) => {
            const linhas = catalogo.filter((p) => p.grupo === grupo);
            if (linhas.length === 0) return null;
            return (
              <div key={grupo} className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="pb-2 text-left text-base font-semibold">{titulo}</caption>
                  <thead>
                    <tr className="border-b border-linha text-sm text-texto-suave">
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Permissão
                      </th>
                      {colunas.map((c) => (
                        <th key={c.id} scope="col" className="min-w-28 px-3 py-2 text-center font-medium">
                          {c.rotulo}
                          {c.base && <span className="block text-xs font-normal">base: {papeis[c.base]}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((p) => (
                      <tr key={p.chave} className="border-b border-linha last:border-b-0">
                        <th scope="row" className="py-3 pr-3 font-normal">
                          {p.rotulo}
                        </th>
                        {colunas.map((c) => (
                          <td key={c.id} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 cursor-pointer accent-primaria focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2"
                              aria-label={`${p.rotulo}: ${c.rotulo}`}
                              checked={marcado(c.id, p.chave)}
                              onChange={(e) => alternar(c.id, p.chave, e.target.checked)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        {erro && (
          <p role="alert" className={erroCls}>
            {erro}
          </p>
        )}
        <p role="status">{ok ? "Permissões guardadas." : ""}</p>
        <div>
          <button type="submit" disabled={!valores || enviando || !sujo} className={`${botao} min-h-10`}>
            {enviando ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </form>
    </section>
  );
}
