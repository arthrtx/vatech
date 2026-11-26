"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useBloquearScroll } from "@/lib/bloquearScroll";

/** Janela por cima da página (fecha com Escape ou ao clicar fora). Usada para o formulário "Novo pedido". */
export default function JanelaFormulario({ children, aoFechar, titulo }: { children: ReactNode; aoFechar: () => void; titulo: string }) {
  const caixa = useRef<HTMLDivElement>(null);

  useBloquearScroll(true);

  useEffect(() => {
    caixa.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center overflow-y-auto bg-black/40 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div ref={caixa} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1} className="mx-auto mt-14 w-full max-w-xl sm:mt-20 focus:outline-none">
        {children}
      </div>
    </div>
  );
}
