"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import CalendarioAnual from "@/components/CalendarioAnual";
import { api, mensagemDeErro, type Aniversario, type PedidoAgenda, type Ponte } from "@/lib/api";
import { hojeIso, quemE } from "@/lib/agenda";
import { useAuth } from "@/lib/auth";
import { podePedir } from "@/lib/permissoes";
import SimulacaoPainel, { lerSimulacao } from "@/components/SimulacaoPainel";
import { erro as erroCls } from "@/components/ui";

interface Dados {
  ano: number;
  pedidos: PedidoAgenda[];
  aniversarios: Aniversario[];
  pontes: Ponte[];
  erro: string | null;
}

function Conteudo() {
  const { user } = useAuth();
  const simulacao = lerSimulacao(useSearchParams());
  const [ano, setAno] = useState(() => Number((simulacao?.de ?? hojeIso()).slice(0, 4)));
  const [dados, setDados] = useState<Dados | null>(null);
  const [recarga, setRecarga] = useState(0);

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
  }, [ano, recarga]);

  const pronto = dados?.ano === ano ? dados : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Calendário</h1>
      {pronto?.erro && (
        <p role="alert" className={erroCls}>
          {pronto.erro}
        </p>
      )}
      {simulacao && pronto && !pronto.erro && (
        <SimulacaoPainel
          simulacao={simulacao}
          ano={ano}
          pedidos={pronto.pedidos}
          aniversarios={pronto.aniversarios}
          pontes={pronto.pontes}
          nomeDe={pronto.pedidos.find((p) => quemE(p) === simulacao.user)?.user?.nome ?? (user?.id === simulacao.user ? user.nome : undefined)}
        />
      )}
      <CalendarioAnual
        simulacao={simulacao}
        ano={ano}
        aoMudarAno={setAno}
        aCarregar={!pronto}
        pedidos={pronto?.pedidos ?? []}
        aniversarios={pronto?.aniversarios ?? []}
        pontes={pronto?.pontes ?? []}
        podeCriar={!!user && user.papel !== "admin" && podePedir(user)}
        aoCriar={() => setRecarga((r) => r + 1)}
      />
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <Conteudo />
      </Suspense>
    </AppShell>
  );
}
