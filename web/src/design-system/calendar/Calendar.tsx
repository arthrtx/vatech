'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Button, IconButton } from '../primitives';
import { Icone, ICONES } from '../icons';
import {
  PONTO_POR_TOM,
  adicionarDias,
  adicionarMeses,
  chaveDoDia,
  entreDias,
  inicioDaSemana,
  inicioDoDia,
  inicioDoMes,
  mesmoDia,
  useAgora,
  type CalendarEvent,
  type CalendarWeekDay,
} from './internals';

/*
| Grelha de mês.
|
| Três decisões estruturais, todas visíveis daqui:
|
| 1. É uma `<table role="grid">` e não uma pilha de `<div>`. Um mês É uma
|    tabela: as colunas têm cabeçalho (o dia da semana) e as linhas têm
|    significado (a semana). O `role="grid"` troca a navegação de "tabela de
|    dados" pela de "widget de grelha", que é o que o teclado abaixo implementa.
|
| 2. Roving tabindex: exactamente UM botão da grelha tem `tabIndex=0`; os
|    outros 34 têm -1. Com 35 células tabuláveis, chegar ao conteúdo a seguir
|    ao calendário custa 35 toques em Tab — o widget deixa de ser usável muito
|    antes de deixar de ser acessível.
|
| 3. Hoje e o dia seleccionado NÃO se distinguem só por cor. O seleccionado
|    leva chapa; hoje leva uma barra por baixo do número, que sobrevive à
|    chapa (é `bg-current`, herda a tinta) e a quem não distingue as duas cores.
*/

const celula = cva(
  [
    'relative flex w-full min-h-touch flex-col items-center justify-center gap-1 px-1 py-2',
    'ds-tabular text-sm',
    'transition-colors duration-[var(--ds-motion-base)] ease-ds',
  ].join(' '),
  {
    variants: {
      state: {
        /** Dia comum do mês visível. */
        normal: 'rounded-md text-text-1 hover:bg-wash',
        /** Extremo do intervalo, ou o dia único escolhido. */
        selected: 'rounded-md bg-accent font-bold text-on-accent hover:bg-accent-hover',
        /** Interior do intervalo: chapa fraca e cantos direitos, para as células colarem umas às outras. */
        inside: 'bg-accent-wash text-text-1',
      },
      /*
      | Dia do mês vizinho. Só se aplica quando o estado é `normal`: se um dia
      | de Julho estiver seleccionado na grelha de Agosto, a tinta que manda é
      | a da chapa, não a de "fora do mês" — e como o `cn()` deixa ganhar a
      | última classe de cor, aplicar as duas apagava a primeira em silêncio.
      */
      outside: { true: 'text-text-3', false: '' },
      /*
      | Bloqueado, mas ainda focável — é `aria-disabled` e não `disabled`. Um
      | `<button disabled>` sai da ordem de foco, e num roving tabindex isso
      | parte a navegação: a seta tenta pousar num dia bloqueado, o `focus()`
      | não pega, e quem usa o teclado fica encalhado à porta de um fim-de-semana.
      | Declarado por último para o `hover` anular o do estado anterior.
      */
      disabled: { true: 'cursor-not-allowed opacity-50 hover:bg-transparent', false: '' },
    },
    defaultVariants: { state: 'normal', outside: false, disabled: false },
  },
);

export type CalendarSelectionMode = 'single' | 'range';

/** Intervalo em construção. `end: null` significa "escolheu o início, falta o fim". */
export type CalendarRange = {
  start: Date | null;
  end: Date | null;
};

type CalendarPropsBase = Omit<
  React.ComponentProps<'div'>,
  'onChange' | 'defaultValue' | 'children'
> & {
  /** Mês visível, controlado. Só o mês e o ano contam — o dia é ignorado. */
  month?: Date;
  /** Mês inicial quando o calendário gere o seu próprio mês. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** 1 = segunda (ISO 8601 e convenção pt-PT) por omissão; 0 = domingo. */
  weekStartsOn?: CalendarWeekDay;
  /** Locale dos nomes de mês e de dia. Só afecta texto — a aritmética é local. */
  locale?: string;
  /**
   * Qual é o dia de hoje. Injectável de propósito: sem ele o valor é resolvido
   * no cliente depois de montar, para o servidor e o browser não renderizarem
   * dias diferentes quando estão em fusos diferentes.
   */
  today?: Date;
  minDate?: Date;
  maxDate?: Date;
  /** Regra própria de bloqueio — fins-de-semana, feriados, dias já ocupados. */
  isDateDisabled?: (date: Date) => boolean;
  /** Eventos a marcar. Só a data de início conta: a grelha de mês não tem eixo de tempo. */
  events?: CalendarEvent[];
  /** Como marcar os dias com eventos: pontos por tom, contador, ou nada. */
  eventDisplay?: 'dots' | 'count' | 'none';
};

/*
| O tipo público é uma união discriminada por `mode` para que o `onChange` de
| um calendário simples receba `Date | null` e o de um intervalo receba
| `CalendarRange` — sem isso, quem consome tinha de estreitar o valor à mão em
| cada handler, e o compilador deixava passar o par errado.
*/
export type CalendarProps = CalendarPropsBase &
  (
    | {
        mode?: 'single';
        value?: Date | null;
        defaultValue?: Date | null;
        onChange?: (value: Date | null) => void;
      }
    | {
        mode: 'range';
        value?: CalendarRange | null;
        defaultValue?: CalendarRange | null;
        onChange?: (value: CalendarRange) => void;
      }
  );

/**
 * A forma larga com que o corpo trabalha. Ver a nota no `Calendar`.
 *
 * `onChange` fica de fora: numa união, a assinatura do callback é o único
 * campo que não se alarga por conversão directa (um parâmetro é contravariante,
 * logo alargá-lo não é assignável em nenhum dos sentidos). Trata-se à parte.
 */
type CalendarPropsInternas = CalendarPropsBase & {
  mode?: CalendarSelectionMode;
  value?: Date | CalendarRange | null;
  defaultValue?: Date | CalendarRange | null;
};

/**
 * Calendário de mês, com selecção simples ou de intervalo, controlado ou não.
 *
 * Teclado (WAI-ARIA, padrão de grelha): setas movem um dia ou uma semana,
 * `Home`/`End` vão ao início e ao fim da semana, `PageUp`/`PageDown` mudam de
 * mês (com `Shift`, de ano), `Enter`/`Space` seleccionam.
 */
export function Calendar(props: CalendarProps) {
  /*
  | Estreitar a união dentro do corpo obrigaria a duplicar toda a lógica por
  | ramo — duas árvores de JSX iguais que divergiriam ao primeiro arranjo. O
  | contrato exigente fica na fronteira (o tipo público); cá dentro trabalha-se
  | com a forma larga e converte-se num sítio só, o `seleccionar`.
  */
  const {
    className,
    mode = 'single',
    value,
    defaultValue,
    month,
    defaultMonth,
    onMonthChange,
    weekStartsOn = 1,
    locale = 'pt-PT',
    today,
    minDate,
    maxDate,
    isDateDisabled,
    events,
    eventDisplay = 'dots',
    ...resto
  } = props as CalendarPropsInternas;

  /*
  | O callback, alargado num sítio só. Quem chama continua a ver a assinatura
  | estreita do seu `mode`; cá dentro chama-se com o valor que o modo produz.
  */
  const onChange = props.onChange as ((value: Date | CalendarRange | null) => void) | undefined;

  const idTitulo = useId();
  const corpoRef = useRef<HTMLTableSectionElement>(null);

  /* ---- hoje ---- */
  // `useAgora()` devolve `null` no primeiro render e depois segue o relógio — ver a nota do hook.
  const relogio = useAgora();
  const hoje = today ?? relogio;

  /* ---- selecção ---- */
  const [seleccaoInterna, setSeleccaoInterna] = useState<Date | CalendarRange | null>(
    () => defaultValue ?? (mode === 'range' ? { start: null, end: null } : null),
  );
  // Controlado é `value !== undefined` e não `value != null`: `null` é um valor válido (nada escolhido).
  const controlado = value !== undefined;
  const seleccao = controlado ? (value ?? null) : seleccaoInterna;
  const dataSimples = mode === 'single' ? (seleccao as Date | null) : null;
  const intervalo = mode === 'range' ? (seleccao as CalendarRange | null) : null;

  /* ---- mês visível ---- */
  const [mesInterno, setMesInterno] = useState<Date>(() =>
    inicioDoMes(month ?? defaultMonth ?? today ?? new Date()),
  );
  const mesVisivel = month ? inicioDoMes(month) : mesInterno;
  const anoVisivel = mesVisivel.getFullYear();
  const numeroDoMes = mesVisivel.getMonth();

  /* ---- dia focado (roving tabindex) ---- */
  const [diaFocado, setDiaFocado] = useState<Date>(() => {
    const base = defaultValue instanceof Date ? defaultValue : (defaultMonth ?? today ?? new Date());
    return inicioDoDia(base);
  });
  /*
  | Só se rouba o foco quando foi o teclado a mover — nunca no primeiro render,
  | nem quando os botões de navegação mudam de mês. É um `ref` e não estado: a
  | intenção de mover o foco não se desenha, e mantê-la em estado obrigava a um
  | `setState` dentro do efeito só para a limpar.
  */
  const focoPendente = useRef(false);

  useEffect(() => {
    if (!focoPendente.current) return;
    focoPendente.current = false;
    corpoRef.current
      ?.querySelector<HTMLButtonElement>(`[data-dia="${chaveDoDia(diaFocado)}"]`)
      ?.focus();
  }, [diaFocado]);

  /* ---- grelha ---- */
  const semanas = useMemo(() => {
    const inicio = inicioDaSemana(new Date(anoVisivel, numeroDoMes, 1), weekStartsOn);
    const linhas: Date[][] = [];
    for (let s = 0; s < 6; s += 1) {
      linhas.push(Array.from({ length: 7 }, (_, d) => adicionarDias(inicio, s * 7 + d)));
    }
    /*
    | Seis semanas cobrem qualquer mês; a maioria cabe em cinco. Deitar fora a
    | linha que fica INTEIRA fora do mês evita a sexta linha vazia — e evita
    | também que a grelha mude de altura de mês para mês sem razão.
    */
    return linhas.filter((semana) => semana.some((dia) => dia.getMonth() === numeroDoMes));
  }, [anoVisivel, numeroDoMes, weekStartsOn]);

  const nomesDosDias = useMemo(() => {
    const curto = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const longo = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    // Uma semana de referência qualquer serve: só interessam os nomes, não as datas.
    const referencia = inicioDaSemana(new Date(2024, 0, 1), weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => {
      const dia = adicionarDias(referencia, i);
      return { chave: dia.getDay(), curto: curto.format(dia), longo: longo.format(dia) };
    });
  }, [locale, weekStartsOn]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, CalendarEvent[]>();
    for (const evento of events ?? []) {
      const chave = chaveDoDia(evento.start);
      const lista = mapa.get(chave);
      if (lista) lista.push(evento);
      else mapa.set(chave, [evento]);
    }
    return mapa;
  }, [events]);

  // Sem `useMemo`: `mesVisivel` é um `Date` novo a cada render, logo não serve de
  // dependência, e um formatador de duas palavras não justifica a ginástica.
  const tituloDoMes = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    mesVisivel,
  );

  const nomeDoDia = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale],
  );

  /* ---- estado por célula ---- */

  function estaDesactivado(dia: Date): boolean {
    if (minDate && inicioDoDia(dia).getTime() < inicioDoDia(minDate).getTime()) return true;
    if (maxDate && inicioDoDia(dia).getTime() > inicioDoDia(maxDate).getTime()) return true;
    return isDateDisabled ? isDateDisabled(dia) : false;
  }

  function estaSeleccionado(dia: Date): boolean {
    if (mode === 'single') return dataSimples ? mesmoDia(dia, dataSimples) : false;
    const inicio = intervalo?.start ?? null;
    const fim = intervalo?.end ?? null;
    return (inicio !== null && mesmoDia(dia, inicio)) || (fim !== null && mesmoDia(dia, fim));
  }

  function estaNoInterior(dia: Date): boolean {
    const inicio = intervalo?.start ?? null;
    const fim = intervalo?.end ?? null;
    if (!inicio || !fim) return false;
    return entreDias(dia, inicio, fim);
  }

  /* ---- acções ---- */

  function seleccionar(dia: Date) {
    if (estaDesactivado(dia)) return;
    setDiaFocado(inicioDoDia(dia));

    if (mode === 'single') {
      // Voltar a carregar no dia já escolhido limpa a selecção — é como se desmarca sem um botão extra.
      const proximo = dataSimples && mesmoDia(dia, dataSimples) ? null : inicioDoDia(dia);
      if (!controlado) setSeleccaoInterna(proximo);
      onChange?.(proximo);
      return;
    }

    /*
    | Intervalo: sem início, ou já com os dois extremos, recomeça; com só o
    | início, fecha. Se a segunda escolha for anterior à primeira, trocam-se em
    | vez de rejeitar o clique — quem escolhe "para trás" quer o mesmo intervalo,
    | e um clique que não faz nada lê-se como avaria.
    */
    const actual = intervalo ?? { start: null, end: null };
    const escolhido = inicioDoDia(dia);
    const proximo: CalendarRange =
      !actual.start || actual.end
        ? { start: escolhido, end: null }
        : escolhido.getTime() < actual.start.getTime()
          ? { start: escolhido, end: actual.start }
          : { start: actual.start, end: escolhido };

    if (!controlado) setSeleccaoInterna(proximo);
    onChange?.(proximo);
  }

  function mostrarMes(novo: Date) {
    const normalizado = inicioDoMes(novo);
    if (!month) setMesInterno(normalizado);
    onMonthChange?.(normalizado);
  }

  function navegarMes(passo: number) {
    const proximo = adicionarMeses(diaFocado, passo);
    setDiaFocado(proximo);
    mostrarMes(proximo);
    // `focoPendente` fica falso: o foco continua no botão de navegação, para se poder carregar outra vez.
  }

  function irParaHoje() {
    const alvo = inicioDoDia(hoje ?? new Date());
    setDiaFocado(alvo);
    mostrarMes(alvo);
  }

  function aoTeclado(evento: React.KeyboardEvent<HTMLTableSectionElement>) {
    let proximo: Date | null = null;
    switch (evento.key) {
      case 'ArrowLeft':
        proximo = adicionarDias(diaFocado, -1);
        break;
      case 'ArrowRight':
        proximo = adicionarDias(diaFocado, 1);
        break;
      case 'ArrowUp':
        proximo = adicionarDias(diaFocado, -7);
        break;
      case 'ArrowDown':
        proximo = adicionarDias(diaFocado, 7);
        break;
      case 'Home':
        proximo = inicioDaSemana(diaFocado, weekStartsOn);
        break;
      case 'End':
        proximo = adicionarDias(inicioDaSemana(diaFocado, weekStartsOn), 6);
        break;
      case 'PageUp':
        proximo = adicionarMeses(diaFocado, evento.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        proximo = adicionarMeses(diaFocado, evento.shiftKey ? 12 : 1);
        break;
      default:
        // Enter e Space não vêm aqui de propósito: a célula é um `<button>` e já os trata.
        return;
    }

    // Sem isto as setas rolam a página por baixo do calendário.
    evento.preventDefault();
    focoPendente.current = true;
    setDiaFocado(proximo);
    if (proximo.getMonth() !== numeroDoMes || proximo.getFullYear() !== anoVisivel) {
      mostrarMes(proximo);
    }
  }

  /*
  | Qual a célula que fica tabulável. É a do dia focado — excepto quando esse
  | dia não está na grelha visível (mudou-se de mês pelos botões), e aí passa
  | para o dia 1. Sem esta salvaguarda a grelha ficava sem nenhum `tabIndex=0`
  | e deixava de se alcançar por Tab.
  */
  const chaveFocada = chaveDoDia(diaFocado);
  const chavesVisiveis = useMemo(
    () => new Set(semanas.flat().map(chaveDoDia)),
    [semanas],
  );
  const chaveTabulavel = chavesVisiveis.has(chaveFocada)
    ? chaveFocada
    : chaveDoDia(new Date(anoVisivel, numeroDoMes, 1));

  return (
    <div className={cn('w-full max-w-(--container-form)', className)} {...resto}>
      <div className="mb-3 flex items-center justify-between gap-3">
        {/*
          | `aria-live="polite"`: sem isto, mudar de mês pelo teclado não anuncia
          | nada e quem usa leitor de ecrã fica sem saber onde está.
          | Primeira letra em maiúscula porque `Intl` devolve "agosto de 2025".
        */}
        <p id={idTitulo} aria-live="polite" className="text-md font-bold text-text-1 first-letter:uppercase">
          {tituloDoMes}
        </p>
        <div className="flex items-center gap-2">
          <IconButton aria-label="Mês anterior" variant="outline" size="sm" onClick={() => navegarMes(-1)}>
            <Icone de={ICONES.anterior} />
          </IconButton>
          <Button variant="ghost" tone="neutral" size="sm" onClick={irParaHoje}>
            Hoje
          </Button>
          <IconButton aria-label="Mês seguinte" variant="outline" size="sm" onClick={() => navegarMes(1)}>
            <Icone de={ICONES.seguinte} />
          </IconButton>
        </div>
      </div>

      <table
        role="grid"
        aria-labelledby={idTitulo}
        className="w-full table-fixed border-separate border-spacing-0"
      >
        <thead>
          <tr>
            {nomesDosDias.map((nome) => (
              <th key={nome.chave} scope="col" className="pb-2">
                {/* O nome curto é para ler de relance; o longo é o que o leitor de ecrã anuncia. */}
                <span aria-hidden="true" className="ds-eyebrow block text-2xs">
                  {nome.curto}
                </span>
                <span className="ds-sr-only">{nome.longo}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody ref={corpoRef} onKeyDown={aoTeclado}>
          {semanas.map((semana) => {
            const primeiro = semana[0];
            return (
              <tr key={primeiro ? chaveDoDia(primeiro) : 'semana'}>
                {semana.map((dia) => {
                  const chave = chaveDoDia(dia);
                  const foraDoMes = dia.getMonth() !== numeroDoMes;
                  const ehHoje = hoje ? mesmoDia(dia, hoje) : false;
                  const seleccionado = estaSeleccionado(dia);
                  const interior = !seleccionado && estaNoInterior(dia);
                  const desactivado = estaDesactivado(dia);
                  const eventosDoDia = eventosPorDia.get(chave) ?? [];
                  const estado = seleccionado ? 'selected' : interior ? 'inside' : 'normal';

                  const partesDoNome = [nomeDoDia.format(dia)];
                  if (ehHoje) partesDoNome.push('hoje');
                  if (foraDoMes) partesDoNome.push('fora do mês');
                  if (desactivado) partesDoNome.push('indisponível');
                  if (eventosDoDia.length === 1) partesDoNome.push('1 evento');
                  else if (eventosDoDia.length > 1) partesDoNome.push(`${eventosDoDia.length} eventos`);

                  return (
                    <td key={chave} role="gridcell" aria-selected={seleccionado} className="p-0">
                      <button
                        type="button"
                        data-dia={chave}
                        // O roving tabindex: uma célula tabulável, as outras alcançáveis por seta.
                        tabIndex={chave === chaveTabulavel ? 0 : -1}
                        aria-disabled={desactivado || undefined}
                        aria-current={ehHoje ? 'date' : undefined}
                        // O número sozinho não diz que dia é: o nome acessível leva a data por extenso.
                        aria-label={partesDoNome.join(', ')}
                        onClick={() => seleccionar(dia)}
                        // O roving tabindex segue o foco. Só se escreve estado quando o dia muda mesmo.
                        onFocus={() => {
                          if (!mesmoDia(dia, diaFocado)) setDiaFocado(inicioDoDia(dia));
                        }}
                        className={cn(
                          celula({
                            state: estado,
                            outside: estado === 'normal' && foraDoMes,
                            disabled: desactivado,
                          }),
                        )}
                      >
                        <span>{dia.getDate()}</span>

                        {/*
                          | A marca de hoje. Ocupa sempre o espaço (transparente quando
                          | não é hoje) para os números não saltarem de linha para linha,
                          | e é `bg-current` para herdar a tinta — continua visível por
                          | cima da chapa de seleccionado.
                        */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-(--ds-border-strong) w-4 rounded-pill',
                            ehHoje ? 'bg-current' : 'bg-transparent',
                          )}
                        />

                        {eventDisplay !== 'none' && eventosDoDia.length > 0 ? (
                          eventDisplay === 'count' ? (
                            <span aria-hidden="true" className="text-2xs font-semibold">
                              {eventosDoDia.length}
                            </span>
                          ) : (
                            <span aria-hidden="true" className="flex items-center gap-1">
                              {/* Três pontos chegam: a contagem exacta vai no nome acessível. */}
                              {eventosDoDia.slice(0, 3).map((evento) => (
                                <span
                                  key={evento.id}
                                  className={cn(
                                    'size-1 rounded-pill',
                                    PONTO_POR_TOM[evento.tone ?? 'neutral'],
                                  )}
                                />
                              ))}
                            </span>
                          )
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
