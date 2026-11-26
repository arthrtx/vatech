"use client";

import type { Pedido } from "@/lib/api";
import { proximasAusencias } from "@/lib/dashboard";
import { tipos } from "@/lib/rotulos";
import Forma from "./Forma";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

/** Contagem decrescente para a próxima ausência aprovada do próprio. Cartão escuro fixo (barra) com número em positivo. */
export default function WidgetContagem({ pedidos, hoje, className = "" }: { pedidos: Pedido[] | null; hoje: string; className?: string }) {
  const proxima = pedidos ? proximasAusencias(pedidos, hoje)[0] : undefined;
  if (!proxima) return null;
  const falta = dias(hoje, proxima.data_inicio);
  const aDecorrer = falta <= 0;
  // Barra: quanto falta numa janela de 60 dias (cheia quando chega o dia).
  const progresso = aDecorrer ? 100 : Math.max(4, Math.round(((60 - Math.min(falta, 60)) / 60) * 100));

  return (
    <section
      aria-labelledby="w-contagem"
      className={`relative isolate flex flex-col justify-between gap-5 overflow-hidden rounded-barra bg-barra p-6 text-white motion-safe:animate-subir [animation-delay:80ms] ${className}`}
    >
      <Forma tipo="triangulo" className="-bottom-8 -right-8 -z-10 h-36 w-36 text-rosa/60" />
      <h2 id="w-contagem" className="w-fit rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
        {aDecorrer ? `${tipos[proxima.tipo]} a decorrer` : `Faltam para ${tipos[proxima.tipo].toLowerCase()}`}
      </h2>
      <p className="flex items-baseline gap-3">
        <span className="text-7xl font-bold leading-none tracking-tighter tabular-nums text-positivo md:text-8xl">
          {aDecorrer ? dias(hoje, proxima.data_fim) + 1 : falta}
        </span>
        <span className="text-lg font-medium text-white">{aDecorrer ? "dias até voltar" : falta === 1 ? "dia" : "dias"}</span>
      </p>
      <div className="h-3 rounded-full bg-white/15">
        <div className="h-3 rounded-full bg-positivo transition-[width] duration-700" style={{ width: `${progresso}%` }} />
      </div>
    </section>
  );
}
