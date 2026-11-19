"use client";

import { mesesPt } from "@/lib/agenda";
import { datasDoAno } from "@/lib/feriados";
import { maisDias } from "@/lib/dashboard";
import { useLocalidade } from "@/lib/localidade";
import { vidro } from "../ui";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
const mes = (iso: string) => mesesPt[Number(iso.slice(5, 7)) - 1].slice(0, 3);
const curta = (iso: string) => `${Number(iso.slice(8, 10))} ${mes(iso).toLowerCase()}`;
const formatoSemana = new Intl.DateTimeFormat("pt-PT", { weekday: "long", timeZone: "UTC" });
const diaDaSemana = (iso: string) => {
  const s = formatoSemana.format(new Date(`${iso}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const quandoFalta = (n: number) => (n === 0 ? "É hoje" : n === 1 ? "É amanhã" : `Faltam ${n} dias`);

const cores = ["border-primaria", "border-violeta"];

/**
 * Próximos feriados nacionais (calculados localmente, não precisam da API).
 * Mesmo desenho do cartão da agenda do HUROH: bloco da data à esquerda, lista à direita.
 */
export default function WidgetFeriados({ hoje, quantos = 3, className = "" }: { hoje: string; quantos?: number; className?: string }) {
  const [localidade] = useLocalidade();
  const ano = Number(hoje.slice(0, 4));
  const limite = maisDias(hoje, 366);
  const proximos = [...datasDoAno(ano, localidade), ...datasDoAno(ano + 1, localidade)]
    .filter((d) => d.tipo !== "comemorativa" && d.iso >= hoje && d.iso <= limite)
    .slice(0, quantos);
  const [primeiro, ...resto] = proximos;
  if (!primeiro) return null;

  return (
    <section
      aria-labelledby="w-feriados"
      className={`${vidro} arco flex min-h-44 gap-4 p-3 motion-safe:animate-subir [animation-delay:80ms] lg:min-h-0 ${className}`}
    >
      <div className="efeito-data flex w-[44%] max-w-56 shrink-0 flex-col justify-between gap-4 rounded-cartao p-4 shadow-suave ring-1 ring-white/60 dark:ring-white/10">
        <p className="text-3xl font-bold leading-none tracking-tight">
          {Number(primeiro.iso.slice(8, 10))} {mes(primeiro.iso)}
        </p>
        <p className="text-sm font-semibold leading-snug">
          <span className="block">{diaDaSemana(primeiro.iso)}</span>
          <span className="block">{quandoFalta(dias(hoje, primeiro.iso))}</span>
        </p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 py-2 lg:min-h-0 lg:overflow-y-auto lg:scroll-fino">
        <div className="flex flex-col gap-1">
          <h2 id="w-feriados" className="font-mono text-xs font-semibold uppercase tracking-wide text-texto-suave">
            Próximo feriado
          </h2>
          <p className="text-lg font-semibold leading-snug">{primeiro.nome}</p>
        </div>
        {resto.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-texto-suave">Depois</h3>
            <ul className="flex flex-col gap-3">
              {resto.map((d, i) => (
                <li key={d.iso} className={`border-l-[3px] pl-3 ${cores[i % cores.length]}`}>
                  <span className="block font-medium leading-snug">{d.nome}</span>
                  <span className="text-sm text-texto-suave">
                    {curta(d.iso)} · em {dias(hoje, d.iso)} dias
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
