"use client";

import { mesesPt } from "@/lib/agenda";
import { datasDoAno } from "@/lib/feriados";
import { useFeriadosDoAno } from "@/lib/useFeriados";
import { maisDias } from "@/lib/dashboard";
import { useLocalidade } from "@/lib/localidade";
import { Badge } from "@/design-system/primitives";
import { Card, CardBody, CardHeader } from "@/design-system/layout";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
const mes = (iso: string) => mesesPt[Number(iso.slice(5, 7)) - 1].slice(0, 3);
const curta = (iso: string) => `${Number(iso.slice(8, 10))} ${mes(iso).toLowerCase()}`;
const formatoSemana = new Intl.DateTimeFormat("pt-PT", { weekday: "long", timeZone: "UTC" });
const diaDaSemana = (iso: string) => {
  const s = formatoSemana.format(new Date(`${iso}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const quandoFalta = (n: number) => (n === 0 ? "É hoje" : n === 1 ? "É amanhã" : `Faltam ${n} dias`);

/** Próximos feriados nacionais (da API de feriados; sem resposta, calculados localmente), no painel lateral. */
export default function WidgetFeriados({ hoje, quantos = 3, className }: { hoje: string; quantos?: number; className?: string }) {
  const [localidade] = useLocalidade();
  const ano = Number(hoje.slice(0, 4));
  useFeriadosDoAno(ano, ano + 1);
  const limite = maisDias(hoje, 366);
  const proximos = [...datasDoAno(ano, localidade), ...datasDoAno(ano + 1, localidade)]
    .filter((d) => d.tipo !== "comemorativa" && d.iso >= hoje && d.iso <= limite)
    .slice(0, quantos);
  const [primeiro, ...resto] = proximos;
  if (!primeiro) return null;

  return (
    <Card asChild className={className}>
      <section aria-labelledby="w-feriados">
        <CardHeader padding="compact">
          <h2 id="w-feriados" className="text-md font-semibold text-text-1">
            Próximo feriado
          </h2>
        </CardHeader>
        <CardBody padding="compact" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="ds-tabular text-h3 font-bold whitespace-nowrap text-text-1">
              {Number(primeiro.iso.slice(8, 10))} {mes(primeiro.iso)}
            </p>
            <p className="text-md font-semibold text-text-1">{primeiro.nome}</p>
            <p className="flex flex-wrap gap-2">
              <Badge>{diaDaSemana(primeiro.iso)}</Badge>
              <Badge tone="accent">{quandoFalta(dias(hoje, primeiro.iso))}</Badge>
            </p>
          </div>
          {resto.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-text-2">Depois</h3>
              <ul className="flex flex-col divide-y divide-line">
                {resto.map((d) => (
                  <li key={d.iso} className="py-3 first:pt-0 last:pb-0">
                    <span className="block text-sm font-semibold text-text-1">{d.nome}</span>
                    <span className="ds-tabular text-sm text-text-2">
                      {curta(d.iso)} · em {dias(hoje, d.iso)} dias
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </section>
    </Card>
  );
}
