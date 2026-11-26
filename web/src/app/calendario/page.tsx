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
  // Só em memória: datas ajustadas (valem para esta simulação) e dia em destaque.
  const chave = simulacao ? `${simulacao.id}|${simulacao.de}|${simulacao.ate}` : "";
  const [ajuste, setAjuste] = useState<{ chave: string; de: string; ate: string } | null>(null);
  const [destaque, setDestaque] = useState<{ chave: string; iso: string | null; foco: number }>({ chave: "", iso: null, foco: 0 });
  const intervalo = simulacao && (ajuste?.chave === chave ? ajuste : simulacao);
  const dia = destaque.chave === chave ? destaque : { iso: null, foco: 0 };

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
  const painel = simulacao && intervalo && pronto && !pronto.erro;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Calendário</h1>
      {pronto?.erro && (
        <p role="alert" className={erroCls}>
          {pronto.erro}
        </p>
      )}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <CalendarioAnual
            simulacao={intervalo}
            diaDestaque={dia.iso}
            aoDestacarDia={(iso) => setDestaque((d) => ({ chave, iso: d.chave === chave && d.iso === iso ? null : iso, foco: d.foco + 1 }))}
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
        {painel && (
          <aside aria-label="Simulação do pedido" className="min-w-0 xl:sticky xl:top-4 xl:w-[26rem] xl:shrink-0 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto scroll-fino">
            <SimulacaoPainel
              simulacao={simulacao}
              intervalo={intervalo}
              aoMudarIntervalo={(i) => setAjuste({ chave, ...i })}
              destaque={dia.iso}
              foco={dia.foco}
              aoDestacar={(iso) => setDestaque((d) => ({ chave, iso, foco: d.chave === chave ? d.foco : 0 }))}
              ano={ano}
              pedidos={pronto.pedidos}
              aniversarios={pronto.aniversarios}
              pontes={pronto.pontes}
              nomeDe={pronto.pedidos.find((p) => quemE(p) === simulacao.user)?.user?.nome ?? (user?.id === simulacao.user ? user.nome : undefined)}
            />
          </aside>
        )}
      </div>
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
