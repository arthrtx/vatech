"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FichaRhCartao from "@/components/FichaRhCartao";
import FichaRhPainel from "@/components/FichaRhPainel";
import VistaFuncionario from "@/components/VistaFuncionario";
import { api, mensagemDeErro, type FichaRh } from "@/lib/api";
import { erro as erroCls } from "@/components/ui";

export default function RhPage() {
  const [fichas, setFichas] = useState<FichaRh[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [vista, setVista] = useState<FichaRh | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);

  const carregar = useCallback(() => {
    api.fichasRh().then(setFichas, (e) => setErro(mensagemDeErro(e)));
  }, []);

  useEffect(carregar, [carregar]);

  const fecharVista = useCallback(() => setVista(null), []);
  const fecharFicha = useCallback(() => setAberta(null), []);

  return (
    <AppShell soAdmin permissao="gerir_rh">
      <div className="flex flex-col gap-4">
        <h1 className="titulo-bento">RH</h1>
        <section aria-labelledby="rh-fichas" className="flex flex-col gap-2">
          <h2 id="rh-fichas" className="text-xl font-bold tracking-tight">
            Fichas
            {fichas && <span className="ml-2 rounded-full bg-campo px-3 py-0.5 text-sm text-texto-suave">{fichas.length}</span>}
          </h2>
          {erro && (
            <p role="alert" className={erroCls}>
              {erro}
            </p>
          )}
          {!fichas && !erro && <p className="text-sm text-texto-suave">A carregar...</p>}
          {fichas && fichas.length === 0 && <p className="text-sm text-texto-suave">Ainda não há pessoas no sistema.</p>}
          {fichas && fichas.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {fichas.map((f) => (
                <FichaRhCartao key={f.id} ficha={f} onVista={() => setVista(f)} onAbrir={() => setAberta(f.id)} />
              ))}
            </ul>
          )}
        </section>
      </div>
      {vista && <VistaFuncionario user={vista} onFechar={fecharVista} />}
      {aberta !== null && <FichaRhPainel userId={aberta} onFechar={fecharFicha} onAlterada={carregar} />}
    </AppShell>
  );
}
