"use client";

import { useEffect, useState } from "react";
import { primeiroNome, saudacao } from "@/lib/saudacao";
import { vidro } from "../ui";

const formatoData = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Cartão de boas-vindas do dashboard, em cinza metal como no HUROH: data, saudação, resumo do dia e atalhos. */
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
    <section
      className={`${vidro} efeito-metal relative isolate flex flex-col gap-5 p-5 motion-safe:animate-subir md:flex-row md:items-center md:justify-between md:px-7 md:py-6 lg:gap-3 lg:py-4`}
    >
      <div aria-hidden="true" className="efeito-linha pointer-events-none absolute inset-x-8 bottom-0 h-0.5 rounded-full" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm font-semibold text-texto-suave">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {saudacao(agora)}, {primeiroNome(nome)}
        </h1>
        {resumo && <p className="max-w-prose">{resumo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-3 md:shrink-0">{acoes}</div>}
    </section>
  );
}
