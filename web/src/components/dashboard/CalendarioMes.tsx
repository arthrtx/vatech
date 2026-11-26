"use client";

import { useCallback, useMemo, useState } from "react";
import { api, type Aniversario, type PedidoAgenda, type Ponte, type TipoPedido } from "@/lib/api";
import { celulasDoMes, intervaloDoMes, mesAnterior, mesDe, mesSeguinte, mesesPt, nomeDoDia } from "@/lib/agenda";
import { barrasDaSemana, marcasDoAno } from "@/lib/calendario";
import { useFeriadosDoAno } from "@/lib/useFeriados";
import { datasDasPontes, datasDoAno, type TipoData } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { tipos } from "@/lib/rotulos";
import { useFonte } from "@/lib/useFonte";
import { IconeSeta } from "../Icones";
import { vidro } from "../ui";

const diasSemana = ["S", "T", "Q", "Q", "S", "S", "D"];
const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-1";
const botaoSeta =
  "flex h-10 w-10 items-center justify-center rounded-full bg-painel/70 text-texto shadow-suave ring-1 ring-white/70 transition hover:bg-primaria-suave focus-visible:outline-2 focus-visible:outline-offset-2 dark:ring-white/10";
const rotulosData: Record<TipoData, string> = {
  feriado: "Feriado nacional",
  municipal: "Feriado municipal",
  comemorativa: "Data comemorativa",
  ponte: "Ponte",
};
const MAX_FAIXAS = 3;
// Tons suaves com contorno (a cor viva fica só no contorno), para a faixa ler-se sem gritar.
const cheio: Record<TipoPedido, string> = {
  ferias: "bg-positivo/30 text-texto ring-1 ring-inset ring-positivo",
  ausencia: "bg-violeta/40 text-texto ring-1 ring-inset ring-violeta",
  licenca: "bg-primaria/15 text-texto ring-1 ring-inset ring-primaria/50",
};
const vazado: Record<TipoPedido, string> = { ferias: "border-positivo", ausencia: "border-violeta", licenca: "border-primaria" };
/** Pedido aprovado: faixa cheia; pendente: faixa vazada (como os traços da Agenda); ponte: contorno primário suave. */
const estiloBarra = (tipo: "ponte" | TipoPedido, pendente: boolean) =>
  tipo === "ponte"
    ? "bg-primaria-suave text-texto ring-1 ring-inset ring-primaria"
    : pendente
      ? `border border-dashed bg-painel/70 text-texto ${vazado[tipo]}`
      : cheio[tipo];
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
  const feriadosV = useFeriadosDoAno(mes.ano);
  const marcas = useMemo(
    () => marcasDoAno(mes.ano, [...datasDoAno(mes.ano, localidade), ...datasDasPontes(pont.dados ?? [])], anivs.dados ?? [], pedidos),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feriadosV: re-calcula quando chegam feriados da API
    [mes.ano, localidade, pont.dados, anivs.dados, pedidos, feriadosV],
  );
  const semanas = useMemo(() => {
    const c = celulasDoMes(mes);
    return Array.from({ length: c.length / 7 }, (_, i) => c.slice(i * 7, i * 7 + 7));
  }, [mes]);
  const dia = aberto ? marcas.get(aberto) : undefined;
  const vazio = !dia || dia.datas.length + dia.aniversarios.length + dia.pedidos.length === 0;

  return (
    <section aria-labelledby="w-calendario" className={`${vidro} arco flex flex-col gap-3 p-5 motion-safe:animate-subir ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="w-calendario" className="text-lg font-semibold" aria-live="polite">
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

      <div role="grid" aria-label={`${mesesPt[mes.mes - 1]} ${mes.ano}`} className="flex flex-col gap-2">
        <div role="row" className="grid grid-cols-7">
          {diasSemana.map((d, k) => (
            <div key={k} role="columnheader" className="text-center text-[0.6875rem] font-medium uppercase text-texto-suave">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((semana) => {
          const barras = barrasDaSemana(
            semana.map((c) => c.iso),
            pedidos,
            pont.dados ?? [],
          );
          const visiveisB = barras.filter((b) => b.faixa < MAX_FAIXAS);
          const escondidas = barras.length - visiveisB.length;
          return (
            <div key={semana[0].iso} role="presentation" className="flex flex-col gap-1 border-b border-linha/50 pb-2 last:border-b-0 last:pb-0">
              <div role="row" className="grid grid-cols-7">
                {semana.map((c) => {
                  if (!c.doMes) return <div key={c.iso} role="gridcell" aria-hidden="true" />;
                  const m = marcas.get(c.iso);
                  const feriado = !!m?.datas.some((d) => d.tipo === "feriado" || d.tipo === "municipal");
                  const escolhido = aberto === c.iso;
                  return (
                    <button
                      key={c.iso}
                      type="button"
                      role="gridcell"
                      aria-label={nomeDoDia(c.iso)}
                      aria-selected={escolhido}
                      aria-current={c.iso === hoje ? "date" : undefined}
                      onClick={() => setAberto(escolhido ? null : c.iso)}
                      className={`mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-base tabular-nums ${foco} ${
                        c.iso === hoje
                          ? "bg-primaria font-semibold text-white"
                          : feriado
                            ? "bg-rosa-suave font-semibold text-texto"
                            : "text-texto hover:bg-primaria-suave"
                      } ${escolhido ? "ring-2 ring-primaria" : ""}`}
                    >
                      {c.dia}
                      <span aria-hidden="true" className="flex h-1.5 items-center">
                        {m?.aniversarios.length ? <span className="h-1.5 w-1.5 rounded-full bg-rosa" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              {barras.length > 0 && (
                <div aria-hidden="true" className="grid auto-rows-[1.25rem] grid-cols-7 gap-y-1">
                  {visiveisB.map((b) => (
                    <span
                      key={b.chave}
                      title={`${b.texto} · ${b.tipo === "ponte" ? "Ponte" : tipos[b.tipo]}${b.pendente ? " (pendente)" : ""}`}
                      style={{ gridColumn: `${b.de + 1} / ${b.ate + 2}`, gridRow: b.faixa + 1 }}
                      className={`truncate px-2 text-[0.6875rem] font-medium leading-5 ${estiloBarra(b.tipo, b.pendente)} ${
                        b.abreAqui ? "ml-1 rounded-l-full" : "rounded-l-none"
                      } ${b.fechaAqui ? "mr-1 rounded-r-full" : "rounded-r-none"} ${b.abreAqui ? "" : "opacity-80"}`}
                    >
                      {b.abreAqui || b.de === 0 ? b.texto.split(" ")[0] : ""}
                    </span>
                  ))}
                  {escondidas > 0 && (
                    <span style={{ gridColumn: "1 / 8", gridRow: MAX_FAIXAS + 1 }} className="px-1.5 text-[0.625rem] leading-4 text-texto-suave">
                      +{escondidas} {escondidas === 1 ? "marcação" : "marcações"}
                    </span>
                  )}
                </div>
              )}
            </div>
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
