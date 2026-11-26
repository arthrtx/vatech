"use client";

import type { Pedido } from "@/lib/api";
import { proximasAusencias } from "@/lib/dashboard";
import { tipos } from "@/lib/rotulos";
import { Card, CardBody, CardHeader } from "@/design-system/layout";
import { ProgressBar } from "@/design-system/data";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

/** Contagem decrescente para a próxima ausência aprovada do próprio. */
export default function WidgetContagem({ pedidos, hoje, className }: { pedidos: Pedido[] | null; hoje: string; className?: string }) {
  const proxima = pedidos ? proximasAusencias(pedidos, hoje)[0] : undefined;
  if (!proxima) return null;
  const falta = dias(hoje, proxima.data_inicio);
  const aDecorrer = falta <= 0;
  // Barra: quanto falta numa janela de 60 dias (cheia quando chega o dia).
  const progresso = aDecorrer ? 100 : Math.max(4, Math.round(((60 - Math.min(falta, 60)) / 60) * 100));

  return (
    <Card asChild className={className}>
      <section aria-labelledby="w-contagem">
        <CardHeader padding="compact">
          <h2 id="w-contagem" className="text-md font-semibold text-text-1">
            {aDecorrer ? `${tipos[proxima.tipo]} a decorrer` : `Faltam para ${tipos[proxima.tipo].toLowerCase()}`}
          </h2>
        </CardHeader>
        <CardBody padding="compact" className="flex flex-col gap-4">
          <p className="flex items-baseline gap-3">
            <span className="ds-tabular text-h3 font-bold text-text-1">{aDecorrer ? dias(hoje, proxima.data_fim) + 1 : falta}</span>
            <span className="text-md text-text-2">{aDecorrer ? "dias até voltar" : falta === 1 ? "dia" : "dias"}</span>
          </p>
          <ProgressBar label="Tempo até à ausência" hideLabel value={progresso} />
        </CardBody>
      </section>
    </Card>
  );
}
