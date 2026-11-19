"use client";

import { useEffect, useState } from "react";
import { vidro } from "../ui";

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
    <section className={`${vidro} arco isolate flex flex-col justify-between gap-6 p-6 motion-safe:animate-subir md:flex-row md:items-end md:p-8`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-cartao">
        <div className="absolute -left-16 -top-20 h-64 w-80 rounded-full bg-rosa/25 blur-3xl motion-safe:animate-flutuar" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-72 rounded-full bg-laranja/40 blur-3xl motion-safe:animate-flutuar [animation-delay:-9s]" />
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-violeta/40 blur-3xl motion-safe:animate-flutuar [animation-delay:-4s]" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-texto-suave">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
        <h1 className="text-3xl font-semibold md:text-4xl">{titulo}</h1>
        {resumo && <p className="max-w-prose text-texto-suave">{resumo}</p>}
      </div>
      {agora && (
        <p className="rounded-cartao bg-painel/50 px-5 py-3 ring-1 ring-white/70 backdrop-blur-md dark:ring-white/10">
          <time dateTime={agora.toISOString()} className="block text-5xl font-semibold tabular-nums md:text-6xl">
            {formatoHora.format(agora)}
          </time>
          <span className="text-sm text-texto-suave">Hora atual</span>
        </p>
      )}
    </section>
  );
}
