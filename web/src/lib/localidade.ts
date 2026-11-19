"use client";

import { useCallback, useSyncExternalStore } from "react";

// Concelho escolhido para os feriados municipais. Fica neste navegador (preferência pessoal).
const CHAVE = "vatech_localidade";
const EVENTO = "vatech-localidade";

function ler(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function subscrever(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENTO, cb);
  };
}

export function useLocalidade(): [string | null, (id: string | null) => void] {
  const valor = useSyncExternalStore(subscrever, ler, () => null);
  const definir = useCallback((id: string | null) => {
    try {
      if (id) localStorage.setItem(CHAVE, id);
      else localStorage.removeItem(CHAVE);
    } catch {
      // sem armazenamento: a escolha dura só até recarregar
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [valor, definir];
}
