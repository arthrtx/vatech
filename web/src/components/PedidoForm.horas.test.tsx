import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Ana", papel: "funcionario", empresa_id: 1 } }) }));
const criar = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { limites: async () => ({ limites: [], prazo_ferias: "2026-04-30" }), criarPedido: (...a: unknown[]) => criar(...a) },
}));

import PedidoForm from "./PedidoForm";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const escolherTipo = (rotulo: string) => {
  fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
  fireEvent.click(screen.getByRole("option", { name: rotulo }));
};

describe("PedidoForm: horas", () => {
  it("só a ausência tem campos de hora", () => {
    render(<PedidoForm dataInicial="2099-01-05" />);
    expect(screen.queryByLabelText("Das (opcional)")).toBeNull();
    escolherTipo("Ausência");
    expect(screen.getByLabelText("Das (opcional)")).toBeTruthy();
    expect(screen.getByLabelText("Até às")).toBeTruthy();
    escolherTipo("Licença");
    expect(screen.queryByLabelText("Das (opcional)")).toBeNull();
  });

  it("envia as horas da ausência", async () => {
    criar.mockResolvedValue({ data: { id: 1 }, avisos: [] });
    render(<PedidoForm dataInicial="2099-01-05" />);
    escolherTipo("Ausência");
    fireEvent.change(screen.getByLabelText("Das (opcional)"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Até às"), { target: { value: "12:30" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(criar).toHaveBeenCalled());
    expect(criar.mock.calls[0][0]).toMatchObject({ tipo: "ausencia", hora_inicio: "10:00", hora_fim: "12:30" });
  });

  it("recusa fim antes do início sem chamar a API", () => {
    render(<PedidoForm dataInicial="2099-01-05" />);
    escolherTipo("Ausência");
    fireEvent.change(screen.getByLabelText("Das (opcional)"), { target: { value: "12:00" } });
    fireEvent.change(screen.getByLabelText("Até às"), { target: { value: "10:00" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    expect(screen.getByRole("alert").textContent).toContain("depois da hora de início");
    expect(criar).not.toHaveBeenCalled();
  });

  it("ausência sem horas não envia horas", async () => {
    criar.mockResolvedValue({ data: { id: 1 }, avisos: [] });
    render(<PedidoForm dataInicial="2099-01-05" />);
    escolherTipo("Ausência");
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(criar).toHaveBeenCalled());
    expect(criar.mock.calls[0][0]).not.toHaveProperty("hora_inicio");
  });
});
