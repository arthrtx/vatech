"use client";

import { useEffect, useState } from "react";

const formatoData = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const formatoHora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });

/** Cartão de destaque: título da página, data e relógio a actualizar sozinho. */
export default function Cabecalho({ titulo, hoje, resumo }: { titulo: string; hoje: string; resumo?: string }) {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    atualizar();
    const t = setInterval(atualizar, 15000);
    return () => clearInterval(t);
  }, []);
  const data = formatoData.format(new Date(`${hoje}T12:00:00`));

  return (
    <section className="relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-cartao bg-primaria p-6 text-white shadow-suave motion-safe:animate-subir md:flex-row md:items-end md:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 -z-10 h-64 w-64 rounded-full bg-rosa/50 blur-3xl motion-safe:animate-flutuar" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/4 -z-10 h-56 w-72 rounded-full bg-positivo/30 blur-3xl motion-safe:animate-flutuar [animation-delay:-9s]" />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/75">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
        <h1 className="text-3xl font-semibold md:text-4xl">{titulo}</h1>
        {resumo && <p className="max-w-prose text-white/85">{resumo}</p>}
      </div>
      {agora && (
        <p className="rounded-cartao bg-white/10 px-5 py-3 ring-1 ring-white/20 backdrop-blur-md">
          <time dateTime={agora.toISOString()} className="block text-5xl font-semibold tabular-nums md:text-6xl">
            {formatoHora.format(agora)}
          </time>
          <span className="text-sm text-white/75">Hora atual</span>
        </p>
      )}
    </section>
  );
}
