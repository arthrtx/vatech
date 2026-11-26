"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Limite } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { diasTxt, feriasPorMarcar, passouPrazo, prazoTxt } from "@/lib/ferias";
import { Button } from "@/design-system/primitives";
import { Alert } from "@/design-system/overlays";

const CHAVE_FECHADO = "vatech_aviso_ferias_fechado";

/** Funcionário: aviso de férias por marcar depois do prazo e, no dashboard, as férias transitadas. */
export default function AvisoFerias({ comTransitadas = false }: { comTransitadas?: boolean }) {
  const [hoje] = useState(() => hojeIso());
  const [dados, setDados] = useState<{ ferias: Limite | undefined; prazo: string } | null>(null);
  // Aviso fechado com o X: volta a aparecer se os dias por marcar ou o prazo mudarem.
  const [fechadoPara, setFechadoPara] = useState<string | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a escolha guardada neste navegador
      setFechadoPara(localStorage.getItem(CHAVE_FECHADO));
    } catch {
      // sem armazenamento: o aviso mostra-se sempre
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    api.limites().then(
      (r) => ativo && setDados({ ferias: r.limites.find((l) => l.tipo === "ferias"), prazo: r.prazo_ferias }),
      () => {
        // Sem aviso; a validação final é do servidor.
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  if (!dados) return null;
  const porMarcar = feriasPorMarcar(dados.ferias);
  const transitados = dados.ferias?.transitados ?? 0;
  const assinatura = `${porMarcar}|${dados.prazo}`;
  const avisar = porMarcar !== null && porMarcar > 0 && passouPrazo(hoje, dados.prazo) && fechadoPara !== assinatura;
  const fechar = () => {
    setFechadoPara(assinatura);
    try {
      localStorage.setItem(CHAVE_FECHADO, assinatura);
    } catch {
      // sem armazenamento: fecha só nesta visita
    }
  };

  if (!avisar && !(comTransitadas && transitados > 0)) return null;
  return (
    <div className="flex flex-col gap-3">
      {avisar && (
        <Alert
          tone="warning"
          title={`Tem ${diasTxt(porMarcar)} de férias por marcar. O prazo era ${prazoTxt(dados.prazo)}.`}
          action={
            <>
              <Button asChild size="sm">
                <Link href="/calendario">Fazer pedido de férias</Link>
              </Button>
              <Button variant="ghost" tone="neutral" size="sm" onClick={fechar} aria-label="Fechar aviso">
                Fechar
              </Button>
            </>
          }
        />
      )}
      {comTransitadas && transitados > 0 && <p className="text-sm text-text-2">Férias transitadas: {diasTxt(transitados)}</p>}
    </div>
  );
}
