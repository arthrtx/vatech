import { describe, expect, it } from "vitest";
import type { ResumoRh } from "./api";
import { gerarResumoPdf, nomeFicheiroResumo, prepararResumo } from "./resumoPdf";

export const resumoBase = (o: Partial<ResumoRh> = {}): ResumoRh => ({
  gerado_em: "2026-11-26T10:30:00",
  pessoa: { id: 1, nome: "João Conceição", email: "joao@x.pt", papel: "estagiario", estado_conta: "aprovado", permissoes: [], tipo: null, avatar_url: null, data_nascimento: "2003-05-09", estagio_inicio: "2026-09-01", estagio_fim: "2027-06-30", instituicao_ensino: "Universidade do Minho" },
  ferias: { ano: 2026, dias_ano: 22, transitados: 2, usados: 5, restantes: 19 },
  pedidos: [
    { id: 1, tipo: "ferias", tipo_rotulo: "Férias", subtipo: null, estado: "aprovado", data_inicio: "2026-03-02", data_fim: "2026-03-06", hora_inicio: null, hora_fim: null, dias_uteis: 5, motivo: null, motivo_recusa: null, decidido_por: "Ana Dias", decidido_em: "2026-02-20T09:00:00", criado_em: "2026-02-18T09:00:00" },
    { id: 2, tipo: "ausencia", tipo_rotulo: "Ausência", subtipo: "medica", estado: "recusado", data_inicio: "2026-10-10", data_fim: "2026-10-10", hora_inicio: "09:00:00", hora_fim: "12:00:00", dias_uteis: null, motivo: "Consulta", motivo_recusa: "Sem comprovativo", decidido_por: null, decidido_em: null, criado_em: "2026-10-09T09:00:00" },
  ],
  presencas: { ano: 2026, dias_com_registo: 40, horas_total: 312.5 },
  infos: [{ id: 1, titulo: "NIF", valor: "123", criado_em: "2026-01-01T00:00:00" }],
  ficheiros: [
    { nome: "contrato.pdf", categoria: "contrato", categoria_nome: null, tamanho: 2048, criado_em: "2026-09-01T08:00:00" },
    { nome: "x.pdf", categoria: "personalizado", categoria_nome: "Seguro", tamanho: 100, criado_em: "2026-09-02T08:00:00" },
  ],
  ...o,
});

describe("prepararResumo", () => {
  it("formata datas, ordena pedidos do mais recente e junta notas", () => {
    const r = prepararResumo(resumoBase());
    expect(r.pedidos[0].colunas).toEqual(["Ausência (Médica)", "10/10/2026, 09:00 a 12:00", "-", "Recusado", "-"]);
    expect(r.pedidos[0].notas).toEqual(["Motivo: Consulta", "Motivo da recusa: Sem comprovativo"]);
    expect(r.pedidos[1].colunas[1]).toBe("02/03/2026 a 06/03/2026");
    expect(r.pedidos[1].colunas[4]).toBe("Ana Dias, 20/02/2026");
  });
  it("mostra dados de estágio só a estagiários e usa o nome do tipo de anexo personalizado", () => {
    const r = prepararResumo(resumoBase());
    expect(r.pessoa).toContainEqual(["Instituição de ensino", "Universidade do Minho"]);
    expect(r.pessoa).toContainEqual(["Data de nascimento", "09/05/2003"]);
    expect(r.anexos[0]).toEqual(["contrato.pdf", "Contrato", "2 KB", "01/09/2026"]);
    expect(r.anexos[1][1]).toBe("Seguro");
    const f = prepararResumo(resumoBase({ pessoa: { ...resumoBase().pessoa, papel: "funcionario" } }));
    expect(f.pessoa.some(([k]) => k.includes("estágio"))).toBe(false);
    expect(r.presencas[2]).toEqual(["Horas registadas", "312,5 h"]);
  });
  it("secções vazias ficam sem linhas", () => {
    const r = prepararResumo(resumoBase({ pedidos: [], infos: [], ficheiros: [] }));
    expect([r.pedidos.length, r.infos.length, r.anexos.length]).toEqual([0, 0, 0]);
  });
});

describe("prepararResumo: férias e ordem", () => {
  it("omite as férias a estagiários e mantém-nas a funcionários", () => {
    expect(prepararResumo(resumoBase()).ferias).toEqual([]);
    const f = prepararResumo(resumoBase({ pessoa: { ...resumoBase().pessoa, papel: "funcionario" } }));
    expect(f.ferias).toContainEqual(["Restantes", "19"]);
  });
  it("ordena os pedidos por data de início descendente, 2027 antes de 2026", () => {
    const base = resumoBase().pedidos[0];
    const r = prepararResumo(resumoBase({ pedidos: [{ ...base, id: 1, data_inicio: "2026-03-02", data_fim: "2026-03-02" }, { ...base, id: 2, data_inicio: "2027-01-05", data_fim: "2027-01-05" }, { ...base, id: 3, data_inicio: "2026-11-01", data_fim: "2026-11-01" }] }));
    expect(r.pedidos.map((x) => x.colunas[1])).toEqual(["05/01/2027", "01/11/2026", "02/03/2026"]);
  });
});

describe("nomeFicheiroResumo", () => {
  it("tira acentos e usa a data de geração", () => {
    expect(nomeFicheiroResumo("João  Conceição", "2026-11-26T10:30:00")).toBe("resumo-joao-conceicao-2026-11-26.pdf");
  });
});

describe("gerarResumoPdf", () => {
  it("gera um PDF real com 'Sem registos' e paginação", async () => {
    const { nome, blob } = await gerarResumoPdf(resumoBase({ pedidos: [], infos: [], ficheiros: [] }));
    expect(nome).toBe("resumo-joao-conceicao-2026-11-26.pdf");
    expect(blob.size).toBeGreaterThan(1000);
  });
});
