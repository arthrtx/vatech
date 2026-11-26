import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const agenda = vi.fn();
const presencas = vi.fn().mockResolvedValue([]);
const aniversarios = vi.fn().mockResolvedValue([]);
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Ana", papel: "funcionario" } }) }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: { agenda: (...a: unknown[]) => agenda(...a), presencas: (...a: unknown[]) => presencas(...a), aniversarios: (...a: unknown[]) => aniversarios(...a), pontes: async () => [] } }));

import AgendaPage from "./page";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  agenda.mockReset();
  aniversarios.mockReset().mockResolvedValue([]);
});

describe("pagina da agenda", () => {
  it("pede o grid do mes visivel e volta a pedir ao mudar de mes (pelas setas da semana)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-10T12:00:00") });
    agenda.mockResolvedValue([]);
    render(<AgendaPage />);
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2026-11-30", "2027-01-03"));
    expect(agenda).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByLabelText("Semana seguinte"));
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2026-12-28", "2027-01-31"));
  });

  it("não pede presenças a um funcionário (a API responde 403)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-10T12:00:00") });
    agenda.mockResolvedValue([]);
    presencas.mockClear();
    render(<AgendaPage />);
    await waitFor(() => expect(agenda).toHaveBeenCalled());
    expect(presencas).not.toHaveBeenCalled();
    expect(screen.queryByText("Não foi possível carregar as presenças.")).toBeNull();
  });

  it("mostra o aniversario de um colega no dia", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-10T12:00:00") });
    agenda.mockResolvedValue([]);
    aniversarios.mockResolvedValue([{ user: { id: 2, nome: "Bia Lopes" }, data: "2026-12-10" }]);
    render(<AgendaPage />);
    await waitFor(() => expect(aniversarios).toHaveBeenCalledWith("2026-11-30", "2027-01-03"));
    expect((await screen.findAllByText(/Aniversário de Bia Lopes/)).length).toBeGreaterThan(0);
  });

  it("a agenda abre sem aniversarios se o pedido falhar", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-10T12:00:00") });
    agenda.mockResolvedValue([]);
    aniversarios.mockRejectedValue(new Error("x"));
    render(<AgendaPage />);
    await waitFor(() => expect(aniversarios).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mostra A carregar e depois o erro da API", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-10T12:00:00") });
    agenda.mockRejectedValue(new Error("x"));
    render(<AgendaPage />);
    expect(screen.getByText("A carregar pedidos...")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("Não foi possível carregar os pedidos.")).toBeTruthy();
  });
});
