import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PedidoForm from "./PedidoForm";
import PedidosAdmin from "./PedidosAdmin";
import type { Pedido } from "@/lib/api";

afterEach(cleanup);

const pedido: Pedido = {
  id: 7,
  empresa_id: 1,
  user_id: 2,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-12-01",
  data_fim: "2026-12-05",
  observacao: null,
  estado: "pendente",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 2, nome: "Ana" },
};

describe("PedidoForm", () => {
  it("rende os campos com labels e mostra subtipo so em ausencia", () => {
    render(<PedidoForm />);
    expect(screen.getByLabelText("Tipo")).toBeTruthy();
    expect(screen.getByLabelText("Data de início")).toBeTruthy();
    expect(screen.getByLabelText("Data de fim")).toBeTruthy();
    expect(screen.getByLabelText("Observação")).toBeTruthy();
    expect(screen.queryByLabelText("Subtipo")).toBeNull();
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    fireEvent.click(screen.getByRole("option", { name: "Ausência" }));
    expect(screen.getByLabelText("Subtipo")).toBeTruthy();
  });
});

describe("PedidosAdmin", () => {
  it("tem Aprovar e Recusar e exige motivo", () => {
    const aprovar = vi.fn();
    const recusar = vi.fn();
    render(<PedidosAdmin pedidos={[pedido]} onAprovar={aprovar} onRecusar={recusar} />);
    expect(screen.getByText(/Ana ·/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(aprovar).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    const confirmar = screen.getByRole("button", { name: "Confirmar recusa" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Motivo da recusa/), { target: { value: "Sem cobertura" } });
    fireEvent.click(confirmar);
    expect(recusar).toHaveBeenCalledWith(7, "Sem cobertura");
  });
});
