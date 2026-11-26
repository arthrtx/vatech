"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { filtrar } from "@/lib/busca";
import { IconePesquisa } from "./Icones";
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
    <div className="fixed inset-0 z-[var(--ds-z-modal)] flex items-start justify-center bg-overlay p-4 pt-24" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pesquisar"
        className="w-full max-w-md rounded-xl bg-surface-1 p-3 shadow-float-lg"
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
          <div className="relative">
            <IconePesquisa className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-3" />
            <input
              id="pesquisa-global"
              ref={ref}
              type="search"
              autoComplete="off"
              placeholder="Pesquisar páginas"
              className={`${input} pl-10 [&::-webkit-search-cancel-button]:appearance-none`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </form>
        {resultados.length === 0 ? (
          <p className="mt-2 px-4 py-2 text-sm text-text-2">Nenhum resultado para &quot;{busca.trim()}&quot;</p>
        ) : (
          <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto scroll-fino">
            {resultados.map((d) => (
              <li key={d.href}>
                <button
                  type="button"
                  onClick={() => ir(d.href)}
                  className="min-h-touch w-full rounded-md px-4 text-left text-sm text-text-1 hover:bg-wash"
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
