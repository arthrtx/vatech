"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, mensagemDeErro, type CategoriaFicheiroRh, type FichaRhDetalhe, type FicheiroRh, type InfoRh } from "@/lib/api";
import { tamanhoLegivel } from "@/lib/anexos";
import { formatarData } from "@/lib/rotulos";
import Avatar from "./Avatar";
import JanelaFormulario from "./JanelaFormulario";
import { areaTexto, botao, botaoPerigo, botaoSec, erro as erroCls, input, label } from "./ui";

// Limite do contrato do backend: 10 MB por ficheiro.
export const MAX_BYTES_RH = 10 * 1024 * 1024;

export const CATEGORIAS_RH: { valor: CategoriaFicheiroRh; rotulo: string }[] = [
  { valor: "declaracao", rotulo: "Declaração" },
  { valor: "documentos_estagio", rotulo: "Documentos de estágio" },
  { valor: "contrato", rotulo: "Contrato" },
  { valor: "recibo", rotulo: "Recibo" },
  { valor: "outro", rotulo: "Outro" },
  { valor: "personalizado", rotulo: "Personalizado" },
];

/** Etiqueta do tipo de um ficheiro; os personalizados mostram o nome dado. */
function etiquetaCategoria(f: FicheiroRh): string {
  const cat = f.categoria ?? "outro";
  if (cat === "personalizado" && f.categoria_nome) return f.categoria_nome;
  return CATEGORIAS_RH.find((c) => c.valor === cat)?.rotulo ?? "Outro";
}

/** Janela da ficha de RH: informações livres (título + valor) e ficheiros de uma pessoa. */
export default function FichaRhPainel({ userId, onFechar, onAlterada }: { userId: number; onFechar: () => void; onAlterada?: () => void }) {
  const [ficha, setFicha] = useState<FichaRhDetalhe | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<number | "nova" | null>(null);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [aApagar, setAApagar] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaFicheiroRh | "">("");
  const [categoriaNome, setCategoriaNome] = useState("");
  const [filtro, setFiltro] = useState<CategoriaFicheiroRh | "todos">("todos");
  const [aExportar, setAExportar] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    api.fichaRh(userId).then(
      (f) => ativo && setFicha(f),
      (e) => ativo && setErroCarga(mensagemDeErro(e)),
    );
    return () => {
      ativo = false;
    };
  }, [userId]);

  const mudar = useCallback(
    (fn: (f: FichaRhDetalhe) => FichaRhDetalhe) => {
      setFicha((f) => (f ? fn(f) : f));
      onAlterada?.();
    },
    [onAlterada],
  );

  function abrir(info: InfoRh | null) {
    setErro(null);
    setEditando(info ? info.id : "nova");
    setTitulo(info?.titulo ?? "");
    setValor(info?.valor ?? "");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !valor.trim()) {
      setErro("Preencha o título e o valor.");
      return;
    }
    setAGuardar(true);
    setErro(null);
    try {
      const dados = { titulo: titulo.trim(), valor: valor.trim() };
      if (editando === "nova") {
        const nova = await api.criarInfoRh(userId, dados);
        mudar((f) => ({ ...f, infos: [...f.infos, nova] }));
      } else if (editando !== null) {
        const alvo = editando;
        const nova = await api.editarInfoRh(alvo, dados);
        mudar((f) => ({ ...f, infos: f.infos.map((i) => (i.id === alvo ? nova : i)) }));
      }
      setEditando(null);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setAGuardar(false);
    }
  }

  async function apagarInfo(i: InfoRh) {
    setErro(null);
    try {
      await api.apagarInfoRh(i.id);
      mudar((f) => ({ ...f, infos: f.infos.filter((x) => x.id !== i.id) }));
      setAApagar(null);
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0];
    e.target.value = "";
    if (!ficheiro) return;
    if (ficheiro.size > MAX_BYTES_RH) {
      setErro(`"${ficheiro.name}": passa os 10 MB.`);
      return;
    }
    if (!categoria) {
      setErro("Escolha o tipo de documento antes de anexar.");
      return;
    }
    const nomeTipo = categoriaNome.trim();
    if (categoria === "personalizado" && !nomeTipo) {
      setErro("Indique o nome do tipo de documento personalizado.");
      return;
    }
    setAEnviar(true);
    setErro(null);
    try {
      const novo = await api.enviarFicheiroRh(userId, ficheiro, categoria, categoria === "personalizado" ? nomeTipo : undefined);
      mudar((f) => ({ ...f, ficheiros: [...f.ficheiros, novo] }));
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setAEnviar(false);
    }
  }

  async function descarregar(f: FicheiroRh) {
    setErro(null);
    try {
      const url = await api.urlDoFicheiroRh(f.id);
      const l = document.createElement("a");
      l.href = url;
      l.download = f.nome;
      l.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  async function exportarResumo() {
    setErro(null);
    setAExportar(true);
    try {
      const resumo = await api.resumoRh(userId);
      const { gerarResumoPdf } = await import("@/lib/resumoPdf");
      const { nome, blob } = await gerarResumoPdf(resumo);
      const url = URL.createObjectURL(blob);
      const l = document.createElement("a");
      l.href = url;
      l.download = nome;
      l.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setErro(err instanceof ApiError ? mensagemDeErro(err) : "Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setAExportar(false);
    }
  }

  async function apagarFicheiro(f: FicheiroRh) {
    setErro(null);
    try {
      await api.apagarFicheiroRh(f.id);
      mudar((d) => ({ ...d, ficheiros: d.ficheiros.filter((x) => x.id !== f.id) }));
      setAApagar(null);
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  const categoriasPresentes = new Set((ficha?.ficheiros ?? []).map((f) => f.categoria ?? "outro"));
  const filtroAtivo = filtro !== "todos" && categoriasPresentes.has(filtro) ? filtro : "todos";
  const ficheirosVisiveis = (ficha?.ficheiros ?? []).filter((f) => filtroAtivo === "todos" || (f.categoria ?? "outro") === filtroAtivo);

  const user = ficha?.user;
  const tituloJanela = user ? `Ficha de ${user.nome}` : "Ficha de RH";

  return (
    <JanelaFormulario titulo={tituloJanela} aoFechar={onFechar}>
      <div className="flex flex-col gap-5 rounded-cartao bg-painel p-5 text-texto shadow-suave ring-1 ring-linha md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {user && <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-14 w-14 text-lg" />}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{tituloJanela}</h2>
            {user && <p className="break-all text-sm text-texto-suave">{user.email}</p>}
            {user?.cargo && <p className="text-sm text-texto-suave">{user.cargo}</p>}
            {user && (
              <p className="mt-1 text-xs font-semibold text-texto-suave" data-testid="conta-id">
                ID {user.id}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={botaoSec} onClick={exportarResumo} disabled={aExportar || !ficha} aria-busy={aExportar}>
              {aExportar ? "A gerar..." : "Exportar resumo (PDF)"}
            </button>
            <button type="button" className={botaoSec} onClick={onFechar}>
              Fechar
            </button>
          </div>
        </div>

        {erroCarga && (
          <p role="alert" className={erroCls}>
            {erroCarga}
          </p>
        )}
        {erro && (
          <p role="alert" className={erroCls}>
            {erro}
          </p>
        )}
        {!ficha && !erroCarga && <p className="text-sm text-texto-suave">A carregar...</p>}

        {ficha && (
          <>
            <section aria-labelledby="rh-infos" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 id="rh-infos" className="font-semibold">
                  Informações
                </h3>
                {editando === null && (
                  <button type="button" className={botaoSec} onClick={() => abrir(null)}>
                    Adicionar informação
                  </button>
                )}
              </div>

              {editando !== null && (
                <form onSubmit={guardar} className="flex flex-col gap-3 rounded-controlo bg-campo/70 p-3">
                  <div>
                    <label htmlFor="rh-info-titulo" className={label}>
                      Título
                    </label>
                    <input id="rh-info-titulo" className={input} maxLength={80} value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label htmlFor="rh-info-valor" className={label}>
                      Valor
                    </label>
                    <textarea id="rh-info-valor" className={areaTexto} rows={3} maxLength={2000} value={valor} onChange={(e) => setValor(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className={botao} disabled={aGuardar}>
                      {aGuardar ? "A guardar..." : "Guardar"}
                    </button>
                    <button type="button" className={botaoSec} onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {ficha.infos.length === 0 && editando === null ? (
                <p className="text-sm text-texto-suave">Ainda não há informações nesta ficha.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {ficha.infos.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-start gap-2 rounded-controlo bg-campo/70 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{i.titulo}</p>
                        <p className="whitespace-pre-wrap break-words text-texto-suave">{i.valor}</p>
                      </div>
                      {aApagar === `i${i.id}` ? (
                        <div className="flex gap-2">
                          <button type="button" className={botaoPerigo} onClick={() => apagarInfo(i)}>
                            Confirmar apagar
                          </button>
                          <button type="button" className={botaoSec} onClick={() => setAApagar(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" className={botaoSec} aria-label={`Editar ${i.titulo}`} onClick={() => abrir(i)}>
                            Editar
                          </button>
                          <button type="button" className={botaoPerigo} aria-label={`Apagar ${i.titulo}`} onClick={() => setAApagar(`i${i.id}`)}>
                            Apagar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="rh-ficheiros" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 id="rh-ficheiros" className="font-semibold">
                  Ficheiros
                </h3>
                <button
                  type="button"
                  className={botaoSec}
                  disabled={aEnviar || !categoria || (categoria === "personalizado" && !categoriaNome.trim())}
                  aria-describedby="rh-ficheiro-dica"
                  onClick={() => entrada.current?.click()}
                >
                  {aEnviar ? "A enviar..." : "Adicionar ficheiro"}
                </button>
                <input ref={entrada} type="file" className="sr-only" aria-label="Escolher ficheiro" tabIndex={-1} onChange={enviar} />
              </div>
              <p id="rh-ficheiro-dica" className="text-sm text-texto-suave">
                Escolha o tipo de documento para poder anexar.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <label htmlFor="rh-ficheiro-tipo" className={label}>
                    Tipo de documento
                  </label>
                  <select id="rh-ficheiro-tipo" className={input} value={categoria} required onChange={(e) => setCategoria(e.target.value as CategoriaFicheiroRh | "")}>
                    <option value="" disabled>
                      Escolha o tipo…
                    </option>
                    {CATEGORIAS_RH.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                {categoria === "personalizado" && (
                  <div className="min-w-[10rem] flex-1">
                    <label htmlFor="rh-ficheiro-tipo-nome" className={label}>
                      Nome do tipo
                    </label>
                    <input id="rh-ficheiro-tipo-nome" className={input} maxLength={60} required value={categoriaNome} onChange={(e) => setCategoriaNome(e.target.value)} />
                  </div>
                )}
              </div>
              <p className="text-xs text-texto-suave">Escolha o tipo antes de adicionar. Máximo de 10 MB por ficheiro.</p>
              {categoriasPresentes.size > 1 && (
                <div className="max-w-xs">
                  <label htmlFor="rh-ficheiro-filtro" className={label}>
                    Ver por tipo
                  </label>
                  <select id="rh-ficheiro-filtro" className={input} value={filtroAtivo} onChange={(e) => setFiltro(e.target.value as CategoriaFicheiroRh | "todos")}>
                    <option value="todos">Todos</option>
                    {CATEGORIAS_RH.filter((c) => categoriasPresentes.has(c.valor)).map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {ficha.ficheiros.length === 0 ? (
                <p className="text-sm text-texto-suave">Ainda não há ficheiros nesta ficha.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {ficheirosVisiveis.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-controlo bg-campo/70 px-3 py-2 text-sm">
                      <div className="min-w-[12rem] flex-1">
                        <p className="break-words font-medium [overflow-wrap:anywhere]" title={f.nome}>
                          {f.nome}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave">
                          <span className="rounded-full bg-primaria-suave px-2 py-0.5 font-semibold text-texto" data-testid="tipo-ficheiro">
                            {etiquetaCategoria(f)}
                          </span>
                          <span>
                            {tamanhoLegivel(f.tamanho)} · {formatarData(f.criado_em.slice(0, 10))}
                          </span>
                        </p>
                      </div>
                      {aApagar === `f${f.id}` ? (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={botaoPerigo} onClick={() => apagarFicheiro(f)}>
                            Confirmar apagar
                          </button>
                          <button type="button" className={botaoSec} onClick={() => setAApagar(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={botaoSec} aria-label={`Descarregar ${f.nome}`} onClick={() => descarregar(f)}>
                            Descarregar
                          </button>
                          <button type="button" className={botaoPerigo} aria-label={`Apagar ${f.nome}`} onClick={() => setAApagar(`f${f.id}`)}>
                            Apagar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </JanelaFormulario>
  );
}
