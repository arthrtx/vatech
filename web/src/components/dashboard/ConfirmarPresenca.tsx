"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/primitives";

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
    <div
      className="fixed inset-0 z-[var(--ds-z-modal)] flex items-end justify-center bg-overlay p-4 sm:items-center"
      onMouseDown={onCancelar}
    >
      <div
        ref={caixa}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conf-presenca-t"
        aria-describedby="conf-presenca-d"
        onKeyDown={teclas}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-full max-w-(--container-form) flex-col gap-6 rounded-xl border border-line bg-surface-1 p-6 shadow-float-lg"
      >
        <div className="flex flex-col gap-2">
          <h2 id="conf-presenca-t" className="text-md font-semibold text-text-1">
            Deseja marcar {saida ? "saída" : "entrada"} às {hora}?
          </h2>
          <p id="conf-presenca-d" className="text-sm text-text-2">
            A hora registada é a de agora.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" tone="neutral" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button ref={confirmar} onClick={onConfirmar}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
