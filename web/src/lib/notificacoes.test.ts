import { describe, expect, it } from "vitest";
import type { Pedido } from "./api";
import { detetar, MAX_NOTIFICACOES, type EstadoNotificacoes } from "./notificacoes";

const pedido = (o: Partial<Pedido>): Pedido => ({
  id: 1,
  empresa_id: 1,
  user_id: 2,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-12-02",
  data_fim: "2026-12-24",
  observacao: null,
  estado: "pendente",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 2, nome: "Ana" },
  ...o,
});

const vazio: EstadoNotificacoes = { snapshot: null, itens: [] };
const admin = { id: 1, papel: "admin" as const };
const func = { id: 2, papel: "funcionario" as const };

describe("detetar", () => {
  it("primeira leitura só guarda o estado, não notifica", () => {
    const r = detetar(vazio, [pedido({})], admin);
    expect(r.itens).toEqual([]);
    expect(r.snapshot).toEqual({ 1: "pendente" });
  });

  it("admin é avisado de pedido pendente novo e o clique leva ao pedido", () => {
    const base = detetar(vazio, [], admin);
    const r = detetar(base, [pedido({ id: 5 })], admin);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].texto).toBe("Ana pediu férias (02/12 a 24/12)");
    expect(r.itens[0].href).toBe("/?pedido=5");
    expect(r.itens[0].lida).toBe(false);
  });

  it("não repete a notificação na leitura seguinte", () => {
    const base = detetar(vazio, [], admin);
    const a = detetar(base, [pedido({ id: 5 })], admin);
    const b = detetar(a, [pedido({ id: 5 })], admin);
    expect(b.itens).toHaveLength(1);
  });

  it("funcionário é avisado quando o pedido é aprovado ou recusado", () => {
    const base = detetar(vazio, [pedido({})], func);
    const ap = detetar(base, [pedido({ estado: "aprovado" })], func);
    expect(ap.itens[0].texto).toContain("foi aprovado");
    const re = detetar(base, [pedido({ estado: "recusado", motivo_recusa: "Equipa curta" })], func);
    expect(re.itens[0].texto).toContain("foi recusado: Equipa curta");
  });

  it("estagiário é tratado como não-admin e vê o motivo da recusa completo", () => {
    const est = { id: 2, papel: "estagiario" as const };
    const motivo = "Sem cobertura na equipa nessa semana; volte a pedir para a seguinte, com 15 dias de antecedência.";
    const base = detetar(vazio, [pedido({ tipo: "ausencia" })], est);
    const r = detetar(base, [pedido({ tipo: "ausencia", estado: "recusado", motivo_recusa: motivo })], est);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].texto).toContain(`foi recusado: ${motivo}`);
    // pedido pendente novo de outra pessoa não avisa o estagiário
    const outro = detetar(base, [pedido({ tipo: "ausencia" }), pedido({ id: 7, user_id: 9 })], est);
    expect(outro.itens).toEqual([]);
  });

  it("limita o histórico", () => {
    const antigos = Array.from({ length: MAX_NOTIFICACOES }, (_, i) => ({
      id: `x${i}`,
      texto: "t",
      quando: "2026-11-19T10:00:00.000Z",
      lida: true,
      href: "/",
    }));
    const r = detetar({ snapshot: {}, itens: antigos }, [pedido({ id: 9 })], admin);
    expect(r.itens).toHaveLength(MAX_NOTIFICACOES);
    expect(r.itens[0].id).toBe("9-novo");
  });
});
