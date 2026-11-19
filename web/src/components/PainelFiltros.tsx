"use client";

import { useId, useState, type ReactNode } from "react";
import { botaoSec } from "./ui";

interface Props {
  children: ReactNode;
  ativos: number;
  total: number;
  mostrados: number;
  rotuloItens: string;
  onLimpar: () => void;
}

/** Mobile (<md): botao Filtros + painel recolhivel. Desktop: painel sempre aberto. */
export default function PainelFiltros({ children, ativos, total, mostrados, rotuloItens, onLimpar }: Props) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const resumo = ativos === 0 ? "nenhum ativo" : `${ativos} ${ativos === 1 ? "ativo" : "ativos"}`;
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
        className={`${botaoSec} min-h-11 self-start md:hidden`}
      >
        Filtros <b className="font-semibold">({resumo})</b>: {aberto ? "esconder" : "mostrar"}
      </button>
      <div
        id={id}
        className={`${aberto ? "flex" : "hidden"} flex-col gap-3.5 rounded-controlo border border-linha bg-campo p-3 md:flex md:flex-row md:flex-wrap md:items-end md:gap-x-5 md:gap-y-3.5`}
      >
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p role="status" aria-live="polite" className="m-0 text-sm font-medium text-texto">
          {mostrados} de {total} {rotuloItens}
        </p>
        <button type="button" onClick={onLimpar} disabled={ativos === 0} className={`${botaoSec} min-h-11`}>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
