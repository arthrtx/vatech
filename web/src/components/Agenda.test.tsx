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

  it("filtro de funcionario so para admin", () => {
    const { rerender } = render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByLabelText("Funcionário")).toBeTruthy();
    rerender(<Agenda pedidos={pedidos} admin={false} hoje="2026-12-01" />);
    expect(screen.queryByLabelText("Funcionário")).toBeNull();
    expect(screen.getByLabelText("Tipo")).toBeTruthy();
  });
});
