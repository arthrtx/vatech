"use client";

import { useCallback, useEffect, useState } from "react";

export interface Fonte<T> {
  /** null enquanto carrega ou depois de um erro. */
  dados: T | null;
  erro: boolean;
  /** Repete o pedido a partir do skeleton (botao "Tentar de novo"). */
  tentar: () => void;
  /** Repete o pedido mantendo os dados visiveis (depois de aprovar/recusar). */
  atualizar: () => void;
}

/** Um pedido independente por bloco: cada fonte carrega e falha sozinha. */
export function useFonte<T>(carregar: () => Promise<T>): Fonte<T> {
  const [estado, setEstado] = useState<{ dados: T | null; erro: boolean }>({ dados: null, erro: false });
  const [volta, setVolta] = useState(0);

  useEffect(() => {
    let vivo = true;
    carregar().then(
      (dados) => vivo && setEstado({ dados, erro: false }),
      () => vivo && setEstado({ dados: null, erro: true }),
    );
    return () => {
      vivo = false;
    };
  }, [carregar, volta]);

  const atualizar = useCallback(() => setVolta((v) => v + 1), []);

  // Atualização silenciosa (mantém os dados visíveis): 15 s e ao voltar ao separador.
  useEffect(() => {
    const t = setInterval(atualizar, 15000);
    const aoVoltar = () => document.visibilityState === "visible" && atualizar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizar]);
  const tentar = useCallback(() => {
    setEstado({ dados: null, erro: false });
    setVolta((v) => v + 1);
  }, []);

  return { ...estado, tentar, atualizar };
}
