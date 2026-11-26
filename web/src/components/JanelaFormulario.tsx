"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Janela por cima da página (fecha com Escape ou ao clicar fora). Usada para o formulário "Novo pedido".
 * Vai para o <body> por portal: dentro do painel da página ficava por baixo da barra de topo (contexto de empilhamento).
 */
export default function JanelaFormulario({ children, aoFechar, titulo }: { children: ReactNode; aoFechar: () => void; titulo: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  // false no servidor e na hidratação, true no browser: o portal só existe depois de montar.
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!montado) return;
    caixa.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aoFechar, montado]);

  if (!montado) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex overflow-y-auto bg-black/40 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div ref={caixa} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1} className="m-auto w-full max-w-xl focus:outline-none">
        {children}
      </div>
    </div>,
    document.body,
  );
}
