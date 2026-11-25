"use client";

import { useEffect, useRef, useState } from "react";
import { botaoSec } from "./ui";

export interface OpcaoMarcacao {
  rotulo: string;
  ajuda: string;
  aoEscolher: () => void;
}

/** Um só botão "Nova marcação": a pessoa escolhe se é um pedido (férias, ausência, licença) ou um compromisso da agenda. */
export default function NovaMarcacao({ opcoes }: { opcoes: OpcaoMarcacao[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  if (opcoes.length === 0) return null;
  // Com uma só escolha possível não há nada a perguntar.
  if (opcoes.length === 1) {
    return (
      <button type="button" className={botaoSec} onClick={opcoes[0].aoEscolher}>
        Nova marcação
      </button>
    );
  }

  return (
    <div ref={raiz} className="relative">
      <button type="button" className={botaoSec} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        Nova marcação
      </button>
      {aberto && (
        <div
          role="menu"
          aria-label="Nova marcação"
          className="absolute right-0 top-full z-30 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-0.5 rounded-cartao bg-painel p-1.5 shadow-suave ring-1 ring-linha"
        >
          {opcoes.map((o) => (
            <button
              key={o.rotulo}
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false);
                o.aoEscolher();
              }}
              className="flex flex-col rounded-controlo px-3 py-2 text-left hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
            >
              <span className="text-sm font-medium text-texto">{o.rotulo}</span>
              <span className="text-xs text-texto-suave">{o.ajuda}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
