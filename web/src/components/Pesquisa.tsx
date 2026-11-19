"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { filtrar } from "@/lib/busca";
import { input } from "./ui";

export interface Destino {
  href: string;
  texto: string;
}

/** Janela de pesquisa aberta pela lupa do menu (ou Ctrl+K). Procura nas páginas do menu. */
export default function Pesquisa({ destinos, onFechar }: { destinos: Destino[]; onFechar: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const resultados = filtrar(destinos, busca, (d) => [d.texto]);

  useEffect(() => {
    ref.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  function ir(href: string) {
    onFechar();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center bg-barra/50 p-4 pt-24" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pesquisar"
        className="w-full max-w-md rounded-lg bg-painel p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (resultados[0]) ir(resultados[0].href);
          }}
        >
          <label htmlFor="pesquisa-global" className="sr-only">
            Pesquisar páginas
          </label>
          <input
            id="pesquisa-global"
            ref={ref}
            type="search"
            autoComplete="off"
            placeholder="Pesquisar páginas"
            className={input}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </form>
        {resultados.length === 0 ? (
          <p className="mt-3 px-3 py-2 text-sm text-texto-suave">Nenhum resultado para &quot;{busca.trim()}&quot;</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {resultados.map((d) => (
              <li key={d.href}>
                <button
                  type="button"
                  onClick={() => ir(d.href)}
                  className="w-full rounded-controlo px-3 py-2 text-left text-sm text-texto hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
                >
                  {d.texto}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
