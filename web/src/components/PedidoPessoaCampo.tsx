"use client";

import { useEffect, useRef, useState } from "react";
import { api, mensagemDeErro, type PessoaPedido } from "@/lib/api";
import Avatar from "./Avatar";
import { input, label } from "./ui";

const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

/** Campo «Pedido em nome de»: por omissão a própria pessoa; a lista vem de GET /pedidos/pessoas. */
export default function PedidoPessoaCampo({ valor, onChange }: { valor: PessoaPedido | null; onChange: (p: PessoaPedido | null) => void }) {
  const [pessoas, setPessoas] = useState<PessoaPedido[] | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [ativoIdx, setAtivoIdx] = useState(0);

  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    api
      .pessoasParaPedido()
      .then((r) => ativo && setPessoas(r))
      .catch((e) => ativo && setFalha(mensagemDeErro(e)));
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const termo = busca.trim().toLowerCase();
  const visiveis = (pessoas ?? []).filter((p) => !termo || p.nome.toLowerCase().includes(termo) || (p.tipo_nome ?? "").toLowerCase().includes(termo));
  const aCarregar = pessoas === null && !falha;

  // Índice 0 = «Eu próprio»; 1..n = pessoas visíveis.
  const total = visiveis.length + 1;
  const idxAtivo = Math.min(ativoIdx, total - 1);

  function fechar() {
    setAberto(false);
    setBusca("");
    botaoRef.current?.focus();
  }

  function escolher(p: PessoaPedido | null) {
    onChange(p);
    fechar();
  }

  function teclado(e: React.KeyboardEvent) {
    if (!aberto) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      fechar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivoIdx((idxAtivo + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivoIdx((idxAtivo - 1 + total) % total);
    } else if (e.key === "Home") {
      e.preventDefault();
      setAtivoIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAtivoIdx(total - 1);
    } else if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      escolher(idxAtivo === 0 ? null : visiveis[idxAtivo - 1]);
    }
  }

  return (
    <div
      ref={raiz}
      className="relative"
      onKeyDown={teclado}
    >
      <label id="pedido-em-nome-rotulo" htmlFor="pedido-em-nome" className={label}>
        Pedido em nome de
      </label>
      <button
        id="pedido-em-nome"
        ref={botaoRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? "pedido-em-nome-lista" : undefined}
        disabled={aCarregar}
        onClick={() => {
          setAtivoIdx(0);
          setAberto((a) => !a);
        }}
        className={`${input} flex items-center justify-between gap-2 text-left`}
      >
        <span className="min-w-0 flex-1 truncate">{valor ? valor.nome : aCarregar ? "A carregar pessoas..." : "Eu próprio"}</span>
        <span aria-hidden="true" className="shrink-0 text-xs text-texto-suave">
          {aberto ? "Fechar" : "Escolher"}
        </span>
      </button>
      {falha && (
        <p role="alert" className="mt-2 text-sm text-perigo">
          Não foi possível carregar as pessoas: {falha}{" "}
          <button type="button" onClick={() => {
              setFalha(null);
              setTentativa((t) => t + 1);
            }} className={`font-semibold underline ${foco}`}>
            Tentar de novo
          </button>
        </p>
      )}
      {aberto && pessoas && (
        <div className="absolute left-0 right-0 z-30 mt-2 flex flex-col gap-1.5 rounded-cartao bg-painel p-1.5 shadow-suave ring-1 ring-linha">
          <label htmlFor="pedido-em-nome-busca" className="sr-only">
            Pesquisar pessoas
          </label>
          <input
            id="pedido-em-nome-busca"
            type="search"
            autoFocus
            autoComplete="off"
            placeholder="Pesquisar pessoa"
            value={busca}
            aria-controls="pedido-em-nome-lista"
            aria-activedescendant={`pedido-em-nome-op-${idxAtivo}`}
            onChange={(e) => {
              setBusca(e.target.value);
              setAtivoIdx(0);
            }}
            className="h-10 w-full rounded-full border border-linha-forte bg-painel px-4 text-sm text-texto placeholder:text-texto-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
          />
          <ul id="pedido-em-nome-lista" role="listbox" aria-labelledby="pedido-em-nome-rotulo" className="flex max-h-56 flex-col gap-0.5 overflow-y-auto scroll-fino">
            <li role="presentation">
              <button
                type="button"
                id="pedido-em-nome-op-0"
                role="option"
                tabIndex={-1}
                aria-selected={!valor}
                onClick={() => escolher(null)}
                className={`w-full rounded-full px-4 py-2 text-left text-sm ${foco} ${!valor ? "bg-primaria font-semibold text-white" : idxAtivo === 0 ? "bg-primaria-suave text-texto" : "text-texto hover:bg-primaria-suave"}`}
              >
                Eu próprio
              </button>
            </li>
            {visiveis.map((p, i) => {
              const ativo = valor?.id === p.id;
              const naLista = idxAtivo === i + 1;
              return (
                <li key={p.id} role="presentation">
                  <button
                    type="button"
                    id={`pedido-em-nome-op-${i + 1}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={ativo}
                    onClick={() => escolher(p)}
                    className={`flex w-full items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm ${foco} ${ativo ? "bg-primaria font-semibold text-white" : naLista ? "bg-primaria-suave text-texto" : "text-texto hover:bg-primaria-suave"}`}
                  >
                    <Avatar nome={p.nome} id={p.id} foto={p.avatar_url} className="h-8 w-8 text-xs" />
                    <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                    {p.tipo_nome && <span className={`shrink-0 text-xs ${ativo ? "text-white" : "text-texto-suave"}`}>{p.tipo_nome}</span>}
                  </button>
                </li>
              );
            })}
            {visiveis.length === 0 && <li className="px-4 py-2 text-sm text-texto-suave">Nenhuma pessoa encontrada.</li>}
          </ul>
        </div>
      )}
      <p role="status" aria-live="polite" className={valor ? "mt-2 rounded-cartao border border-linha-forte bg-painel px-4 py-2 text-sm" : "sr-only"}>
        {valor ? `O pedido fica pendente em nome de ${valor.nome}.` : ""}
      </p>
    </div>
  );
}
