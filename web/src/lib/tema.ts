"use client";

import { useCallback, useSyncExternalStore } from "react";

// Tema escolhido pela pessoa. "sistema" segue o modo claro/escuro do sistema operativo.
// Fica neste navegador (preferência pessoal), como a localidade.
export type Tema = "sistema" | "claro" | "escuro";

export const CHAVE_TEMA = "vatech_tema";
const EVENTO = "vatech-tema";
const CONSULTA = "(prefers-color-scheme: dark)";

/**
 * Corre no <head> antes de pintar, para não haver clarão do tema errado ao abrir a página.
 * Tem de ficar em sincronia com aplicarTema().
 */
export const scriptTema = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");var e=t==="escuro"||(t!=="claro"&&matchMedia("${CONSULTA}").matches);var d=document.documentElement;d.dataset.tema=e?"escuro":"claro";d.style.colorScheme=e?"dark":"light";}catch(_){}})();`;

export function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE_TEMA);
    return t === "claro" || t === "escuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

function sistemaEscuro(): boolean {
  return typeof matchMedia === "function" && matchMedia(CONSULTA).matches;
}

export function temaResolvido(t: Tema = lerTema()): "claro" | "escuro" {
  return t === "escuro" || (t === "sistema" && sistemaEscuro()) ? "escuro" : "claro";
}

export function aplicarTema() {
  const r = temaResolvido();
  const d = document.documentElement;
  d.dataset.tema = r;
  d.style.colorScheme = r === "escuro" ? "dark" : "light";
}

export function definirTema(t: Tema) {
  try {
    if (t === "sistema") localStorage.removeItem(CHAVE_TEMA);
    else localStorage.setItem(CHAVE_TEMA, t);
  } catch {
    // sem armazenamento: a escolha dura só até recarregar
  }
  aplicarTema();
  window.dispatchEvent(new Event(EVENTO));
}

function subscrever(cb: () => void) {
  const mq = typeof matchMedia === "function" ? matchMedia(CONSULTA) : null;
  const mudou = () => {
    aplicarTema();
    cb();
  };
  window.addEventListener("storage", mudou);
  window.addEventListener(EVENTO, cb);
  mq?.addEventListener?.("change", mudou);
  return () => {
    window.removeEventListener("storage", mudou);
    window.removeEventListener(EVENTO, cb);
    mq?.removeEventListener?.("change", mudou);
  };
}

// Snapshot como texto "escolha|resolvido" para o useSyncExternalStore comparar por valor.
const ler = () => `${lerTema()}|${temaResolvido()}`;

export function useTema(): { tema: Tema; escuro: boolean; definir: (t: Tema) => void } {
  const [tema, resolvido] = useSyncExternalStore(subscrever, ler, () => "sistema|claro").split("|") as [Tema, string];
  const definir = useCallback((t: Tema) => definirTema(t), []);
  return { tema, escuro: resolvido === "escuro", definir };
}
