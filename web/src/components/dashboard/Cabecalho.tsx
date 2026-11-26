"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/design-system/layout";
import { primeiroNome, saudacao } from "@/lib/saudacao";

const formatoData = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Cabeçalho do dashboard: data, «Bom dia, Nome», frase-resumo e atalhos (o único h1 da página). */
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
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-3">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
      <PageHeader title={`${saudacao(agora)}, ${primeiroNome(nome)}`} description={resumo} actions={acoes} />
    </div>
  );
}
