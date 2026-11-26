'use client';

import { useMemo } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';
import {
  ROTULO_POR_TOM,
  adicionarDias,
  chaveDoDia,
  inicioDoDia,
  mesmoDia,
  minutosDoDia,
  useAgora,
  type CalendarEvent,
} from './internals';

/*
| Vista de TEMPO. Serve a semana e os três dias — é o mesmo componente.
|
| PORQUÊ UM E NÃO DOIS: "semana" e "3 dias" não são duas vistas, são o mesmo
| eixo de tempo com contagem de colunas diferente. Tudo o que as distinguiria
| — eixo de horas, posicionamento por hora de início e fim, reparto de largura
| entre eventos sobrepostos, linha do "agora" — é idêntico; a única diferença é
| quantas colunas se desenham e a partir de que dia. Dois componentes seriam
| dois sítios para corrigir o mesmo cálculo de sobreposição, e ao fim de duas
| correcções já divergiam. Daí `days`, e não `WeekView` + `ThreeDayView`.
|
| MOBILE: com `days=7` num ecrã de 390px cada coluna fica com 45px e o texto
| deixa de se ler. A coluna tem largura mínima (`--ds-space-15`, 120px) e é o
| CONTENTOR que rola na horizontal — nunca a página, que é o que acontece se o
| `min-w-0` faltar dentro de um flex ou grid. Em telemóvel, `days=3`.
|
| LEITOR DE ECRÃ: uma grelha de blocos posicionados em percentagens não se lê.
| O bloco visual está `aria-hidden` e a informação vai a seguir numa lista
| `.ds-sr-only` com dia, hora e título em texto corrido. O contentor que rola
| fica focável (`tabIndex=0` + `role="group"` com nome) para quem navega por
| teclado poder rolá-lo — e é ele, não o conteúdo escondido, que recebe o foco.
*/

/** Bloco de evento. O tom é chapa fraca + borda na cor do tom; o texto diz o mesmo. */
const bloco = cva(
  ['absolute overflow-hidden rounded-sm border px-2 py-1', 'text-2xs leading-snug'].join(' '),
  {
    variants: {
      tone: {
        neutral: 'border-line bg-surface-2 text-text-1',
        accent:
          'border-[color-mix(in_srgb,var(--ds-accent)_30%,transparent)] bg-accent-wash text-accent-ink',
        good: 'border-good-edge bg-good-wash text-good-ink',
        warning: 'border-warning-edge bg-warning-wash text-warning-ink',
        serious: 'border-serious-edge bg-serious-wash text-serious-ink',
        critical: 'border-critical-edge bg-critical-wash text-critical-ink',
        info: 'border-info-edge bg-info-wash text-info-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/*
| Barra de dia inteiro. Partilha a paleta do bloco de evento, mas não o chassis:
| aqui não há altura derivada de horas nem barra de tom à esquerda — a barra
| atravessa colunas, e uma marca só à esquerda perder-se-ia num evento que
| começou fora do intervalo visível.
*/
const barraDeDiaInteiro = cva(
  'flex min-w-0 items-center gap-2 overflow-hidden rounded-sm border px-2 py-0.5 text-2xs leading-snug',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-surface-2 text-text-1',
        accent:
          'border-[color-mix(in_srgb,var(--ds-accent)_30%,transparent)] bg-accent-wash text-accent-ink',
        good: 'border-good-edge bg-good-wash text-good-ink',
        warning: 'border-warning-edge bg-warning-wash text-warning-ink',
        serious: 'border-serious-edge bg-serious-wash text-serious-ink',
        critical: 'border-critical-edge bg-critical-wash text-critical-ink',
        info: 'border-info-edge bg-info-wash text-info-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type AgendaGridProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  /** Primeiro dia da primeira coluna. A hora é ignorada. */
  startDate: Date;
  /** Quantas colunas. 7 = semana, 3 = três dias. É a única diferença entre as duas vistas. */
  days?: number;
  events?: CalendarEvent[];
  /** Primeira hora visível (0–24). Fora dela os eventos são cortados, não desaparecem. */
  dayStartHour?: number;
  /** Última hora visível (0–24). */
  dayEndHour?: number;
  /** Duração mínima desenhada — e a de um evento sem `end`. */
  slotMinutes?: number;
  locale?: string;
  /**
   * O instante de agora, para a linha do "agora". Injectável pela mesma razão
   * que o `today` do `Calendar`: sem ele é resolvido no cliente depois de
   * montar, para o servidor e o browser não desenharem a linha em sítios
   * diferentes.
   */
  now?: Date;
};

/** Um evento já colocado no eixo. Tudo em percentagem do eixo — nunca em pixéis. */
type BlocoColocado = {
  evento: CalendarEvent;
  /** % a contar do topo do eixo. */
  topo: number;
  altura: number;
  /** % a contar da esquerda da coluna do dia. */
  esquerda: number;
  largura: number;
  inicioMinutos: number;
  fimMinutos: number;
};

/**
 * Grelha de horários: um eixo de horas à esquerda e N colunas de dia.
 *
 * `days={7}` dá a semana, `days={3}` os três dias. Ver a nota no topo do
 * ficheiro para o porquê de ser um componente só.
 */
export function AgendaGrid({
  className,
  startDate,
  days = 7,
  events,
  dayStartHour = 8,
  dayEndHour = 20,
  slotMinutes = 30,
  locale = 'pt-PT',
  now,
  ...resto
}: AgendaGridProps) {
  // `useAgora()` é `null` no primeiro render e depois anda ao minuto — a linha
  // do "agora" desce sozinha, sem o consumidor ter de forçar um render.
  const relogio = useAgora();
  const agora = now ?? relogio;

  const colunas = Math.max(1, Math.round(days));
  const primeiraHora = Math.min(Math.max(Math.round(dayStartHour), 0), 23);
  const ultimaHora = Math.min(Math.max(Math.round(dayEndHour), primeiraHora + 1), 24);
  const inicioMinutos = primeiraHora * 60;
  const fimMinutos = ultimaHora * 60;
  const totalMinutos = fimMinutos - inicioMinutos;
  const horas = Array.from({ length: ultimaHora - primeiraHora }, (_, i) => primeiraHora + i);

  const dias = useMemo(
    () => Array.from({ length: colunas }, (_, i) => adicionarDias(inicioDoDia(startDate), i)),
    [startDate, colunas],
  );

  /*
  | Faixas de dia inteiro. Um evento destes atravessa colunas — férias, feriado,
  | uma sprint — e é isso que justifica a faixa existir: mostrá-lo repetido em
  | cada dia diria a mesma coisa N vezes e escondia que é UM período.
  |
  | `end` é INCLUSIVO aqui, ao contrário do evento com hora: "de 4 a 6" são três
  | dias inteiros, não dois e um instante. Um evento sem `end` ocupa um dia.
  |
  | Recorta-se ao intervalo visível: um evento que começou antes do primeiro dia
  | entra pela esquerda e não desaparece.
  */
  const faixasDeDiaInteiro = useMemo(() => {
    const primeiro = dias[0];
    const ultimo = dias[dias.length - 1];
    if (!primeiro || !ultimo) return [];

    const recortadas = (events ?? [])
      .filter((evento) => evento.allDay)
      .map((evento) => {
        const de = inicioDoDia(evento.start);
        const ate = inicioDoDia(evento.end ?? evento.start);
        return { evento, de, ate };
      })
      .filter(({ de, ate }) => ate >= primeiro && de <= ultimo)
      .map(({ evento, de, ate }) => {
        const inicio = Math.max(0, dias.findIndex((d) => mesmoDia(d, de)));
        const fimEncontrado = dias.findIndex((d) => mesmoDia(d, ate));
        return {
          evento,
          coluna: de < primeiro ? 0 : inicio,
          colunaFim: fimEncontrado === -1 ? dias.length - 1 : fimEncontrado,
          entraAntes: de < primeiro,
          saiDepois: ate > ultimo,
        };
      })
      .sort((a, b) => a.coluna - b.coluna || b.colunaFim - a.colunaFim);

    /*
    | Empilhar: cada barra vai para a primeira linha onde não bate noutra. É o
    | mesmo algoritmo guloso do eixo de tempo, mas em colunas de dia em vez de
    | minutos — duas barras que partilhem um dia não se podem tapar.
    */
    const ocupacao: number[] = [];
    return recortadas.map((faixa) => {
      let linha = ocupacao.findIndex((ateOnde) => ateOnde < faixa.coluna);
      if (linha === -1) linha = ocupacao.length;
      ocupacao[linha] = faixa.colunaFim;
      return { ...faixa, linha };
    });
  }, [events, dias]);

  const linhasDeFaixa = faixasDeDiaInteiro.reduce((maximo, f) => Math.max(maximo, f.linha + 1), 0);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, CalendarEvent[]>();
    for (const evento of events ?? []) {
      // Um evento de dia inteiro não tem hora, logo não tem sítio no eixo —
      // vai para a faixa por cima das colunas, não para o fundo do poço.
      if (evento.allDay) continue;
      const chave = chaveDoDia(evento.start);
      const lista = mapa.get(chave);
      if (lista) lista.push(evento);
      else mapa.set(chave, [evento]);
    }
    return mapa;
  }, [events]);

  const horaCurta = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  );
  const diaLongo = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );
  const diaCurto = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);

  const primeiroDia = dias[0];
  const ultimoDia = dias[dias.length - 1];
  const rotuloDaRegiao =
    primeiroDia && ultimoDia
      ? `Grelha de horários, de ${diaLongo.format(primeiroDia)} a ${diaLongo.format(ultimoDia)}. O mesmo conteúdo está listado em texto a seguir à grelha.`
      : 'Grelha de horários.';

  return (
    <div className={cn('w-full min-w-0', className)} {...resto}>
      {/*
        | O `overflow-x-auto` é DESTE contentor e o `min-w-0` não é redundante
        | com o `w-full`: dentro de um flex ou grid o item tem `min-width:auto`
        | e cresce até caber o conteúdo — a barra de rolagem nunca aparece e
        | quem passa a rolar na horizontal é a página inteira.
      */}
      <div
        role="group"
        aria-label={rotuloDaRegiao}
        tabIndex={0}
        className="w-full min-w-0 overflow-x-auto rounded-lg border border-line bg-surface-1"
      >
        {/*
          | UMA grelha para tudo, com o eixo das horas como primeira coluna.
          |
          | A versão anterior punha o eixo e as colunas lado a lado em flex, e o
          | cabeçalho e o corpo de cada dia DENTRO da coluna respectiva. Isso
          | torna impossível uma barra que atravesse dias — que é exactamente o
          | que a faixa de dia inteiro precisa de fazer. Com uma grelha só, as
          | três linhas (cabeçalho · dia inteiro · horas) alinham sozinhas e a
          | barra passa a ser um item que ocupa um `span` de colunas.
        */}
        <div
          aria-hidden="true"
          className="grid"
          style={{
            gridTemplateColumns: `var(--ds-space-13) repeat(${colunas}, minmax(var(--ds-space-15), 1fr))`,
          }}
        >
          {/* ── linha 1: canto + dias ──────────────────────────────────── */}
          <div className="sticky left-0 z-[var(--ds-z-sticky)] h-(--ds-space-11) border-r border-b border-line bg-surface-1" />
          {dias.map((dia) => {
            const ehHoje = agora ? mesmoDia(dia, agora) : false;
            return (
              <div
                key={`cab-${chaveDoDia(dia)}`}
                className="flex h-(--ds-space-11) min-w-0 flex-col items-center justify-center border-b border-l border-line"
              >
                <span className={cn('ds-eyebrow text-2xs', ehHoje ? 'text-accent-ink' : undefined)}>
                  {diaCurto.format(dia)}
                </span>
                <span
                  className={cn(
                    'ds-tabular text-sm',
                    ehHoje ? 'font-bold text-accent-ink' : 'text-text-1',
                  )}
                >
                  {dia.getDate()}
                </span>
              </div>
            );
          })}

          {/* ── linha 2: faixa de dia inteiro ──────────────────────────── */}
          {linhasDeFaixa > 0 ? (
            <>
              <div className="sticky left-0 z-[var(--ds-z-sticky)] border-r border-b border-line bg-surface-1 px-2 py-1 text-end">
                <span className="ds-eyebrow text-2xs">Todo o dia</span>
              </div>
              {/*
                | A faixa é UMA célula que ocupa todas as colunas de dia, com uma
                | grelha própria lá dentro. Podia ser `subgrid`, mas assim as
                | barras posicionam-se com `gridColumn` simples, sem depender do
                | suporte a subgrid.
              */}
              <div className="border-b border-line p-1" style={{ gridColumn: `2 / span ${colunas}` }}>
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${linhasDeFaixa}, auto)`,
                  }}
                >
                  {faixasDeDiaInteiro.map(
                    ({ evento, coluna, colunaFim, linha, entraAntes, saiDepois }) => {
                      const tom = evento.tone ?? 'neutral';
                      const rotuloDoTom = ROTULO_POR_TOM[tom];
                      return (
                        <div
                          key={evento.id}
                          className={barraDeDiaInteiro({ tone: tom })}
                          /*
                            | Geometria derivada dos DADOS, como o bloco do eixo:
                            | em que dia começa, em que dia acaba, e em que linha
                            | ficou depois do empilhamento. Nenhuma utilidade
                            | exprime "da 2.ª à 5.ª coluna, na 2.ª linha".
                          */
                          style={{
                            gridColumn: `${coluna + 1} / ${colunaFim + 2}`,
                            gridRow: `${linha + 1}`,
                          }}
                        >
                          {/* Continuação: o período não começou nem acaba aqui. */}
                          {entraAntes ? <Icone de={ICONES.paraEsquerda} medida="sm" className="shrink-0" /> : null}
                          <span className="min-w-0 flex-1 truncate font-semibold">{evento.title}</span>
                          {rotuloDoTom ? <span className="shrink-0 truncate">{rotuloDoTom}</span> : null}
                          {saiDepois ? <Icone de={ICONES.paraDireita} medida="sm" className="shrink-0" /> : null}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </>
          ) : null}

          {/* ── linha 3: eixo de horas + poço de cada dia ──────────────── */}
          <div className="sticky left-0 z-[var(--ds-z-sticky)] border-r border-line bg-surface-1">
            {horas.map((hora) => (
              <div key={hora} className="h-(--ds-space-10) border-b border-line px-2 pt-1 text-end">
                <span className="ds-tabular text-2xs text-text-3">
                  {String(hora).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {dias.map((dia) => {
            const chave = chaveDoDia(dia);
            const doDia = eventosPorDia.get(chave) ?? [];
            const colocados = colocarNoEixo(doDia, inicioMinutos, fimMinutos, slotMinutes);
            const ehHoje = agora ? mesmoDia(dia, agora) : false;
            const minutosAgora = agora ? minutosDoDia(agora) : 0;
            const mostrarAgora =
              ehHoje && minutosAgora >= inicioMinutos && minutosAgora <= fimMinutos;

            return (
              <div key={chave} className="relative min-w-0 border-l border-line">
                {horas.map((hora) => (
                  <div key={hora} className="h-(--ds-space-10) border-b border-line" />
                ))}

                {colocados.map(
                  ({ evento, topo, altura, esquerda, largura, inicioMinutos: de, fimMinutos: ate }) => {
                    const tom = evento.tone ?? 'neutral';
                    const rotuloDoTom = ROTULO_POR_TOM[tom];
                    return (
                      <div
                        key={evento.id}
                        className={bloco({ tone: tom })}
                        /*
                          | A geometria do eixo: sai da hora de início, da hora de
                          | fim e de quantos eventos se sobrepõem naquele instante.
                          | Em percentagem, e não em pixéis, para a altura da
                          | grelha continuar a vir do token da linha da hora.
                        */
                        style={{
                          top: `${topo}%`,
                          height: `${altura}%`,
                          left: `${esquerda}%`,
                          width: `${largura}%`,
                        }}
                      >
                        <span className="block truncate font-semibold">{evento.title}</span>
                        <span className="ds-tabular block truncate">
                          {formatarIntervalo(horaCurta, dia, de, ate)}
                          {/* O tom nunca vai só em cor: aparece escrito ao lado da hora. */}
                          {rotuloDoTom ? ` · ${rotuloDoTom}` : ''}
                        </span>
                      </div>
                    );
                  },
                )}

                {mostrarAgora ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 border-t-2 border-critical"
                    style={{ top: `${((minutosAgora - inicioMinutos) / totalMinutos) * 100}%` }}
                  >
                    <span className="absolute -top-1 left-0 size-2 rounded-pill bg-critical" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/*
        | O conteúdo real para leitor de ecrã. Uma lista de dias, cada um com a
        | sua lista de eventos em texto — a única forma de ler blocos que só
        | existem como posição.
      */}
      <ol className="ds-sr-only">
        {dias.map((dia) => {
          const chave = chaveDoDia(dia);
          const doDia = [...(eventosPorDia.get(chave) ?? [])].sort(
            (a, b) => minutosDoDia(a.start) - minutosDoDia(b.start),
          );
          /*
            | Os de dia inteiro entram AQUI também. A barra que os mostra vive
            | numa grelha `aria-hidden` e só existe como posição — se não forem
            | ditos nesta lista, para quem usa leitor de ecrã não existem.
            |
            | Um evento de vários dias é repetido em cada dia que abrange, ao
            | contrário do que acontece na barra: numa lista lida em série não
            | há "atravessar colunas", e quem chega a quarta-feira precisa de
            | saber que o período continua.
          */
          const diaInteiroDoDia = faixasDeDiaInteiro
            .filter((f) => {
              const indice = dias.findIndex((d) => mesmoDia(d, dia));
              return indice >= f.coluna && indice <= f.colunaFim;
            })
            .map((f) => f.evento);

          return (
            <li key={chave}>
              {diaLongo.format(dia)}
              <ol>
                {diaInteiroDoDia.map((evento) => {
                  const rotuloDoTom = ROTULO_POR_TOM[evento.tone ?? 'neutral'];
                  return (
                    <li key={`inteiro-${evento.id}`}>
                      {`${evento.title}, todo o dia`}
                      {rotuloDoTom ? `, ${rotuloDoTom.toLowerCase()}` : ''}
                    </li>
                  );
                })}
                {doDia.length === 0 && diaInteiroDoDia.length === 0 ? (
                  <li>Sem eventos.</li>
                ) : (
                  doDia.map((evento) => {
                    const de = minutosDoDia(evento.start);
                    const ate = evento.end ? minutosDoDia(evento.end) : de + slotMinutes;
                    const rotuloDoTom = ROTULO_POR_TOM[evento.tone ?? 'neutral'];
                    return (
                      <li key={evento.id}>
                        {`${evento.title}, das ${formatarHora(horaCurta, dia, de)} às ${formatarHora(horaCurta, dia, ate)}`}
                        {rotuloDoTom ? `, ${rotuloDoTom.toLowerCase()}` : ''}
                      </li>
                    );
                  })
                )}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------- geometria */

/**
 * Coloca os eventos de UM dia no eixo, repartindo a largura entre os que se
 * sobrepõem.
 *
 * Um evento tapado é um evento perdido: quem olha para a grelha não sabe que
 * ele existe. O algoritmo é o clássico em dois tempos — agrupar o que se toca,
 * e dentro de cada grupo pôr cada evento na primeira coluna que já vagou.
 */
function colocarNoEixo(
  eventos: CalendarEvent[],
  inicioMinutos: number,
  fimMinutos: number,
  slotMinutes: number,
): BlocoColocado[] {
  const total = fimMinutos - inicioMinutos;
  if (total <= 0) return [];

  const preparados = eventos
    .map((evento) => {
      const de = minutosDoDia(evento.start);
      const fim = evento.end ? minutosDoDia(evento.end) : de + slotMinutes;
      // Duração mínima de um slot: um evento de 5 minutos desenhado com 5 minutos é uma risca ilegível.
      return { evento, de, ate: Math.max(fim, de + slotMinutes) };
    })
    .filter((item) => item.ate > inicioMinutos && item.de < fimMinutos)
    // Por início; a empate, o mais longo primeiro, para ficar na coluna da esquerda.
    .sort((a, b) => a.de - b.de || b.ate - a.ate);

  const resultado: BlocoColocado[] = [];
  let grupo: typeof preparados = [];
  let fimDoGrupo = Number.NEGATIVE_INFINITY;

  function fecharGrupo() {
    // `fimPorColuna[i]` = instante em que a coluna i ficou livre.
    const fimPorColuna: number[] = [];
    const colunaDe = grupo.map((item) => {
      const livre = fimPorColuna.findIndex((fim) => fim <= item.de);
      if (livre === -1) {
        fimPorColuna.push(item.ate);
        return fimPorColuna.length - 1;
      }
      fimPorColuna[livre] = item.ate;
      return livre;
    });

    const quantas = Math.max(fimPorColuna.length, 1);
    grupo.forEach((item, indice) => {
      const coluna = colunaDe[indice] ?? 0;
      const de = Math.max(item.de, inicioMinutos);
      const ate = Math.min(item.ate, fimMinutos);
      resultado.push({
        evento: item.evento,
        topo: ((de - inicioMinutos) / total) * 100,
        altura: Math.max(((ate - de) / total) * 100, 0),
        esquerda: (coluna / quantas) * 100,
        largura: 100 / quantas,
        inicioMinutos: item.de,
        fimMinutos: item.ate,
      });
    });

    grupo = [];
    fimDoGrupo = Number.NEGATIVE_INFINITY;
  }

  for (const item of preparados) {
    // Começa depois de tudo o que está no grupo acabar → é um grupo novo.
    if (grupo.length > 0 && item.de >= fimDoGrupo) fecharGrupo();
    grupo.push(item);
    fimDoGrupo = Math.max(fimDoGrupo, item.ate);
  }
  if (grupo.length > 0) fecharGrupo();

  return resultado;
}

/** Minutos desde a meia-noite → "09:30", formatado no locale pedido. */
function formatarHora(formatador: Intl.DateTimeFormat, dia: Date, minutos: number): string {
  const data = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, minutos);
  return formatador.format(data);
}

function formatarIntervalo(
  formatador: Intl.DateTimeFormat,
  dia: Date,
  de: number,
  ate: number,
): string {
  return `${formatarHora(formatador, dia, de)}–${formatarHora(formatador, dia, ate)}`;
}
