"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FichaRhCartao from "@/components/FichaRhCartao";
import FichaRhPainel from "@/components/FichaRhPainel";
import VistaFuncionario from "@/components/VistaFuncionario";
import { api, mensagemDeErro, type FichaRh } from "@/lib/api";
import { Badge, Heading } from "@/design-system/primitives";
import { Grid, PageHeader, Section, Stack } from "@/design-system/layout";
import { EmptyState, Skeleton } from "@/design-system/data";
import { Alert } from "@/design-system/overlays";

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
      <Stack gap="lg">
        <PageHeader title="RH" />
        <Section aria-labelledby="rh-fichas" className="py-0 lg:py-0">
          <Stack gap="sm">
            <Heading level={2} id="rh-fichas" className="flex items-center gap-2">
              Fichas
              {fichas && <Badge tone="neutral" size="sm">{fichas.length}</Badge>}
            </Heading>
            {erro && <Alert tone="critical" title={erro} />}
            {!fichas && !erro && (
              <div role="status" aria-busy="true">
                <span className="ds-sr-only">A carregar...</span>
                <Grid asChild cols={3} gap="md">
                  <ul aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <li key={i}>
                        <Skeleton shape="block" />
                      </li>
                    ))}
                  </ul>
                </Grid>
              </div>
            )}
            {fichas && fichas.length === 0 && <EmptyState title="Ainda não há pessoas no sistema." />}
            {fichas && fichas.length > 0 && (
              <Grid asChild cols={3} gap="md">
                <ul>
                  {fichas.map((f) => (
                    <FichaRhCartao key={f.id} ficha={f} onVista={() => setVista(f)} onAbrir={() => setAberta(f.id)} />
                  ))}
                </ul>
              </Grid>
            )}
          </Stack>
        </Section>
      </Stack>
      {vista && <VistaFuncionario user={vista} onFechar={fecharVista} />}
      {aberta !== null && <FichaRhPainel userId={aberta} onFechar={fecharFicha} onAlterada={carregar} />}
    </AppShell>
  );
}
