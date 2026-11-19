"use client";

import { cobreDia } from "@/lib/agenda";
import type { PedidoAgenda } from "@/lib/api";
import { aprovados, maisDias } from "@/lib/dashboard";
import { datasDoDia } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { vidro } from "../ui";

const letras = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Quantas pessoas estão fora em cada um dos próximos 7 dias (só aprovados). */
export default function WidgetSemana({ agenda, hoje }: { agenda: PedidoAgenda[]; hoje: string }) {
  const [localidade] = useLocalidade();
  const ap = aprovados(agenda);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const iso = maisDias(hoje, i);
    return { iso, n: ap.filter((p) => cobreDia(p, iso)).length, feriado: datasDoDia(iso, localidade).some((d) => d.tipo !== "comemorativa") };
  });
  const max = Math.max(1, ...dias.map((d) => d.n));

  return (
    <section aria-labelledby="w-semana" className={`${vidro} brilho-laranja flex flex-col gap-4 p-5 motion-safe:animate-subir [animation-delay:160ms]`}>
      <div>
        <h2 id="w-semana" className="text-lg font-semibold">
          Próximos 7 dias
        </h2>
        <p className="text-sm text-texto-suave">Pessoas fora por dia</p>
      </div>
      <ol className="grid h-40 grid-cols-7 items-end gap-2">
        {dias.map((d, i) => {
          const dia = new Date(`${d.iso}T12:00:00`);
          return (
            <li key={d.iso} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold tabular-nums">{d.n}</span>
              <span className="flex w-full flex-1 items-end rounded-controlo bg-trilho/70">
                <span
                  className={`block w-full rounded-controlo transition-[height] duration-700 ${i === 0 ? "bg-rosa" : "bg-primaria"}`}
                  style={{ height: `${Math.max(6, (d.n / max) * 100)}%`, opacity: d.n === 0 ? 0.25 : 1 }}
                />
              </span>
              <span className={`text-xs ${i === 0 ? "font-semibold" : "text-texto-suave"}`}>
                {i === 0 ? "Hoje" : letras[dia.getDay()]}
              </span>
              <span className="sr-only">
                {d.iso}: {d.n} {d.n === 1 ? "pessoa fora" : "pessoas fora"}
                {d.feriado ? ", feriado" : ""}
              </span>
              <span aria-hidden="true" className={`h-1 w-1 rounded-full ${d.feriado ? "bg-rosa" : "bg-transparent"}`} />
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-texto-suave">Rosa: hoje. Ponto rosa: feriado.</p>
    </section>
  );
}
