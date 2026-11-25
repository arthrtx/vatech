"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import CalendarioAnual from "@/components/CalendarioAnual";
import { api, mensagemDeErro, type Aniversario, type PedidoAgenda, type Ponte } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { erro as erroCls } from "@/components/ui";

interface Dados {
  ano: number;
  pedidos: PedidoAgenda[];
  aniversarios: Aniversario[];
  pontes: Ponte[];
  erro: string | null;
}

function Conteudo() {
  const [ano, setAno] = useState(() => Number(hojeIso().slice(0, 4)));
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    let vivo = true;
    const de = `${ano}-01-01`;
    const ate = `${ano}-12-31`;
    // Aniversários e pontes são acessórios: se falharem, o calendário mostra-se sem eles.
    Promise.all([api.agenda(de, ate), api.aniversarios(de, ate).catch(() => []), api.pontes(de, ate).catch(() => [])])
      .then(([pedidos, aniversarios, pontes]) => vivo && setDados({ ano, pedidos, aniversarios, pontes, erro: null }))
      .catch((e) => vivo && setDados({ ano, pedidos: [], aniversarios: [], pontes: [], erro: mensagemDeErro(e) }));
    return () => {
      vivo = false;
    };
  }, [ano]);

  const pronto = dados?.ano === ano ? dados : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Calendário</h1>
      {pronto?.erro && (
        <p role="alert" className={erroCls}>
          {pronto.erro}
        </p>
      )}
      <CalendarioAnual
        ano={ano}
        aoMudarAno={setAno}
        aCarregar={!pronto}
        pedidos={pronto?.pedidos ?? []}
        aniversarios={pronto?.aniversarios ?? []}
        pontes={pronto?.pontes ?? []}
      />
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <AppShell>
      <Conteudo />
    </AppShell>
  );
}
