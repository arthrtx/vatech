"use client";

import { useState } from "react";
import { api, mensagemDeErro, type Anexo } from "@/lib/api";
import { tamanhoLegivel } from "@/lib/anexos";

/** Lista de anexos de um pedido; cada um abre num separador novo (descarga autenticada). */
export default function AnexosDoPedido({ pedidoId, anexos }: { pedidoId: number; anexos?: Anexo[] }) {
  const [erro, setErro] = useState<string | null>(null);
  if (!anexos || anexos.length === 0) return null;

  async function abrir(a: Anexo) {
    setErro(null);
    try {
      const url = await api.urlDoAnexo(pedidoId, a.id);
      const janela = window.open(url, "_blank", "noopener");
      if (!janela) {
        // Pop-up bloqueado: descarrega em vez de abrir.
        const l = document.createElement("a");
        l.href = url;
        l.download = a.nome;
        l.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <div className="mt-1.5">
      <ul aria-label="Anexos" className="flex flex-wrap gap-1.5">
        {anexos.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => abrir(a)}
              className="max-w-56 truncate rounded-controlo bg-campo px-2.5 py-1 text-xs font-medium text-texto hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
              title={`${a.nome} (${tamanhoLegivel(a.tamanho)})`}
            >
              {a.nome}
            </button>
          </li>
        ))}
      </ul>
      {erro && (
        <p role="alert" className="mt-1 text-xs text-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
