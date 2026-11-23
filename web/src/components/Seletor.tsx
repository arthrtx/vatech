"use client";

import { useEffect, useRef, useState } from "react";
import { input } from "./ui";

const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

export interface OpcaoSeletor {
  valor: string;
  rotulo: string;
}

interface Props {
  id: string;
  valor: string;
  opcoes: OpcaoSeletor[];
  onChange: (valor: string) => void;
  className?: string;
}

/** Lista de escolha no estilo da plataforma (substitui o `<select>` nativo, cuja lista o CSS não alcança). */
export default function Seletor({ id, valor, opcoes, onChange, className = "" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [acima, setAcima] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const atual = opcoes.find((o) => o.valor === valor) ?? opcoes[0];

  /**
   * Abre a lista; se não couber por baixo, abre para cima. O limite é o fim do ecrã ou, se o seletor
   * estiver dentro de uma lista com scroll, o fim dessa lista (senão a lista abria cortada).
   */
  function abrir() {
    const r = botao.current?.getBoundingClientRect();
    if (r) {
      const altura = Math.min(opcoes.length * 36 + 12, 256) + 8; // linhas + padding, limitado por max-h-64, + margem
      let topo = 0;
      let fundo = window.innerHeight - 56; // padding do painel (md:p-6 + p-5) que corta o que sobra
      for (let el = raiz.current?.parentElement; el; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if (o === "auto" || o === "scroll" || o === "hidden") {
          const c = el.getBoundingClientRect();
          topo = Math.max(topo, c.top);
          fundo = Math.min(fundo, c.bottom);
          break;
        }
      }
      setAcima(fundo - r.bottom < altura && r.top - topo > altura);
    }
    setAberto(true);
  }

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    // Foco na opção escolhida, para o teclado continuar a partir dela.
    raiz.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  function escolher(v: string) {
    onChange(v);
    setAberto(false);
    botao.current?.focus();
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === "Escape" && aberto) {
      e.preventDefault();
      setAberto(false);
      botao.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!aberto) return abrir();
    const itens = Array.from(raiz.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const i = itens.indexOf(document.activeElement as HTMLElement);
    const proximo = e.key === "ArrowDown" ? Math.min(i + 1, itens.length - 1) : Math.max(i - 1, 0);
    itens[proximo]?.focus();
  }

  return (
    <div ref={raiz} className="relative" onKeyDown={teclado}>
      <button
        ref={botao}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className={`${input} flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="truncate">{atual?.rotulo}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0 text-texto-suave">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>
      {aberto && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-labelledby={id}
          className={`absolute left-0 right-0 z-30 ${acima ? "bottom-full mb-2" : "top-full mt-2"} flex max-h-64 flex-col gap-0.5 overflow-y-auto scroll-fino rounded-cartao bg-painel p-1.5 shadow-suave ring-1 ring-linha`}
        >
          {opcoes.map((o) => {
            const ativo = o.valor === valor;
            return (
              <li key={o.valor} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => escolher(o.valor)}
                  className={`w-full rounded-controlo px-3 py-2 text-left text-sm ${foco} ${
                    ativo ? "bg-primaria font-semibold text-white" : "text-texto hover:bg-primaria-suave"
                  }`}
                >
                  {o.rotulo}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
