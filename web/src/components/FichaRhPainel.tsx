"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, mensagemDeErro, type CategoriaFicheiroRh, type FichaRhDetalhe, type FicheiroRh, type InfoRh } from "@/lib/api";
import { tamanhoLegivel } from "@/lib/anexos";
import { formatarData } from "@/lib/rotulos";
import { Avatar, Badge, Button } from "@/design-system/primitives";
import { Field, Input, NativeSelect, Textarea } from "@/design-system/forms";
import { Alert, ConfirmDialog, Drawer } from "@/design-system/overlays";

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

  const infoPendente = aApagar?.startsWith("i") ? ficha?.infos.find((i) => `i${i.id}` === aApagar) : undefined;
  const ficheiroPendente = aApagar?.startsWith("f") ? ficha?.ficheiros.find((f) => `f${f.id}` === aApagar) : undefined;
  const opcoesTipo = CATEGORIAS_RH.map((c) => ({ value: c.valor, label: c.rotulo }));
  const opcoesFiltro = [{ value: "todos", label: "Todos" }, ...CATEGORIAS_RH.filter((c) => categoriasPresentes.has(c.valor)).map((c) => ({ value: c.valor, label: c.rotulo }))];
  const linha = "flex flex-wrap gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm";

  return (
    <Drawer open onOpenChange={(aberto) => !aberto && onFechar()} title={tituloJanela}>
      <div className="flex flex-col gap-5 text-text-1">
        <div className="flex flex-wrap items-start gap-4">
          {user && <Avatar name={user.nome} src={user.avatar_url ?? undefined} size="lg" />}
          <div className="min-w-0 flex-1">
            {user && <p className="break-all text-sm text-text-2">{user.email}</p>}
            {user?.cargo && <p className="text-sm text-text-2">{user.cargo}</p>}
            {user && (
              <p className="mt-1 text-xs font-semibold text-text-2" data-testid="conta-id">
                ID {user.id}
              </p>
            )}
          </div>
          <Button variant="outline" tone="neutral" onClick={exportarResumo} disabled={aExportar || !ficha} isLoading={aExportar}>
            {aExportar ? "A gerar..." : "Exportar resumo (PDF)"}
          </Button>
        </div>

        {erroCarga && <Alert tone="critical" title={erroCarga} />}
        {erro && <Alert tone="critical" title={erro} />}
        {!ficha && !erroCarga && <p className="text-sm text-text-2">A carregar...</p>}

        {ficha && (
          <>
            <section aria-labelledby="rh-infos" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 id="rh-infos" className="font-semibold">
                  Informações
                </h3>
                {editando === null && (
                  <Button variant="outline" tone="neutral" onClick={() => abrir(null)}>
                    Adicionar informação
                  </Button>
                )}
              </div>

              {editando !== null && (
                <form onSubmit={guardar} className="flex flex-col gap-3 rounded-md bg-surface-2 p-3">
                  <Field label="Título" controlId="rh-info-titulo">
                    <Input maxLength={80} value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
                  </Field>
                  <Field label="Valor" controlId="rh-info-valor">
                    <Textarea rows={3} maxLength={2000} value={valor} onChange={(e) => setValor(e.target.value)} />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={aGuardar}>
                      {aGuardar ? "A guardar..." : "Guardar"}
                    </Button>
                    <Button variant="outline" tone="neutral" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {ficha.infos.length === 0 && editando === null ? (
                <p className="text-sm text-text-2">Ainda não há informações nesta ficha.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {ficha.infos.map((i) => (
                    <li key={i.id} className={`${linha} items-start`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{i.titulo}</p>
                        <p className="whitespace-pre-wrap break-words text-text-2">{i.valor}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" tone="neutral" aria-label={`Editar ${i.titulo}`} onClick={() => abrir(i)}>
                          Editar
                        </Button>
                        <Button variant="outline" tone="critical" aria-label={`Apagar ${i.titulo}`} onClick={() => setAApagar(`i${i.id}`)}>
                          Apagar
                        </Button>
                      </div>
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
                <Button
                  variant="outline"
                  tone="neutral"
                  disabled={!categoria || (categoria === "personalizado" && !categoriaNome.trim())}
                  isLoading={aEnviar}
                  aria-describedby="rh-ficheiro-dica"
                  onClick={() => entrada.current?.click()}
                >
                  {aEnviar ? "A enviar..." : "Adicionar ficheiro"}
                </Button>
                <input ref={entrada} type="file" className="sr-only" aria-label="Escolher ficheiro" tabIndex={-1} onChange={enviar} />
              </div>
              <p id="rh-ficheiro-dica" className="text-sm text-text-2">
                Escolha o tipo de documento para poder anexar.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Tipo de documento" controlId="rh-ficheiro-tipo" required className="min-w-40 flex-1">
                  <NativeSelect options={opcoesTipo} placeholder="Escolha o tipo…" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaFicheiroRh | "")} />
                </Field>
                {categoria === "personalizado" && (
                  <Field label="Nome do tipo" controlId="rh-ficheiro-tipo-nome" required className="min-w-40 flex-1">
                    <Input maxLength={60} value={categoriaNome} onChange={(e) => setCategoriaNome(e.target.value)} />
                  </Field>
                )}
              </div>
              <p className="text-xs text-text-2">Escolha o tipo antes de adicionar. Máximo de 10 MB por ficheiro.</p>
              {categoriasPresentes.size > 1 && (
                <Field label="Ver por tipo" controlId="rh-ficheiro-filtro" className="max-w-xs">
                  <NativeSelect options={opcoesFiltro} value={filtroAtivo} onChange={(e) => setFiltro(e.target.value as CategoriaFicheiroRh | "todos")} />
                </Field>
              )}
              {ficha.ficheiros.length === 0 ? (
                <p className="text-sm text-text-2">Ainda não há ficheiros nesta ficha.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {ficheirosVisiveis.map((f) => (
                    <li key={f.id} className={`${linha} items-center gap-x-3`}>
                      <div className="min-w-48 flex-1">
                        <p className="break-words font-medium [overflow-wrap:anywhere]" title={f.nome}>
                          {f.nome}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-2">
                          <Badge tone="accent" size="sm" data-testid="tipo-ficheiro">
                            {etiquetaCategoria(f)}
                          </Badge>
                          <span>
                            {tamanhoLegivel(f.tamanho)} · {formatarData(f.criado_em.slice(0, 10))}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" tone="neutral" aria-label={`Descarregar ${f.nome}`} onClick={() => descarregar(f)}>
                          Descarregar
                        </Button>
                        <Button variant="outline" tone="critical" aria-label={`Apagar ${f.nome}`} onClick={() => setAApagar(`f${f.id}`)}>
                          Apagar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={aApagar !== null}
        onOpenChange={(aberto) => !aberto && setAApagar(null)}
        title={infoPendente ? `Apagar a informação "${infoPendente.titulo}"?` : ficheiroPendente ? `Apagar o ficheiro "${ficheiroPendente.nome}"?` : "Apagar?"}
        description="Esta acção não pode ser desfeita."
        confirmLabel="Confirmar apagar"
        onConfirm={() => {
          if (infoPendente) void apagarInfo(infoPendente);
          else if (ficheiroPendente) void apagarFicheiro(ficheiroPendente);
        }}
      />
    </Drawer>
  );
}
