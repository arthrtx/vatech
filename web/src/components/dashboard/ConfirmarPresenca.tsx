"use client";

import { useEffect, useRef, useState } from "react";
import { botao, botaoSec } from "../ui";

const formatoHora = new Intl.DateTimeFormat("pt", { hour: "2-digit", minute: "2-digit" });

// Pergunta antes de marcar. A hora mostrada é a de agora neste aparelho; a gravada é a do servidor.
export default function ConfirmarPresenca({
  saida,
  onConfirmar,
  onCancelar,
}: {
  saida: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const [agora] = useState(() => new Date());
  const caixa = useRef<HTMLDivElement>(null);
  const confirmar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // O foco volta ao botão de presença pelo cartão (o botão ainda está disabled quando isto desmonta).
    confirmar.current?.focus();
  }, []);

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancelar();
      return;
    }
    if (e.key !== "Tab") return;
    const alvos = caixa.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!alvos?.length) return;
    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }

  const hora = formatoHora.format(agora);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-barra/50 p-4" onMouseDown={onCancelar}>
      <div
        ref={caixa}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conf-presenca-t"
        aria-describedby="conf-presenca-d"
        onKeyDown={teclas}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-4 rounded-barra bg-painel p-6 text-texto shadow-suave"
      >
        <h2 id="conf-presenca-t" className="text-lg font-semibold">
          Deseja marcar {saida ? "saída" : "entrada"} às {hora}?
        </h2>
        <p id="conf-presenca-d" className="text-sm text-texto-suave">
          A hora registada é a de agora.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={`${botaoSec} min-h-10`} onClick={onCancelar}>
            Cancelar
          </button>
          <button ref={confirmar} type="button" className={`${botao} min-h-10`} onClick={onConfirmar}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
