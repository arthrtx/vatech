"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type FeriasResumo } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { diasTxt, passouPrazo, prazoTxt } from "@/lib/ferias";
import { Button } from "@/design-system/primitives";
import { Panel } from "@/design-system/layout";

const MAX = 3;

/** Admin: depois do prazo, quem ainda tem férias por marcar; antes, só o total de transitados da equipa. */
export default function FeriasPorMarcar() {
  const [hoje] = useState(() => hojeIso());
  const [dados, setDados] = useState<{ resumo: FeriasResumo[]; prazo: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    api.feriasResumo().then(
      (r) => ativo && setDados({ resumo: r.resumo, prazo: r.prazo_ferias }),
      () => {
        // Bloco opcional: sem dados, não aparece.
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  if (!dados) return null;
  const depois = passouPrazo(hoje, dados.prazo);
  const pessoas = dados.resumo.filter((r) => r.por_marcar > 0);
  const transitados = dados.resumo.reduce((t, r) => t + r.transitados, 0);

  if (depois ? pessoas.length === 0 : transitados === 0) return null;
  return (
    <section aria-label="Férias por marcar">
      <Panel variant="muted" padding="sm" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-2">
        {depois ? (
          <>
            <h3 className="font-semibold text-text-1">Férias por marcar (prazo: {prazoTxt(dados.prazo)})</h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {pessoas.slice(0, MAX).map((p) => (
                <li key={p.user_id} className="ds-tabular">
                  {p.nome}: {diasTxt(p.por_marcar)}
                </li>
              ))}
            </ul>
            {pessoas.length > MAX && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/funcionarios">Ver pessoas ({pessoas.length - MAX} mais)</Link>
              </Button>
            )}
          </>
        ) : (
          <p>Férias transitadas na equipa: {diasTxt(transitados)}.</p>
        )}
      </Panel>
    </section>
  );
}
