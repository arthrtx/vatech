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
import { Button } from "@/design-system/primitives";
import { Card, CardBody, CardHeader, Panel } from "@/design-system/layout";

const diasSemana = ["S", "T", "Q", "Q", "S", "S", "D"];
const rotulosData: Record<TipoData, string> = {
  feriado: "Feriado nacional",
  municipal: "Feriado municipal",
  comemorativa: "Data comemorativa",
  ponte: "Ponte",
};
const MAX_FAIXAS = 3;
// Tons suaves com contorno (o tom vivo fica só na borda), para a faixa ler-se sem gritar.
const cheio: Record<TipoPedido, string> = {
  ferias: "border border-good-edge bg-good-wash text-good-ink",
  ausencia: "border border-info-edge bg-info-wash text-info-ink",
  licenca: "border border-warning-edge bg-warning-wash text-warning-ink",
};
const vazado: Record<TipoPedido, string> = { ferias: "border-good", ausencia: "border-info", licenca: "border-warning" };
/** Pedido aprovado: faixa cheia; pendente: faixa vazada (como os traços da Agenda); ponte: contorno neutro. */
const estiloBarra = (tipo: "ponte" | TipoPedido, pendente: boolean) =>
  tipo === "ponte"
    ? "border border-line-strong bg-surface-2 text-text-1"
    : pendente
      ? `border border-dashed bg-surface-1 text-text-1 ${vazado[tipo]}`
      : cheio[tipo];
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Calendário do mês no dashboard: feriados, pontes, aniversários e ausências da equipa. */
export default function CalendarioMes({ hoje, className }: { hoje: string; className?: string }) {
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
    <Card asChild className={className}>
      <section aria-labelledby="w-calendario">
        <CardHeader padding="compact" className="flex-row items-center justify-between gap-3">
          <h2 id="w-calendario" className="text-md font-semibold text-text-1" aria-live="polite">
            {mesesPt[mes.mes - 1]} {mes.ano}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" tone="neutral" size="sm" aria-label="Mês anterior" onClick={() => setMes(mesAnterior(mes))}>
              Anterior
            </Button>
            <Button variant="outline" tone="neutral" size="sm" aria-label="Mês seguinte" onClick={() => setMes(mesSeguinte(mes))}>
              Seguinte
            </Button>
          </div>
        </CardHeader>
        <CardBody padding="compact" className="flex flex-col gap-4">
          {agenda.erro && <p className="text-sm text-text-2">Não foi possível carregar as ausências.</p>}

          <div role="grid" aria-label={`${mesesPt[mes.mes - 1]} ${mes.ano}`} className="flex flex-col gap-2">
            <div role="row" className="grid grid-cols-7">
              {diasSemana.map((d, k) => (
                <div key={k} role="columnheader" className="text-center text-xs font-medium text-text-3">
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
                <div key={semana[0].iso} role="presentation" className="flex flex-col gap-1 border-b border-line pb-2 last:border-b-0 last:pb-0">
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
                          className={`ds-tabular flex min-h-touch w-full flex-col items-center justify-center rounded-md text-base transition-colors duration-[var(--ds-motion-base)] ease-ds ${
                            c.iso === hoje
                              ? "bg-accent font-semibold text-on-accent"
                              : feriado
                                ? "bg-surface-3 font-semibold text-text-1"
                                : "text-text-1 hover:bg-wash"
                          } ${escolhido ? "ring-2 ring-accent" : ""}`}
                        >
                          {c.dia}
                          <span aria-hidden="true" className="flex h-1.5 items-center">
                            {m?.aniversarios.length ? <span className="size-1.5 rounded-pill bg-current" /> : null}
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
                          className={`truncate px-2 text-2xs font-medium leading-5 ${estiloBarra(b.tipo, b.pendente)} ${
                            b.abreAqui ? "ml-1 rounded-l-md" : "rounded-l-none"
                          } ${b.fechaAqui ? "mr-1 rounded-r-md" : "rounded-r-none"} ${b.abreAqui ? "" : "opacity-80"}`}
                        >
                          {b.abreAqui || b.de === 0 ? b.texto.split(" ")[0] : ""}
                        </span>
                      ))}
                      {escondidas > 0 && (
                        <span style={{ gridColumn: "1 / 8", gridRow: MAX_FAIXAS + 1 }} className="px-1 text-xs leading-4 text-text-3">
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
            <Panel variant="muted" padding="sm" className="text-sm">
              <p className="font-semibold text-text-1">{nomeDoDia(aberto)}</p>
              {vazio ? (
                <p className="mt-1 text-text-2">Sem marcações neste dia.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-text-1">
                  {dia?.datas.map((d) => (
                    <li key={`${d.tipo}${d.nome}`}>
                      {d.nome} <span className="text-text-3">· {rotulosData[d.tipo]}</span>
                    </li>
                  ))}
                  {dia?.aniversarios.map((n) => (
                    <li key={n}>Aniversário de {n}</li>
                  ))}
                  {dia?.pedidos.map((p) => (
                    <li key={p.id}>
                      {p.user?.nome ?? "Alguém"}{" "}
                      <span className="text-text-3">
                        · {tipos[p.tipo]}
                        {p.estado === "pendente" ? " (pendente)" : ""} · {dataCurta(p.data_inicio)} a {dataCurta(p.data_fim)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </CardBody>
      </section>
    </Card>
  );
}
