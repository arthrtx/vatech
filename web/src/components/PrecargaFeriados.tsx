"use client";

import { useEffect } from "react";
import { carregarFeriados } from "@/lib/feriados";

/** Pré-carrega os feriados nacionais do ano anterior, do corrente e do seguinte. */
export default function PrecargaFeriados() {
  // O ano lê-se só no efeito: `new Date()` no render quebra a prerenderização estática.
  useEffect(() => {
    const ano = new Date().getFullYear();
    [ano - 1, ano, ano + 1].forEach((a) => void carregarFeriados(a));
  }, []);
  return null;
}
