"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, mensagemDeErro, type Anexo } from "@/lib/api";
import { tamanhoLegivel } from "@/lib/anexos";
import { IconeDescarregar, IconeFechar, IconeOlho } from "./Icones";

const focoCls = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
const chipCls = `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-controlo bg-campo text-texto hover:bg-primaria-suave ${focoCls}`;

type Previa = { anexo: Anexo; url: string };

const extensao = (nome: string) => nome.split(".").pop()?.toLowerCase() ?? "";
const ehImagem = (a: Anexo) => a.mime.startsWith("image/");
// O browser mostra PDF e texto sem programas extra; Word e Excel só se descarregam.
const ehPdfOuTexto = (a: Anexo) => a.mime === "application/pdf" || a.mime.startsWith("text/") || ["pdf", "txt"].includes(extensao(a.nome));

/** Anexos de um pedido: o olho mostra o ficheiro aqui mesmo, o ícone de descarga guarda-o para imprimir. */
export default function AnexosDoPedido({ pedidoId, anexos }: { pedidoId: number; anexos?: Anexo[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const origem = useRef<HTMLElement | null>(null);

  // Liberta o ficheiro temporário ao fechar a pré-visualização.
  useEffect(() => {
    if (!previa) return;
    const url = previa.url;
    fechar.current?.focus();
    return () => URL.revokeObjectURL(url);
  }, [previa]);

  if (!anexos || anexos.length === 0) return null;

  async function ver(a: Anexo) {
    setErro(null);
    origem.current = document.activeElement as HTMLElement | null;
    try {
      setPrevia({ anexo: a, url: await api.urlDoAnexo(pedidoId, a.id) });
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function descarregar(a: Anexo, urlJa?: string) {
    setErro(null);
    try {
      const url = urlJa ?? (await api.urlDoAnexo(pedidoId, a.id));
      const l = document.createElement("a");
      l.href = url;
      l.download = a.nome;
      l.click();
      if (!urlJa) setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  function fecharPrevia() {
    setPrevia(null);
    origem.current?.focus?.();
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      fecharPrevia();
      return;
    }
    if (e.key !== "Tab") return;
    const alvos = e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!alvos.length) return;
    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }

  return (
    <div className="mt-1.5">
      <ul aria-label="Anexos" className="flex flex-col gap-1.5">
        {anexos.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-0 max-w-56 flex-1 truncate text-xs font-medium text-texto" title={`${a.nome} (${tamanhoLegivel(a.tamanho)})`}>
              {a.nome}
            </span>
            <button type="button" onClick={() => ver(a)} className={chipCls} aria-label={`Ver ${a.nome}`}>
              <IconeOlho className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => descarregar(a)} className={chipCls} aria-label={`Descarregar ${a.nome}`}>
              <IconeDescarregar className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>
      {erro && (
        <p role="alert" className="mt-1 text-center text-xs text-texto">
          {erro}
        </p>
      )}
      {previa &&
        createPortal(
          // Em portal: dentro de um cartão com backdrop-blur o «fixed» ficava preso ao cartão.
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-barra/60 p-4" onMouseDown={fecharPrevia}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={previa.anexo.nome}
              onKeyDown={teclas}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-[90vh] w-full max-w-5xl flex-col gap-3 rounded-cartao bg-painel p-4 text-texto shadow-suave"
            >
              <div className="flex shrink-0 items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">{previa.anexo.nome}</p>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className={chipCls} aria-label="Descarregar" title="Descarregar" onClick={() => descarregar(previa.anexo, previa.url)}>
                    <IconeDescarregar className="h-5 w-5" />
                  </button>
                  <button ref={fechar} type="button" className={chipCls} aria-label="Fechar" title="Fechar" onClick={fecharPrevia}>
                    <IconeFechar className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-controlo bg-campo">
                {ehImagem(previa.anexo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previa.url} alt={previa.anexo.nome} className="max-h-full max-w-full object-contain" />
                ) : ehPdfOuTexto(previa.anexo) ? (
                  <iframe src={previa.url} title={previa.anexo.nome} className="h-full w-full bg-white" />
                ) : (
                  <p className="p-6 text-center text-sm text-texto-suave">
                    Este tipo de ficheiro não tem pré-visualização. Use o botão de descarregar para o abrir.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
