"use client";

import type { Pedido } from "@/lib/api";
import { proximasAusencias } from "@/lib/dashboard";
import { tipos } from "@/lib/rotulos";
import { vidro } from "../ui";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

/** Contagem decrescente para a próxima ausência aprovada do próprio. */
export default function WidgetContagem({ pedidos, hoje }: { pedidos: Pedido[] | null; hoje: string }) {
  const proxima = pedidos ? proximasAusencias(pedidos, hoje)[0] : undefined;
  if (!proxima) return null;
  const falta = dias(hoje, proxima.data_inicio);
  const aDecorrer = falta <= 0;
  // Barra: quanto falta numa janela de 60 dias (cheia quando chega o dia).
  const progresso = aDecorrer ? 100 : Math.max(4, Math.round(((60 - Math.min(falta, 60)) / 60) * 100));

  return (
    <section aria-labelledby="w-contagem" className={`${vidro} arco efeito-saldo flex flex-col gap-3 p-5 motion-safe:animate-subir [animation-delay:80ms]`}>
      <h2 id="w-contagem" className="font-mono text-sm font-semibold uppercase tracking-wide text-texto-suave">
        {aDecorrer ? `${tipos[proxima.tipo]} a decorrer` : `Faltam para ${tipos[proxima.tipo].toLowerCase()}`}
      </h2>
      <p className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold tabular-nums">{aDecorrer ? dias(hoje, proxima.data_fim) + 1 : falta}</span>
        <span className="text-texto-suave">{aDecorrer ? "dias até voltar" : falta === 1 ? "dia" : "dias"}</span>
      </p>
      <div className="h-2 rounded-full bg-trilho">
        <div className="h-2 rounded-full bg-positivo transition-[width] duration-700" style={{ width: `${progresso}%` }} />
      </div>
    </section>
  );
}
