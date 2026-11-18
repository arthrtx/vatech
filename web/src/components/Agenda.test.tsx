import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Agenda from "./Agenda";
import type { Pedido } from "@/lib/api";

afterEach(cleanup);

const p = (o: Partial<Pedido>): Pedido => ({
  id: 1,
  empresa_id: 1,
  user_id: 1,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-11-27",
  data_fim: "2026-12-03",
  observacao: null,
  estado: "aprovado",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 1, nome: "Ana" },
  ...o,
});

const pedidos = [
  p({}),
  p({ id: 2, user_id: 2, user: { id: 2, nome: "Rui" }, data_inicio: "2026-12-01", data_fim: "2026-12-02", estado: "pendente" }),
  p({ id: 3, estado: "recusado", user: { id: 1, nome: "Ana" }, tipo: "licenca" }),
];

describe("Agenda", () => {
  it("navega por texto, assinala sobreposicao e esconde recusados", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByText("Dezembro 2026")).toBeTruthy();
    expect(screen.getAllByText("Sobreposição").length).toBe(2);
    expect(screen.queryByText(/Ana · Licença/)).toBeNull();
    fireEvent.click(screen.getByText("Mês anterior"));
    expect(screen.getByText("Novembro 2026")).toBeTruthy();
    fireEvent.click(screen.getByText("Mês anterior"));
    expect(screen.getByText("Outubro 2026")).toBeTruthy();
    expect(screen.queryByText("Sobreposição")).toBeNull();
  });

  it("filtros alteram a grelha e a sobreposicao persiste ao filtrar", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getAllByTitle(/\((aprovado|pendente)\)/).length).toBe(6);
    fireEvent.change(screen.getByLabelText("Funcionário"), { target: { value: "2" } });
    expect(screen.getAllByTitle(/\((aprovado|pendente)\)/).length).toBe(2);
    expect(screen.getAllByText("Sobreposição").length).toBe(2);
    fireEvent.change(screen.getByLabelText("Funcionário"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "licenca" } });
    expect(screen.queryAllByTitle(/\((aprovado|pendente)\)/).length).toBe(0);
    expect(screen.getAllByText("Sobreposição").length).toBe(2);
    expect(screen.getByText("Sem pedidos neste mês.")).toBeTruthy();
  });

  it("destaca hoje, distingue pendente por texto e estilo, e usa linhas ARIA", () => {
    const { container } = render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    const hoje = container.querySelector('[aria-current="date"]');
    expect(hoje?.textContent).toContain("1");
    expect(hoje?.textContent).toContain("(hoje)");
    const pend = screen.getAllByText(/\(pendente\)/);
    expect(pend.length).toBe(2);
    expect(pend[0].closest("span.truncate")?.className).toContain("border-dashed");
    const celulas = [...container.querySelectorAll('[role="gridcell"]')];
    expect(celulas.length % 7).toBe(0);
    expect(celulas.every((c) => c.parentElement?.getAttribute("role") === "row")).toBe(true);
  });

  it("filtro de funcionario ignora quem so tem recusados", () => {
    const so = [...pedidos, p({ id: 9, user_id: 3, user: { id: 3, nome: "Zé" }, estado: "recusado" })];
    render(<Agenda pedidos={so} admin hoje="2026-12-01" />);
    expect(screen.queryByRole("option", { name: "Zé" })).toBeNull();
    expect(screen.getByRole("option", { name: "Rui" })).toBeTruthy();
  });

  it("vazio, a carregar e erro sao estados distintos", () => {
    const { rerender } = render(<Agenda pedidos={[]} admin hoje="2026-12-01" />);
    expect(screen.getByText("Sem pedidos neste mês.")).toBeTruthy();
    rerender(<Agenda pedidos={[]} admin hoje="2026-12-01" aCarregar />);
    expect(screen.getByText("A carregar pedidos...")).toBeTruthy();
    expect(screen.queryByText("Sem pedidos neste mês.")).toBeNull();
    rerender(<Agenda pedidos={[]} admin hoje="2026-12-01" comErro />);
    expect(screen.getByText("Não foi possível carregar os pedidos.")).toBeTruthy();
    expect(screen.queryByText("Sem pedidos neste mês.")).toBeNull();
  });

  it("filtro de funcionario so para admin", () => {
    const { rerender } = render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByLabelText("Funcionário")).toBeTruthy();
    rerender(<Agenda pedidos={pedidos} admin={false} hoje="2026-12-01" />);
    expect(screen.queryByLabelText("Funcionário")).toBeNull();
    expect(screen.getByLabelText("Tipo")).toBeTruthy();
  });
});
