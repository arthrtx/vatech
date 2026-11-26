'use client';

import { useEffect, useState } from 'react';

/*
| Peças partilhadas pela família `calendar`: os tipos públicos do evento e a
| aritmética de datas que o `Calendar` e o `AgendaGrid` usam os dois.
|
| Fica num ficheiro à parte pela mesma razão que `overlays/internals.tsx`: não
| é um componente, é detalhe partilhado. O barril decide o que sai — daqui só
| saem os tipos.
|
| ZERO dependências de datas, de propósito. `Intl.DateTimeFormat` já traz nomes
| de mês e de dia em qualquer locale, e o resto — somar dias, saltar um mês,
| comparar dois dias — são vinte linhas. Arrastar `date-fns` para dentro de um
| design system que se copia ficheiro a ficheiro seria pôr uma dependência de
| 200 kB no `depende_de` de cada componente do registry.
*/

/**
 * Significado de um evento. É o vocabulário fechado da casa — o mesmo do
 * `Badge`, do `Alert` e do `StatusDot`. Um calendário não inventa `severity`.
 */
export type CalendarTone = 'neutral' | 'accent' | 'good' | 'warning' | 'serious' | 'critical' | 'info';

/** 0 = domingo … 6 = sábado, tal como `Date.prototype.getDay()`. */
export type CalendarWeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Um evento. A mesma forma serve a grelha de mês (que só olha para `start`) e
 * a grelha de tempo (que precisa dos dois extremos).
 */
export type CalendarEvent = {
  /** Estável entre renders — é a chave da lista e o que permite reordenar sem perder o nó. */
  id: string;
  /** O que aparece escrito. Um evento sem texto é uma barra colorida, e isso não é informação. */
  title: string;
  start: Date;
  /** Sem `end`, o `AgendaGrid` desenha o evento com a duração de um slot. */
  end?: Date;
  /** Significado. Nunca a única via: o `AgendaGrid` escreve também o tom por extenso. */
  tone?: CalendarTone;
  /** Marca o evento como de dia inteiro. A grelha de tempo ignora-o — não tem sítio no eixo. */
  allDay?: boolean;
};

/** Chapa de cor do ponto, por tom. Strings literais completas: o Tailwind não vê `bg-${tom}`. */
export const PONTO_POR_TOM: Record<CalendarTone, string> = {
  neutral: 'bg-text-3',
  accent: 'bg-accent',
  good: 'bg-good',
  warning: 'bg-warning',
  serious: 'bg-serious',
  critical: 'bg-critical',
  info: 'bg-info',
};

/**
 * O tom por extenso, para o texto que acompanha a cor.
 *
 * `neutral` fica vazio de propósito: escrever "normal" em todos os eventos sem
 * tom é ruído que não distingue nada.
 */
export const ROTULO_POR_TOM: Record<CalendarTone, string> = {
  neutral: '',
  accent: 'Destaque',
  good: 'Confirmado',
  warning: 'Aviso',
  serious: 'Grave',
  critical: 'Crítico',
  info: 'Informativo',
};

/* ------------------------------------------------------------ aritmética */

/** Meia-noite local do dia de `data`. Perde a hora — é o que se quer para comparar dias. */
export function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/*
| Comparar dias com `===` sobre `Date` nunca funciona: um `Date` é um instante
| em milissegundos, e dois objectos do mesmo dia com horas diferentes nunca são
| iguais — nem por `===` (identidade de objecto) nem por `getTime()`.
|
| E `toISOString().slice(0, 10)` também não serve, embora seja o atalho mais
| escrito: converte para UTC. Às 23:30 de Lisboa no Verão (UTC+1) devolve já o
| dia seguinte, e em Nova Iorque (UTC-5) a manhã ainda devolve o dia anterior.
| O calendário mostra dias LOCAIS, logo compara-se por componentes locais.
*/
export function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** Chave estável `AAAA-MM-DD` em tempo LOCAL — nunca `toISOString()`, pela razão acima. */
export function chaveDoDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * Soma dias preservando a hora.
 *
 * O construtor com dia fora do intervalo normaliza sozinho — `new Date(2025, 0, 32)`
 * é 1 de Fevereiro — e é por isso que aqui não é preciso tratar fim de mês.
 */
export function adicionarDias(data: Date, dias: number): Date {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate() + dias,
    data.getHours(),
    data.getMinutes(),
  );
}

/** Número de dias do mês. Dia 0 do mês seguinte é o último deste. */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/*
| Saltar de mês com `setMonth` é a armadilha clássica: em 31 de Janeiro,
| `setMonth(1)` pede 31 de Fevereiro e o `Date` "corrige" para 3 de Março — o
| utilizador carrega uma vez em "mês seguinte" e salta dois. O mesmo acontece
| em 31 de Maio → Junho, e em qualquer 29/30/31 sobre um mês mais curto.
|
| Fixa-se o dia 1 antes de saltar, e só depois se recoloca o dia, limitado ao
| último dia do mês de destino.
*/
export function adicionarMeses(data: Date, meses: number): Date {
  const alvo = new Date(data.getFullYear(), data.getMonth() + meses, 1);
  const ultimo = diasNoMes(alvo.getFullYear(), alvo.getMonth());
  alvo.setDate(Math.min(data.getDate(), ultimo));
  return alvo;
}

/** Dia 1 do mês de `data`, à meia-noite. */
export function inicioDoMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

/**
 * Primeiro dia da semana que contém `data`.
 *
 * `weekStartsOn` existe porque a semana não começa no mesmo dia em todo o lado:
 * a ISO 8601 (e a convenção portuguesa) começa à segunda, os EUA ao domingo.
 */
export function inicioDaSemana(data: Date, weekStartsOn: CalendarWeekDay): Date {
  const base = inicioDoDia(data);
  const recuo = (base.getDay() - weekStartsOn + 7) % 7;
  return adicionarDias(base, -recuo);
}

/** Minutos decorridos desde a meia-noite local. É a coordenada do eixo de tempo. */
export function minutosDoDia(data: Date): number {
  return data.getHours() * 60 + data.getMinutes();
}

/** `true` se `dia` cai estritamente entre `de` e `ate` (extremos excluídos). */
export function entreDias(dia: Date, de: Date, ate: Date): boolean {
  const alvo = inicioDoDia(dia).getTime();
  return alvo > inicioDoDia(de).getTime() && alvo < inicioDoDia(ate).getTime();
}

/* --------------------------------------------------------------- relógio */

/**
 * O instante de agora, resolvido só no cliente e acompanhado ao minuto.
 *
 * Devolve `null` no primeiro render de propósito: o servidor e a hidratação
 * produzem assim a mesma árvore, que é o que evita o erro de hidratação quando
 * os dois estão em fusos diferentes — em Lisboa às 23:30 de Verão, um servidor
 * em UTC já está no dia seguinte e marcava outro dia como "hoje".
 *
 * E depois segue o relógio, em vez de congelar no instante em que montou: o
 * "hoje" de um calendário aberto numa parede muda à meia-noite, e a linha do
 * "agora" de uma agenda tem de descer. Reagenda-se para a fronteira do minuto
 * seguinte, não de 60 em 60 segundos, para não ir derivando.
 */
export function useAgora(): Date | null {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    let temporizador = 0;

    // O `setState` vive dentro do callback do temporizador, e não no corpo do
    // efeito: o sistema externo a que isto se sincroniza é o relógio.
    const marcar = () => {
      const instante = new Date();
      setAgora(instante);
      const ateAoMinuto = 60_000 - (instante.getSeconds() * 1000 + instante.getMilliseconds());
      temporizador = window.setTimeout(marcar, ateAoMinuto);
    };

    temporizador = window.setTimeout(marcar, 0);
    return () => window.clearTimeout(temporizador);
  }, []);

  return agora;
}
