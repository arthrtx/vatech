import type { ResumoRh } from "./api";
import { tamanhoLegivel } from "./anexos";
import { estados, formatarData, rotuloPapel, subtipos } from "./rotulos";

export const SEM_REGISTOS = "Sem registos";

const rotuloCategoria: Record<string, string> = {
  declaracao: "Declaração",
  documentos_estagio: "Documentos de estágio",
  contrato: "Contrato",
  recibo: "Recibo",
  outro: "Outro",
  personalizado: "Personalizado",
};

export interface LinhaPedido {
  colunas: string[];
  notas: string[];
}

/** Conteúdo do PDF já em texto, por secção (sem qualquer desenho). */
export interface ResumoPreparado {
  titulo: string;
  geradoEm: string;
  pessoa: [string, string][];
  ferias: [string, string][];
  pedidos: LinhaPedido[];
  presencas: [string, string][];
  infos: [string, string][];
  anexos: string[][];
}

const dois = (n: number) => String(n).padStart(2, "0");
const dataLocal = (d: Date) => `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
const comVirgula = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
const opc = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "");

export function dataHoraLegivel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatarData(iso);
  return `${dataLocal(d)} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

/** `resumo-<nome-sem-acentos>-<AAAA-MM-DD>.pdf` */
export function nomeFicheiroResumo(nome: string, geradoEm: string): string {
  const slug =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pessoa";
  const d = new Date(geradoEm);
  const dia = Number.isNaN(d.getTime()) ? geradoEm.slice(0, 10) : `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  return `resumo-${slug}-${dia}.pdf`;
}

function periodo(p: ResumoRh["pedidos"][number]): string {
  const datas = p.data_inicio === p.data_fim ? formatarData(p.data_inicio) : `${formatarData(p.data_inicio)} a ${formatarData(p.data_fim)}`;
  return p.hora_inicio && p.hora_fim ? `${datas}, ${p.hora_inicio.slice(0, 5)} a ${p.hora_fim.slice(0, 5)}` : datas;
}

function decisao(p: ResumoRh["pedidos"][number]): string {
  const quem = opc(p.decidido_por);
  if (!quem) return "-";
  return p.decidido_em ? `${quem}, ${formatarData(p.decidido_em)}` : quem;
}

/** Função pura: transforma a resposta da API em texto organizado por secção. */
export function prepararResumo(r: ResumoRh): ResumoPreparado {
  const p = r.pessoa;
  const pessoa: [string, string][] = [
    ["Nome", p.nome],
    ["Email", p.email],
    ["Papel", rotuloPapel(p)],
    ["Conta", p.estado_conta === "pendente" ? "Pendente" : p.estado_conta === "recusado" ? "Recusada" : "Ativa"],
  ];
  if (p.data_nascimento) pessoa.push(["Data de nascimento", formatarData(p.data_nascimento)]);
  if (p.papel === "estagiario") {
    if (p.estagio_inicio) pessoa.push(["Início do estágio", formatarData(p.estagio_inicio)]);
    if (p.estagio_fim) pessoa.push(["Fim do estágio", formatarData(p.estagio_fim)]);
    if (opc(p.instituicao_ensino)) pessoa.push(["Instituição de ensino", opc(p.instituicao_ensino)]);
  }

  const f = r.ferias;
  const ordenados = [...r.pedidos].sort((a, b) => b.data_inicio.localeCompare(a.data_inicio) || b.criado_em.localeCompare(a.criado_em));

  return {
    titulo: "Resumo de pessoa",
    geradoEm: dataHoraLegivel(r.gerado_em),
    pessoa,
    // Estagiário não tem direito a férias: secção omitida.
    ferias:
      p.papel === "estagiario"
        ? []
        : [
            ["Ano", String(f.ano)],
            ["Dias do ano", String(f.dias_ano)],
            ["Transitados", String(f.transitados)],
            ["Usados", String(f.usados)],
            ["Restantes", String(f.restantes)],
          ],
    pedidos: ordenados.map((x) => {
      const sub = x.subtipo ? subtipos[x.subtipo as keyof typeof subtipos] ?? x.subtipo : "";
      const notas: string[] = [];
      if (opc(x.motivo)) notas.push(`Motivo: ${opc(x.motivo)}`);
      if (opc(x.motivo_recusa)) notas.push(`Motivo da recusa: ${opc(x.motivo_recusa)}`);
      return {
        colunas: [
          sub ? `${x.tipo_rotulo} (${sub})` : x.tipo_rotulo,
          periodo(x),
          x.dias_uteis == null ? "-" : String(x.dias_uteis),
          estados[x.estado] ?? x.estado,
          decisao(x),
        ],
        notas,
      };
    }),
    presencas: [
      ["Ano", String(r.presencas.ano)],
      ["Dias com registo", String(r.presencas.dias_com_registo)],
      ["Horas registadas", `${comVirgula(r.presencas.horas_total)} h`],
    ],
    infos: r.infos.map((i) => [i.titulo, i.valor]),
    anexos: r.ficheiros.map((x) => [
      x.nome,
      x.categoria === "personalizado" && x.categoria_nome ? x.categoria_nome : (rotuloCategoria[x.categoria] ?? "Outro"),
      tamanhoLegivel(x.tamanho),
      formatarData(x.criado_em),
    ]),
  };
}

// Tokens de globals.css (tema claro): primaria, texto-suave, linha, campo.
const COR = { primaria: "#1a181e", suave: "#5c555d", linha: "#e7e4e8", campo: "#f4f2f5", branco: "#ffffff" };
const MARGEM = 15;

/** Gera o PDF no browser. jsPDF e autotable só carregam aqui (import dinâmico). */
export async function gerarResumoPdf(resumo: ResumoRh): Promise<{ nome: string; blob: Blob }> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const d = prepararResumo(resumo);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const util = largura - MARGEM * 2;
  const fim = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Cabeçalho
  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(COR.primaria);
  doc.text(d.titulo, MARGEM, 22);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(COR.suave);
  doc.text(`Gerado em ${d.geradoEm}`, largura - MARGEM, 22, { align: "right" });
  doc.setDrawColor(COR.primaria).setLineWidth(0.6).line(MARGEM, 26, largura - MARGEM, 26);
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(COR.primaria);
  doc.text(resumo.pessoa.nome, MARGEM, 35, { maxWidth: util });
  let y = 41;

  const base = { margin: { left: MARGEM, right: MARGEM, bottom: 18 }, styles: { font: "helvetica", fontSize: 9.5, textColor: COR.primaria, cellPadding: 2 } };

  function secao(titulo: string) {
    if (y > altura - 45) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(COR.primaria);
    doc.text(titulo.toUpperCase(), MARGEM, y + 4);
    doc.setDrawColor(COR.linha).setLineWidth(0.3).line(MARGEM, y + 6.5, largura - MARGEM, y + 6.5);
    y += 9;
  }

  function pares(linhas: [string, string][]) {
    autoTable(doc, {
      ...base,
      startY: y,
      theme: "plain",
      body: linhas,
      columnStyles: { 0: { cellWidth: 50, textColor: COR.suave }, 1: { fontStyle: "bold" } },
    });
    y = fim() + 8;
  }

  const vazio = () => {
    doc.setFont("helvetica", "italic").setFontSize(9.5).setTextColor(COR.suave);
    doc.text(SEM_REGISTOS, MARGEM, y + 4);
    y += 12;
  };

  function tabela(cabecalho: string[], corpo: unknown[][], colunas: Record<number, object> = {}) {
    autoTable(doc, {
      ...base,
      startY: y,
      head: [cabecalho],
      body: corpo as never,
      theme: "grid",
      showHead: "everyPage",
      headStyles: { fillColor: COR.primaria, textColor: COR.branco, fontStyle: "bold" },
      styles: { ...base.styles, lineColor: COR.linha, lineWidth: 0.2 },
      columnStyles: colunas,
    });
    y = fim() + 8;
  }

  secao("Dados pessoais");
  pares(d.pessoa);
  if (d.ferias.length > 0) {
    secao("Férias");
    pares(d.ferias);
  }

  secao("Pedidos");
  if (d.pedidos.length === 0) vazio();
  else {
    const corpo: unknown[][] = [];
    for (const l of d.pedidos) {
      corpo.push(l.colunas);
      for (const n of l.notas) corpo.push([{ content: n, colSpan: 5, styles: { fontSize: 8.5, textColor: COR.suave, fontStyle: "italic", fillColor: COR.campo } }]);
    }
    tabela(["Tipo", "Período", "Dias úteis", "Estado", "Decidido por"], corpo, { 2: { halign: "center", cellWidth: 20 }, 3: { cellWidth: 24 } });
  }

  secao(`Presenças do ano ${resumo.presencas.ano}`);
  if (resumo.presencas.dias_com_registo === 0 && resumo.presencas.horas_total === 0) vazio();
  else pares(d.presencas.slice(1));

  secao("Informações da ficha");
  if (d.infos.length === 0) vazio();
  else tabela(["Título", "Valor"], d.infos, { 0: { cellWidth: 50, fontStyle: "bold" } });

  secao("Anexos");
  if (d.anexos.length === 0) vazio();
  else tabela(["Nome", "Tipo de documento", "Tamanho", "Data"], d.anexos, { 2: { halign: "right", cellWidth: 22 }, 3: { cellWidth: 26 } });

  // Rodapé com "Página x de y" em todas as páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(COR.linha).setLineWidth(0.3).line(MARGEM, altura - 14, largura - MARGEM, altura - 14);
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(COR.suave);
    doc.text(resumo.pessoa.nome, MARGEM, altura - 9);
    doc.text(`Página ${i} de ${total}`, largura - MARGEM, altura - 9, { align: "right" });
  }

  return { nome: nomeFicheiroResumo(resumo.pessoa.nome, resumo.gerado_em), blob: doc.output("blob") };
}
