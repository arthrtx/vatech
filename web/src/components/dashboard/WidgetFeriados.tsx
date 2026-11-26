"use client";

import { mesesPt } from "@/lib/agenda";
import { datasDoAno } from "@/lib/feriados";
import { useFeriadosDoAno } from "@/lib/useFeriados";
import { maisDias } from "@/lib/dashboard";
import { useLocalidade } from "@/lib/localidade";
import Forma from "./Forma";

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
const mes = (iso: string) => mesesPt[Number(iso.slice(5, 7)) - 1].slice(0, 3);
const curta = (iso: string) => `${Number(iso.slice(8, 10))} ${mes(iso).toLowerCase()}`;
const formatoSemana = new Intl.DateTimeFormat("pt-PT", { weekday: "long", timeZone: "UTC" });
const diaDaSemana = (iso: string) => {
  const s = formatoSemana.format(new Date(`${iso}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const quandoFalta = (n: number) => (n === 0 ? "É hoje" : n === 1 ? "É amanhã" : `Faltam ${n} dias`);

const pilula = "rounded-full bg-painel px-3 py-1 text-sm font-semibold text-texto";

/** Próximos feriados nacionais (da API de feriados; sem resposta, calculados localmente), como linha do tempo no painel lateral. */
export default function WidgetFeriados({ hoje, quantos = 3, className = "" }: { hoje: string; quantos?: number; className?: string }) {
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
    <section
      aria-labelledby="w-feriados"
      className={`relative isolate flex flex-col gap-5 overflow-hidden rounded-barra bg-pessego p-6 text-texto motion-safe:animate-subir [animation-delay:80ms] ${className}`}
    >
      <Forma tipo="estrela" className="-right-8 -top-8 -z-10 h-36 w-36 text-rosa/40" />
      <div className="flex flex-col gap-3">
        <h2 id="w-feriados" className="w-fit rounded-full bg-painel px-3 py-1 text-xs font-semibold uppercase tracking-wide text-texto">
          Próximo feriado
        </h2>
        <p className="whitespace-nowrap text-6xl font-bold leading-none tracking-tighter">
          {Number(primeiro.iso.slice(8, 10))} {mes(primeiro.iso)}
        </p>
        <p className="text-xl font-semibold leading-snug">{primeiro.nome}</p>
        <p className="flex flex-wrap gap-2">
          <span className={pilula}>{diaDaSemana(primeiro.iso)}</span>
          <span className={pilula}>{quandoFalta(dias(hoje, primeiro.iso))}</span>
        </p>
      </div>
      {resto.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide">Depois</h3>
          <ul className="flex flex-col gap-2">
            {resto.map((d) => (
              <li key={d.iso} className="flex items-center gap-3 rounded-cartao bg-painel px-3 py-3">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-primaria text-white">
                  <span className="text-lg font-bold leading-none">{Number(d.iso.slice(8, 10))}</span>
                  <span className="text-[0.65rem] font-semibold uppercase leading-none">{mes(d.iso)}</span>
                </span>
                <div className="min-w-0">
                  <span className="block font-semibold leading-snug">{d.nome}</span>
                  <span className="text-sm text-texto-suave">
                    {curta(d.iso)} · em {dias(hoje, d.iso)} dias
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
