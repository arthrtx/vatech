"use client";

import { mesesPt } from "@/lib/agenda";
import { datasDoAno } from "@/lib/feriados";
import { maisDias } from "@/lib/dashboard";
import { useLocalidade } from "@/lib/localidade";
import { vidro } from "../ui";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
const curta = (iso: string) => `${Number(iso.slice(8, 10))} ${mesesPt[Number(iso.slice(5, 7)) - 1].slice(0, 3).toLowerCase()}`;

/** Próximos feriados nacionais (calculados localmente, não precisam da API). */
export default function WidgetFeriados({ hoje, quantos = 3 }: { hoje: string; quantos?: number }) {
  const [localidade] = useLocalidade();
  const ano = Number(hoje.slice(0, 4));
  const limite = maisDias(hoje, 366);
  const proximos = [...datasDoAno(ano, localidade), ...datasDoAno(ano + 1, localidade)]
    .filter((d) => d.tipo !== "comemorativa" && d.iso >= hoje && d.iso <= limite)
    .slice(0, quantos);
  const [primeiro, ...resto] = proximos;
  if (!primeiro) return null;
  const falta = dias(hoje, primeiro.iso);

  return (
    <section aria-labelledby="w-feriados" className={`${vidro} arco brilho-rosa flex flex-col gap-4 p-5 motion-safe:animate-subir [animation-delay:80ms]`}>
      <h2 id="w-feriados" className="font-mono text-sm font-semibold uppercase tracking-wide text-texto-suave">
        Próximo feriado
      </h2>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-semibold">{primeiro.nome}</p>
          <p className="text-sm text-texto-suave">{curta(primeiro.iso)}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-4xl font-semibold tabular-nums">{falta === 0 ? "Hoje" : falta}</span>
          {falta > 0 && <span className="text-sm text-texto-suave">{falta === 1 ? "dia" : "dias"}</span>}
        </p>
      </div>
      {resto.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-linha pt-3 text-sm">
          {resto.map((d) => (
            <li key={d.iso} className="flex justify-between gap-3">
              <span className="truncate">{d.nome}</span>
              <span className="shrink-0 text-texto-suave">
                {curta(d.iso)} · em {dias(hoje, d.iso)} dias
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
