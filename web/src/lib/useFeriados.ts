"use client";

import { useEffect, useSyncExternalStore } from "react";
import { carregarFeriados, subscreverFeriados, versaoFeriados } from "./feriados";

/**
 * Pré-carrega os feriados nacionais dos anos pedidos e re-renderiza quando chegam.
 * Devolve a versão: usar nas dependências de useMemo que chamem datasDoAno/diasUteis.
 */
export function useFeriadosDoAno(...anos: number[]): number {
  const v = useSyncExternalStore(subscreverFeriados, versaoFeriados, () => 0);
  const chave = anos.join(",");
  useEffect(() => {
    if (!chave) return;
    chave.split(",").forEach((a) => void carregarFeriados(Number(a)));
  }, [chave]);
  return v;
}
