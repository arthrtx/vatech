"use client";

import { useCallback, useMemo, useState } from "react";
import { api, type Aniversario, type PedidoAgenda, type Ponte, type TipoPedido } from "@/lib/api";
import { celulasDoMes, intervaloDoMes, mesAnterior, mesDe, mesSeguinte, mesesPt, nomeDoDia, quemE } from "@/lib/agenda";
import { marcasDoAno } from "@/lib/calendario";
import { datasDasPontes, datasDoAno, type TipoData } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { tipos } from "@/lib/rotulos";
import { useFonte } from "@/lib/useFonte";
import { IconeSeta } from "../Icones";
import { vidro } from "../ui";

const diasSemana = ["S", "T", "Q", "Q", "S", "S", "D"];
const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-1";
const botaoSeta =
  "flex h-9 w-9 items-center justify-center rounded-full bg-painel/70 text-texto shadow-suave ring-1 ring-white/70 transition hover:bg-primaria-suave focus-visible:outline-2 focus-visible:outline-offset-2 dark:ring-white/10";
const rotulosData: Record<TipoData, string> = {
  feriado: "Feriado nacional",
  municipal: "Feriado municipal",
  comemorativa: "Data comemorativa",
  ponte: "Ponte",
};
const pontoTipo: Record<TipoPedido, string> = { ferias: "bg-positivo", ausencia: "bg-violeta", licenca: "bg-primaria" };
const bordaTipo: Record<TipoPedido, string> = { ferias: "border-positivo", ausencia: "border-violeta", licenca: "border-primaria" };
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Calendário do mês no dashboard: feriados, pontes, aniversários e ausências da equipa. */
export default function CalendarioMes({ hoje, className = "" }: { hoje: string; className?: string }) {
  const [localidade] = useLocalidade();
  const [mes, setMes] = useState(() => mesDe(hoje));
  const [aberto, setAberto] = useState<string | null>(hoje);
  const { de, ate } = intervaloDoMes(mes);

  const agenda = useFonte(useCallback(() => Promise.resolve().then(() => api.agenda(de, ate)), [de, ate]));
  const anivs = useFonte(
    useCallback((): Promise<Aniversario[]> => Promise.resolve().then(() => api.aniversarios(de, ate)).catch(() => []), [de, ate]),
  );
  const pont = useFonte(useCallback((): Promise<Ponte[]> => Promise.resolve().then(() => api.pontes(de, ate)).catch(() => []), [de, ate]));

  const pedidos: PedidoAgenda[] = useMemo(() => agenda.dados ?? [], [agenda.dados]);
  const marcas = useMemo(
    () => marcasDoAno(mes.ano, [...datasDoAno(mes.ano, localidade), ...datasDasPontes(pont.dados ?? [])], anivs.dados ?? [], pedidos),
    [mes.ano, localidade, pont.dados, anivs.dados, pedidos],
  );
  const dia = aberto ? marcas.get(aberto) : undefined;
  const vazio = !dia || dia.datas.length + dia.aniversarios.length + dia.pedidos.length === 0;

  return (
    <section aria-labelledby="w-calendario" className={`${vidro} arco flex flex-col gap-3 p-4 motion-safe:animate-subir ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="w-calendario" className="text-base font-semibold" aria-live="polite">
          {mesesPt[mes.mes - 1]} {mes.ano}
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" className={botaoSeta} aria-label="Mês anterior" title="Mês anterior" onClick={() => setMes(mesAnterior(mes))}>
            <IconeSeta direcao="esquerda" className="h-4 w-4" />
          </button>
          <button type="button" className={botaoSeta} aria-label="Mês seguinte" title="Mês seguinte" onClick={() => setMes(mesSeguinte(mes))}>
            <IconeSeta direcao="direita" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {agenda.erro && <p className="text-sm text-texto-suave">Não foi possível carregar as ausências.</p>}

      <div role="grid" aria-label={`${mesesPt[mes.mes - 1]} ${mes.ano}`} className="grid grid-cols-7 gap-y-1">
        {diasSemana.map((d, k) => (
          <div key={k} role="columnheader" className="text-center text-[0.6875rem] font-medium uppercase text-texto-suave">
            {d}
          </div>
        ))}
        {celulasDoMes(mes).map((c) => {
          if (!c.doMes) return <div key={c.iso} role="gridcell" aria-hidden="true" />;
          const m = marcas.get(c.iso);
          const feriado = !!m?.datas.some((d) => d.tipo === "feriado" || d.tipo === "municipal");
          const ponte = !!m?.datas.some((d) => d.tipo === "ponte");
          const escolhido = aberto === c.iso;
          const pontos = [...new Map((m?.pedidos ?? []).map((p) => [`${quemE(p)}|${p.tipo}|${p.estado}`, p])).entries()].slice(0, 3);
          return (
            <button
              key={c.iso}
              type="button"
              role="gridcell"
              aria-label={nomeDoDia(c.iso)}
              aria-selected={escolhido}
              aria-current={c.iso === hoje ? "date" : undefined}
              onClick={() => setAberto(escolhido ? null : c.iso)}
              className={`mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-sm tabular-nums ${foco} ${
                c.iso === hoje
                  ? "bg-primaria font-semibold text-white"
                  : feriado
                    ? "bg-rosa-suave font-semibold text-texto"
                    : ponte
                      ? "bg-primaria-suave text-texto ring-1 ring-inset ring-primaria"
                      : "text-texto hover:bg-primaria-suave"
              } ${escolhido ? "ring-2 ring-primaria" : ""}`}
            >
              {c.dia}
              <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                {m?.aniversarios.length ? <span className="h-1.5 w-1.5 rounded-full bg-rosa" /> : null}
                {pontos.map(([chave, p]) => (
                  <span
                    key={chave}
                    className={`h-1.5 w-1.5 rounded-full border ${bordaTipo[p.tipo]} ${p.estado === "pendente" ? "bg-painel" : pontoTipo[p.tipo]}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {aberto && (
        <div className="rounded-controlo bg-painel/40 px-3 py-2 text-sm ring-1 ring-white/50 dark:ring-white/10">
          <p className="font-semibold">{nomeDoDia(aberto)}</p>
          {vazio ? (
            <p className="text-texto-suave">Sem marcações neste dia.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5">
              {dia?.datas.map((d) => (
                <li key={`${d.tipo}${d.nome}`}>
                  {d.nome} <span className="text-texto-suave">· {rotulosData[d.tipo]}</span>
                </li>
              ))}
              {dia?.aniversarios.map((n) => (
                <li key={n}>Aniversário de {n}</li>
              ))}
              {dia?.pedidos.map((p) => (
                <li key={p.id}>
                  {p.user?.nome ?? "Alguém"}{" "}
                  <span className="text-texto-suave">
                    · {tipos[p.tipo]}
                    {p.estado === "pendente" ? " (pendente)" : ""} · {dataCurta(p.data_inicio)} a {dataCurta(p.data_fim)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
