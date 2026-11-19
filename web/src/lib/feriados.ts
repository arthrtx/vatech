import { isoDe, somaDias } from "./agenda";

export type TipoData = "feriado" | "municipal" | "comemorativa" | "ponte";

export interface DataEspecial {
  iso: string;
  nome: string;
  tipo: TipoData;
}

/**
 * Feriados municipais (data fixa). Fontes: famalicao.pt (13/6, Santo António) e a lista de
 * feriados municipais de 2026 do Santander Salto. Acrescentar concelhos aqui.
 */
export const MUNICIPIOS = [
  { id: "albufeira", nome: "Albufeira", mes: 8, dia: 20, motivo: "Foral de D. Manuel I" },
  { id: "aguiar-da-beira", nome: "Aguiar da Beira", mes: 2, dia: 10, motivo: "Restauração do concelho" },
  { id: "alpiarca", nome: "Alpiarça", mes: 4, dia: 2, motivo: "Criação do município" },
  { id: "arcos-de-valdevez", nome: "Arcos de Valdevez", mes: 7, dia: 11, motivo: "São Bento" },
  { id: "belmonte", nome: "Belmonte", mes: 4, dia: 26, motivo: "Primeira missa no Brasil" },
  { id: "cantanhede", nome: "Cantanhede", mes: 7, dia: 25, motivo: "São Tiago" },
  { id: "chaves", nome: "Chaves", mes: 7, dia: 8, motivo: "1.ª Incursão Monárquica" },
  { id: "coimbra", nome: "Coimbra", mes: 7, dia: 4, motivo: "Rainha Santa Isabel" },
  { id: "elvas", nome: "Elvas", mes: 1, dia: 14, motivo: "Batalha das Linhas de Elvas" },
  { id: "entroncamento", nome: "Entroncamento", mes: 11, dia: 24, motivo: "Criação do município" },
  { id: "faro", nome: "Faro", mes: 9, dia: 7, motivo: "Elevação a cidade" },
  { id: "gondomar", nome: "Gondomar", mes: 10, dia: 5, motivo: "Nossa Senhora do Rosário" },
  { id: "grandola", nome: "Grândola", mes: 10, dia: 22, motivo: "Foral do município" },
  { id: "lamego", nome: "Lamego", mes: 9, dia: 8, motivo: "Nossa Senhora dos Remédios" },
  { id: "lisboa", nome: "Lisboa", mes: 6, dia: 13, motivo: "Santo António" },
  { id: "mogadouro", nome: "Mogadouro", mes: 10, dia: 15, motivo: "Feira dos Gorazes" },
  { id: "obidos", nome: "Óbidos", mes: 1, dia: 11, motivo: "Tomada de Óbidos aos mouros" },
  { id: "porto", nome: "Porto", mes: 6, dia: 24, motivo: "São João" },
  { id: "portimao", nome: "Portimão", mes: 12, dia: 11, motivo: "Elevação a cidade" },
  { id: "santarem", nome: "Santarém", mes: 3, dia: 19, motivo: "São José" },
  { id: "sines", nome: "Sines", mes: 11, dia: 24, motivo: "Elevação a vila" },
  { id: "tomar", nome: "Tomar", mes: 3, dia: 1, motivo: "Fundação do Castelo Templário" },
  { id: "viana-do-castelo", nome: "Viana do Castelo", mes: 8, dia: 20, motivo: "Nossa Senhora da Agonia" },
  { id: "vila-nova-de-famalicao", nome: "Vila Nova de Famalicão", mes: 6, dia: 13, motivo: "Santo António" },
  { id: "vizela", nome: "Vizela", mes: 3, dia: 19, motivo: "Restauração do município" },
] as const;

export type Municipio = (typeof MUNICIPIOS)[number];
export const municipio = (id: string | null | undefined) => MUNICIPIOS.find((m) => m.id === id);

/** Domingo de Páscoa (calendário gregoriano, algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDe(ano, mes, dia);
}

/** N-ésimo domingo de um mês (1 = primeiro). */
function domingo(ano: number, mes: number, n: number): string {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  return isoDe(ano, mes, 1 + ((7 - primeiro) % 7) + (n - 1) * 7);
}

/**
 * Feriados nacionais obrigatórios de Portugal (Código do Trabalho, art. 234.º), algumas datas
 * comemorativas e, se houver localidade escolhida, o feriado municipal desse concelho.
 */
export function datasDoAno(ano: number, localidade?: string | null): DataEspecial[] {
  const p = pascoa(ano);
  const f = (mes: number, dia: number, nome: string): DataEspecial => ({ iso: isoDe(ano, mes, dia), nome, tipo: "feriado" });
  const c = (iso: string, nome: string): DataEspecial => ({ iso, nome, tipo: "comemorativa" });
  const lista: DataEspecial[] = [
    f(1, 1, "Ano Novo"),
    { iso: somaDias(p, -2), nome: "Sexta-feira Santa", tipo: "feriado" },
    { iso: p, nome: "Páscoa", tipo: "feriado" },
    f(4, 25, "Dia da Liberdade"),
    f(5, 1, "Dia do Trabalhador"),
    { iso: somaDias(p, 60), nome: "Corpo de Deus", tipo: "feriado" },
    f(6, 10, "Dia de Portugal"),
    f(8, 15, "Assunção de Nossa Senhora"),
    f(10, 5, "Implantação da República"),
    f(11, 1, "Dia de Todos os Santos"),
    f(12, 1, "Restauração da Independência"),
    f(12, 8, "Imaculada Conceição"),
    f(12, 25, "Natal"),
    c(somaDias(p, -47), "Carnaval (tolerância facultativa)"),
    c(isoDe(ano, 2, 14), "Dia dos Namorados"),
    c(isoDe(ano, 3, 8), "Dia da Mulher"),
    c(isoDe(ano, 3, 19), "Dia do Pai"),
    c(domingo(ano, 5, 1), "Dia da Mãe"),
    c(isoDe(ano, 6, 1), "Dia da Criança"),
    c(isoDe(ano, 12, 24), "Véspera de Natal"),
    c(isoDe(ano, 12, 31), "Véspera de Ano Novo"),
  ];
  const m = municipio(localidade);
  if (m) lista.push({ iso: isoDe(ano, m.mes, m.dia), nome: `${m.motivo} (${m.nome})`, tipo: "municipal" });
  return lista.sort((x, y) => x.iso.localeCompare(y.iso));
}

const cache = new Map<string, Map<string, DataEspecial[]>>();

/** Datas especiais de um dia (pode haver mais de uma). */
export function datasDoDia(iso: string, localidade?: string | null): DataEspecial[] {
  const ano = Number(iso.slice(0, 4));
  const chave = `${ano}|${localidade ?? ""}`;
  let m = cache.get(chave);
  if (!m) {
    m = new Map();
    for (const d of datasDoAno(ano, localidade)) m.set(d.iso, [...(m.get(d.iso) ?? []), d]);
    cache.set(chave, m);
  }
  return m.get(iso) ?? [];
}

/** Ponte da empresa, como a API a devolve. */
export interface PonteDia {
  nome: string;
  data_inicio: string;
  data_fim: string;
}

/** Uma entrada por dia de cada ponte (máx. 60 dias por ponte), para juntar às datas especiais. */
export function datasDasPontes(pontes: PonteDia[]): DataEspecial[] {
  const r: DataEspecial[] = [];
  for (const p of pontes) {
    for (let i = 0, iso = p.data_inicio; iso <= p.data_fim && i < 60; i++, iso = somaDias(iso, 1)) {
      r.push({ iso, nome: p.nome, tipo: "ponte" });
    }
  }
  return r;
}
