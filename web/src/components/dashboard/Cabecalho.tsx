"use client";

import { useEffect, useState } from "react";
import { primeiroNome, saudacao } from "@/lib/saudacao";

const formatoData = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Saudação grande do dashboard (estilo bento): data em pílula, «Bom dia, Nome», frase-resumo e atalhos. */
export default function Cabecalho({
  nome,
  hoje,
  resumo,
  acoes,
}: {
  nome: string;
  hoje: string;
  resumo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const data = formatoData.format(new Date(`${hoje}T12:00:00`));

  return (
    <section className="flex flex-col gap-6 px-1 motion-safe:animate-subir md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="w-fit rounded-full border border-linha bg-painel px-4 py-1.5 text-sm font-semibold text-texto">
          {data.charAt(0).toUpperCase() + data.slice(1)}
        </p>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight [overflow-wrap:anywhere] md:text-6xl">
          {saudacao(agora)}, {primeiroNome(nome)}
        </h1>
        {resumo && <p className="max-w-prose text-lg">{resumo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-3 md:shrink-0">{acoes}</div>}
    </section>
  );
}
