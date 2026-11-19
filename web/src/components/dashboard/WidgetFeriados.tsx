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

  const cores = ["border-primaria", "border-violeta"];

  return (
    <section aria-labelledby="w-feriados" className={`${vidro} arco brilho-rosa flex gap-4 p-4 motion-safe:animate-subir [animation-delay:80ms]`}>
      <div className="efeito-data flex w-32 shrink-0 flex-col justify-between rounded-cartao p-4 shadow-suave ring-1 ring-white/60 dark:ring-white/10">
        <p className="text-3xl font-semibold leading-none">{curta(primeiro.iso)}</p>
        <p className="mt-6">
          <span className="block text-4xl font-semibold leading-none tabular-nums">{falta === 0 ? "Hoje" : falta}</span>
          {falta > 0 && <span className="text-sm font-semibold">{falta === 1 ? "dia" : "dias"}</span>}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
        <h2 id="w-feriados" className="font-mono text-sm font-semibold uppercase tracking-wide text-texto-suave">
          Próximo feriado
        </h2>
        <p className="text-lg font-semibold leading-snug">{primeiro.nome}</p>
        {resto.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {resto.map((d, i) => (
              <li key={d.iso} className={`border-l-[3px] pl-3 ${cores[i % cores.length]}`}>
                <span className="block truncate font-medium">{d.nome}</span>
                <span className="text-texto-suave">
                  {curta(d.iso)} · em {dias(hoje, d.iso)} dias
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
